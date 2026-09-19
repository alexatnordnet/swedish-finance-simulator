# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

A personal finance lifetime simulator for Swedish conditions: it projects
income, tax, expenses, savings and pensions year by year from the user's
current age to their life expectancy. React 18 + TypeScript + Vite +
Tailwind, no backend. All state lives in the browser; there is nothing to
deploy but static files.

The UI is in Swedish. Code, comments and commit messages are in English.

## Commands

```bash
npm run dev        # dev server, http://localhost:3000/swedish-finance-simulator/
npm run test:run   # run the suite once (npm test watches)
npm run build      # tsc && vite build — the typecheck is part of the build
npx tsc --noEmit   # typecheck alone, faster while iterating
```

`npm run lint` is currently broken: eslint cannot resolve
`@typescript-eslint/recommended` from `.eslintrc.cjs`. This predates any
recent work. Don't take its failure as a signal about your changes, and
don't treat fixing it as implied by an unrelated task.

Runtimes are managed with asdf. Prefer `asdf exec node` over a bare `node`.
There is no Python configured for this directory tree.

## Layout

```
src/engine/core/FinancialSimulationEngine.ts   the year-by-year simulation
src/engine/modules/TaxCalculator.ts            Swedish income & capital tax
src/engine/swedish-parameters/                 2025 statutory constants
src/hooks/useSimulation.ts                     MVP mode (no pensions)
src/hooks/useEnhancedSimulation.ts             full mode (pensions, persistence)
src/components/                                UI, split forms/tabs/layout/common
src/utils/localStorage.ts                      versioned persistence
src/tests/                                     vitest, jsdom environment
```

The engine is a single class with one public entry point, `runSimulation`,
plus `validateInputs` and `generateSummary`. Everything else is private.
`SimulationConfig` toggles MVP versus enhanced behaviour; the two hooks are
thin wrappers that pick a config.

## The rules that actually matter here

**This is a financial model, so a wrong number is worse than a crash.** A
plausible-looking figure gets trusted and acted on. Treat silent corrections
as bugs: don't floor a value at zero to make it look sensible, don't
substitute a default for a computation that failed, don't clamp your way out
of a number that seems too big. If the model says the user runs out of money
at 75, it has to say so.

**Verify calculations against real numbers, not against intuition.** The way
to check a change is to write a scratch test that runs the real engine, print
the year-by-year table, and read it. Several of the bugs fixed in this repo
looked completely fine in the source and were only visible in the output.
Delete the scratch test afterwards.

**Cross-check tax logic against the statute**, not against what the previous
code did. The 2025 parameters cite their sources in comments. Some
distinctions are load-bearing and easy to get backwards:

- *skiktgräns* (625,800 kr) applies to income **after** grundavdrag;
  *brytpunkt* (643,100 kr) is the equivalent **gross** salary. Comparing
  brytpunkt against post-deduction income double-counts the deduction.
- *allmän pensionsavgift* is charged on salary only, does not reduce
  fastställd förvärvsinkomst, and is offset in full by a skattereduktion —
  so it nets to zero for the individual.
- pension income is taxed, but is neither pensionsgrundande nor eligible
  for jobbskatteavdrag. Salary and pension go into the tax calculator as
  separate fields for this reason.
- ISK and KF share **one** 150,000 kr fribelopp between them.

**The model is real, in today's money.** Inflation is 0% by design
(Pensionsmyndigheten's prognosis standard) and returns are real returns.
Don't add nominal growth or an inflation adjustment without changing the
whole model deliberately.

**Keep the engine pure.** It must not mutate its inputs — they are React
state, and a mutation means every recalculation starts from the previous
run's end state. Deep-copy anything you hold across years, return new
objects rather than editing in place, and make sure running the same inputs
twice gives identical results. `src/tests/EngineIntegrity.test.ts` pins this.

**Each value moves in exactly one place.** Pension capital is advanced only
in `advancePensionCapital`; liquid savings and ISK only in `advanceAssets`.
Growing a balance in both the year calculation and the loop compounds it
twice a year, which is a bug this codebase has already had.

**Annuities are priced once.** A lifelong pension is computed from capital
and life expectancy at the age withdrawals begin, then held flat. Re-pricing
it annually against a shrinking horizon makes payments balloon near end of
life.

**localStorage is untrusted input.** It is user-writable and survives across
deploys. Anything read back goes through the version check and shape
validation in `src/utils/localStorage.ts`. If you change the persisted
shape, bump `SCHEMA_VERSION`.

## Testing

Vitest with jsdom. Tests live in `src/tests/` alongside the code they cover.

Write regression tests as executable statements of the rule being enforced,
with a comment saying what the old behaviour was — the existing "Regression:"
describe blocks are the model to follow. A test that just pins current output
is worth little; a test that fails if someone reintroduces the bug is worth a
lot.

When a test fails, check the test's premise before changing the code. More
than once here the code was right and the scenario was wrong.

## Conventions

- Comments explain *why*, especially where a statute or a past bug drove the
  design. Don't narrate what the code already says.
- Swedish domain terms keep their Swedish names (`grundavdrag`,
  `jobbskatteavdrag`, `skiktgräns`) — translating them loses the connection
  to the source material.
- Match the surrounding file's style. It varies a little between the engine
  and the components.

## Things to avoid

- **Don't edit files with line-range `sed`.** Ranges go stale the moment
  anything above them shifts, and an off-by-one silently destroys adjacent
  code. Use the editing tools, or match on content.
- Don't commit or push unless asked.
- Don't widen scope into the lint config, the README or unrelated refactors
  while fixing something specific.
