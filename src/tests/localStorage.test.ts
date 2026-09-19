// ============================================================================
// PERSISTENCE TESTS
// Saved data is untrusted input: it survives deploys and is user-writable.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from "../utils/localStorage";
import { EnhancedSimulationInputs } from "../types/pension";
import { InvestmentRates } from "../components";

const RATES: InvestmentRates = {
  liquidSavingsRate: 0.005,
  iskAccountRate: 0.035,
};

function makeInputs(): EnhancedSimulationInputs {
  return {
    profile: { currentAge: 40, gender: "man", desiredRetirementAge: 65 },
    income: { monthlySalary: 45000, realSalaryGrowth: 0.016 },
    expenses: { monthlyLiving: 25000 },
    assets: { liquidSavings: 100000, iskAccount: 200000 },
    investments: RATES,
    pensions: {
      accounts: [],
      generalPension: {
        currentInkomstpension: 500000,
        currentPremiepension: 100000,
        estimatedMonthlyAmount: 0,
        withdrawalStartAge: 65,
      },
    },
  };
}

const INPUTS_KEY = "swedish-finance-simulator-inputs";
const VERSION_KEY = "swedish-finance-simulator-schema-version";

describe("localStorage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should round-trip valid data", () => {
    const inputs = makeInputs();
    expect(saveToLocalStorage(inputs, RATES)).toBe(true);

    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.inputs).toEqual(inputs);
    expect(loaded!.investmentRates).toEqual(RATES);
  });

  it("should return null when nothing is stored", () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  describe("Regression: saved data is validated before use", () => {
    it("should discard data written without a schema version", () => {
      // Simulates data left behind by a build that predates versioning.
      saveToLocalStorage(makeInputs(), RATES);
      localStorage.removeItem(VERSION_KEY);

      expect(loadFromLocalStorage()).toBeNull();
      // And the stale entry is cleared rather than left to be re-read.
      expect(localStorage.getItem(INPUTS_KEY)).toBeNull();
    });

    it("should discard data from a future schema version", () => {
      saveToLocalStorage(makeInputs(), RATES);
      localStorage.setItem(VERSION_KEY, "999");

      expect(loadFromLocalStorage()).toBeNull();
    });

    it("should discard structurally invalid data", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const broken = makeInputs() as any;
      delete broken.profile.currentAge;
      saveToLocalStorage(broken, RATES);

      expect(loadFromLocalStorage()).toBeNull();
      expect(localStorage.getItem(INPUTS_KEY)).toBeNull();
    });

    it("should discard data with a missing pensions block", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const broken = makeInputs() as any;
      delete broken.pensions;
      saveToLocalStorage(broken, RATES);

      expect(loadFromLocalStorage()).toBeNull();
    });

    it("should discard a pension account missing its withdrawal settings", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const broken = makeInputs() as any;
      broken.pensions.accounts = [{ id: "1", currentValue: 100000 }];
      saveToLocalStorage(broken, RATES);

      expect(loadFromLocalStorage()).toBeNull();
    });

    it("should discard NaN values that would poison the simulation", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      saveToLocalStorage(makeInputs(), RATES);
      // JSON has no NaN literal, so a hand-edited entry is the realistic path.
      const stored = JSON.parse(localStorage.getItem(INPUTS_KEY)!);
      stored.income.monthlySalary = null;
      localStorage.setItem(INPUTS_KEY, JSON.stringify(stored));

      expect(loadFromLocalStorage()).toBeNull();
    });

    it("should survive unparseable JSON", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      saveToLocalStorage(makeInputs(), RATES);
      localStorage.setItem(INPUTS_KEY, "{not json");

      expect(loadFromLocalStorage()).toBeNull();
    });
  });

  it("should clear every key it wrote", () => {
    saveToLocalStorage(makeInputs(), RATES);
    clearLocalStorage();

    expect(localStorage.getItem(INPUTS_KEY)).toBeNull();
    expect(localStorage.getItem(VERSION_KEY)).toBeNull();
    expect(loadFromLocalStorage()).toBeNull();
  });
});
