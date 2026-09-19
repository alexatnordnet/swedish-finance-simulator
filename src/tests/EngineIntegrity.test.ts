// ============================================================================
// ENGINE INTEGRITY TESTS
// Determinism, input immutability, and correct compounding.
// ============================================================================

import { describe, it, expect } from "vitest";
import { FinancialSimulationEngine } from "../engine/core/FinancialSimulationEngine";
import { EnhancedSimulationInputs } from "../types/pension";

const CONFIG = {
  includePensions: true,
  useCustomInvestmentRates: false,
  enableTransparency: false,
};

function makeInputs(
  overrides: Partial<EnhancedSimulationInputs> = {}
): EnhancedSimulationInputs {
  return {
    profile: { currentAge: 60, gender: "man", desiredRetirementAge: 65 },
    income: { monthlySalary: 45000, realSalaryGrowth: 0 },
    expenses: { monthlyLiving: 25000 },
    assets: { liquidSavings: 100000, iskAccount: 200000 },
    investments: { liquidSavingsRate: 0.005, iskAccountRate: 0.035 },
    pensions: {
      accounts: [
        {
          id: "1",
          name: "ITP1",
          currentValue: 1000000,
          provider: "Collectum",
          type: "tjänste",
          canChooseWithdrawalAge: true,
          earliestWithdrawalAge: 55,
          latestWithdrawalAge: 70,
          withdrawalSettings: {
            startAge: 65,
            monthlyAmount: 0,
            isPercentage: false,
            isLifelong: true,
          },
        },
      ],
      generalPension: {
        currentInkomstpension: 800000,
        currentPremiepension: 200000,
        estimatedMonthlyAmount: 0,
        withdrawalStartAge: 65,
      },
    },
    ...overrides,
  };
}

describe("Engine integrity", () => {
  describe("Determinism", () => {
    it("should produce identical results on repeated runs", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();

      const first = engine.runSimulation(inputs, CONFIG);
      const second = engine.runSimulation(inputs, CONFIG);
      const third = engine.runSimulation(inputs, CONFIG);

      expect(second).toEqual(first);
      expect(third).toEqual(first);
    });

    it("should not mutate the input object", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();
      const snapshot = JSON.parse(JSON.stringify(inputs));

      engine.runSimulation(inputs, CONFIG);

      expect(inputs).toEqual(snapshot);
    });

    it("should not share pension account objects with the caller", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();
      const originalValue = inputs.pensions.accounts[0].currentValue;

      engine.runSimulation(inputs, CONFIG);

      expect(inputs.pensions.accounts[0].currentValue).toBe(originalValue);
    });
  });

  describe("Pension capital compounding", () => {
    it("should grow accumulating capital exactly once per year", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();
      // Start well before withdrawal so the account only accumulates
      inputs.profile.currentAge = 60;
      inputs.pensions.accounts[0].withdrawalSettings.startAge = 70;
      inputs.pensions.generalPension.withdrawalStartAge = 70;

      const projections = engine.runSimulation(inputs, CONFIG);
      const rate = 0.035; // mixedPortfolio real return

      // Occupational capital should follow a single 3.5% compounding path
      for (let i = 1; i < 5; i++) {
        const previous = projections[i - 1].pensionCapital!.occupational;
        const current = projections[i].pensionCapital!.occupational;
        expect(current / previous).toBeCloseTo(1 + rate, 6);
      }
    });

    it("should reduce capital by exactly the amount withdrawn", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();
      inputs.profile.currentAge = 66;
      inputs.pensions.accounts[0].withdrawalSettings.startAge = 65;
      inputs.pensions.accounts[0].withdrawalSettings.monthlyAmount = 10000;
      inputs.pensions.generalPension.withdrawalStartAge = 65;

      const projections = engine.runSimulation(inputs, CONFIG);

      for (let i = 1; i < 5; i++) {
        const previous = projections[i - 1].pensionCapital!.occupational;
        const current = projections[i].pensionCapital!.occupational;
        const withdrawn =
          projections[i].pensionIncome!.occupationalPension * 12;
        expect(previous - current).toBeCloseTo(withdrawn, 6);
      }
    });
  });

  describe("Life expectancy", () => {
    it("should use the profile gender, not the current age", () => {
      const engine = new FinancialSimulationEngine();

      const male = makeInputs();
      male.profile.gender = "man";
      male.pensions.accounts[0].withdrawalSettings.startAge = 65;

      const female = makeInputs();
      female.profile.gender = "kvinna";
      female.pensions.accounts[0].withdrawalSettings.startAge = 65;

      const maleRun = engine.runSimulation(male, CONFIG);
      const femaleRun = engine.runSimulation(female, CONFIG);

      const maleAt65 = maleRun.find((p) => p.age === 65)!;
      const femaleAt65 = femaleRun.find((p) => p.age === 65)!;

      // A man annuitises over a shorter horizon (82.3 vs 85.4), so his
      // monthly pension from the same capital must be strictly higher.
      expect(maleAt65.pensionIncome!.occupationalPension).toBeGreaterThan(
        femaleAt65.pensionIncome!.occupationalPension
      );
    });

    it("should run the simulation to the gendered life expectancy", () => {
      const engine = new FinancialSimulationEngine();

      const male = makeInputs();
      male.profile.gender = "man";
      const female = makeInputs();
      female.profile.gender = "kvinna";

      const maleRun = engine.runSimulation(male, CONFIG);
      const femaleRun = engine.runSimulation(female, CONFIG);

      expect(maleRun[maleRun.length - 1].age).toBe(82);
      expect(femaleRun[femaleRun.length - 1].age).toBe(85);
    });
  });
});
