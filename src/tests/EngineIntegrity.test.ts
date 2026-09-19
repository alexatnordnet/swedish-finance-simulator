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

// ============================================================================
// DRAWDOWN MODEL (Pass 3)
// ============================================================================

describe("Drawdown model", () => {
  describe("Regression: deficits draw from ISK after cash", () => {
    it("should spend cash before touching the ISK", () => {
      const engine = new FinancialSimulationEngine();
      // Retired from the start with no pension income and heavy expenses, so
      // every year runs a deficit that has to be funded from capital.
      const inputs = makeInputs({
        profile: { currentAge: 70, gender: "man", desiredRetirementAge: 70 },
        assets: { liquidSavings: 200000, iskAccount: 500000 },
        expenses: { monthlyLiving: 5000 },
      });
      const results = engine.runSimulation(inputs, {
        ...CONFIG,
        includePensions: false,
      });

      const first = results[0];
      // Cash is drawn first, so it falls while the ISK is untouched apart
      // from its own growth.
      expect(first.assets.liquidSavings).toBeLessThan(200000);
      expect(first.assets.iskAccount).toBeGreaterThan(500000);
    });

    it("should draw from the ISK once cash is exhausted", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs({
        profile: { currentAge: 70, gender: "man", desiredRetirementAge: 70 },
        assets: { liquidSavings: 50000, iskAccount: 500000 },
        expenses: { monthlyLiving: 30000 },
      });
      const results = engine.runSimulation(inputs, {
        ...CONFIG,
        includePensions: false,
      });

      // Cash cannot cover a 360k/yr spend, so the ISK must be tapped.
      expect(results[0].assets.liquidSavings).toBe(0);
      expect(results[0].assets.iskAccount).toBeLessThan(500000);
    });
  });

  describe("Regression: surplus is saved, not discarded", () => {
    it("should route positive cash flow into the ISK", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs({
        profile: { currentAge: 40, gender: "man", desiredRetirementAge: 65 },
        income: { monthlySalary: 50000, realSalaryGrowth: 0 },
        expenses: { monthlyLiving: 10000 },
        assets: { liquidSavings: 0, iskAccount: 100000 },
      });
      const results = engine.runSimulation(inputs, {
        ...CONFIG,
        includePensions: false,
      });

      const surplus = results[0].calculations.cashFlow;
      expect(surplus).toBeGreaterThan(0);
      // The ISK holds the opening balance plus the surplus, then grows.
      expect(results[0].assets.iskAccount).toBeCloseTo(
        (100000 + surplus) * 1.035,
        4
      );
    });
  });

  describe("Regression: net worth may go negative", () => {
    it("should report debt rather than flooring net worth at zero", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs({
        profile: { currentAge: 70, gender: "man", desiredRetirementAge: 70 },
        assets: { liquidSavings: 10000, iskAccount: 10000 },
        expenses: { monthlyLiving: 30000 },
      });
      const results = engine.runSimulation(inputs, {
        ...CONFIG,
        includePensions: false,
      });

      const last = results[results.length - 1];
      expect(last.netWorth).toBeLessThan(0);
      // And the deficit compounds rather than resetting each year.
      expect(last.netWorth).toBeLessThan(results[0].netWorth);
    });
  });

  describe("Regression: lifelong annuities are locked at withdrawal start", () => {
    it("should keep the monthly payment flat once payouts begin", () => {
      const engine = new FinancialSimulationEngine();
      const results = engine.runSimulation(makeInputs(), CONFIG);

      const payouts = results
        .filter((p) => p.age >= 65)
        .map((p) => p.pensionIncome!.occupationalPension);

      expect(payouts.length).toBeGreaterThan(5);
      for (const amount of payouts) {
        expect(amount).toBeCloseTo(payouts[0], 6);
      }
    });

    it("should not spike the payment as life expectancy runs out", () => {
      const engine = new FinancialSimulationEngine();
      const results = engine.runSimulation(makeInputs(), CONFIG);

      const atStart = results.find((p) => p.age === 65)!;
      const atEnd = results[results.length - 1];

      // Previously the divisor shrank each year, so the final year's payment
      // was many times the first.
      expect(atEnd.pensionIncome!.total).toBeCloseTo(
        atStart.pensionIncome!.total,
        6
      );
    });

    it("should price the annuity over the horizon from the start age", () => {
      const engine = new FinancialSimulationEngine();
      const results = engine.runSimulation(makeInputs(), CONFIG);

      // 1,000,000 kr grown to age 65, spread over 82.3 - 65 years.
      const atStart = results.find((p) => p.age === 65)!;
      const capitalAt65 = 1000000 * Math.pow(1.035, 5);
      expect(atStart.pensionIncome!.occupationalPension).toBeCloseTo(
        capitalAt65 / ((82.3 - 65) * 12),
        2
      );
    });
  });

  describe("Regression: capital duration measures drawable capital", () => {
    it("should report exhaustion of savings, not of pension capital", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs({
        profile: { currentAge: 64, gender: "man", desiredRetirementAge: 65 },
        assets: { liquidSavings: 50000, iskAccount: 50000 },
        expenses: { monthlyLiving: 40000 },
      });
      const summary = engine.generateSummary(
        engine.runSimulation(inputs, CONFIG),
        inputs,
        CONFIG
      );

      // Spending far outstrips the pension, so the 100k of savings runs dry
      // early rather than "lasting until death".
      expect(summary.capitalDurationYears).toBeGreaterThanOrEqual(0);
      expect(summary.capitalDurationYears).toBeLessThan(5);
    });
  });

  describe("Regression: pension summary is derived from the simulation", () => {
    it("should report a pension even when no expected amount was entered", () => {
      const engine = new FinancialSimulationEngine();
      // makeInputs leaves estimatedMonthlyAmount and expectedMonthlyPension
      // unset, so the old input-reading version reported 0 kr here.
      const inputs = makeInputs();
      const results = engine.runSimulation(inputs, CONFIG);
      const summary = engine.generateSummary(results, inputs, CONFIG);

      const firstPayout = results.find((p) => p.age >= 65)!;
      expect(summary.expectedMonthlyPension).toBeGreaterThan(0);
      expect(summary.expectedMonthlyPension).toBeCloseTo(
        firstPayout.pensionIncome!.total,
        6
      );
    });

    it("should measure the compensation ratio against final salary", () => {
      const engine = new FinancialSimulationEngine();
      // Salary grows, so final salary differs from starting salary and the
      // two denominators give visibly different ratios.
      const inputs = makeInputs({
        income: { monthlySalary: 45000, realSalaryGrowth: 0.02 },
      });
      const results = engine.runSimulation(inputs, CONFIG);
      const summary = engine.generateSummary(results, inputs, CONFIG);

      const workingYears = results.filter((p) => p.salary > 0);
      const finalMonthly =
        workingYears[workingYears.length - 1].salary / 12;

      expect(finalMonthly).toBeGreaterThan(45000);
      expect(summary.pensionCompensationRatio).toBeCloseTo(
        summary.expectedMonthlyPension / finalMonthly,
        6
      );
    });
  });

  describe("Regression: breakEvenAge only reported when meaningful", () => {
    it("should be null when net worth starts positive", () => {
      const engine = new FinancialSimulationEngine();
      const inputs = makeInputs();
      const summary = engine.generateSummary(
        engine.runSimulation(inputs, CONFIG),
        inputs,
        CONFIG
      );

      expect(summary.breakEvenAge).toBeNull();
    });
  });
});
