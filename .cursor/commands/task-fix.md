# Bug Fix Workflow

## Overview
Diagnose and implement a minimal, safe, reproducible fix using BED-LLM with explicit user approval for experiments and fixes.

## Todo List
1. **Intake**
   - Briefly restate the problem
   - Read the project documentation in `./documents` directory
   - Ask for missing critical data: repo/path, OS/version/arch, revision/commit, deps, exact repro steps, expected vs actual, logs/traces, time/resource limits
   - Confirm environment boundaries (what is allowed)

2. **Hypotheses (Sample-then-Filter)**
   - Propose 5–10 candidate root causes. For each: short description, key evidence for/against, a quick probe, potential fix idea, rough cost/risk
   - Apply "sample-then-filter": drop hypotheses incompatible with known facts/logs/repro. Prevent premature collapse to too few options
   - Assign coarse probabilities (e.g., 10/30/50/70/90) and normalize

3. **Design experiments**
   - Produce 3–5 diverse experiments x1..xM: targeted tests, focused logs/asserts, config/version isolation, git bisect, last-diff inspection, static analysis/lint, web search for a specific signature, repro across env matrix
   - For each experiment define discrete outcomes Y (e.g., repro Y/N; error A/B/C; metric ↑/↓; test pass/fail; code/stack from {…})
   - For top-K hypotheses estimate p(y | θ, x) and prior p(θ). Then estimate EIG(x) = H[Σθ p(θ)p(y|θ,x)] − Σθ p(θ) H[p(y|θ,x)]. Do not use H[p(y)] alone
   - Pick the max-EIG experiment and ASK USER TO APPROVE the pair: (current working hypothesis → experiment), including rough cost/time/risk

4. **Run approved experiment (isolated changes)**
   - Prepare environment: confirm baseline repro; if not already on `hypothesis/*`, create branch `hypothesis/<id>-<slug>`; otherwise reuse current branch; snapshot baseline (logs, versions)
   - If code edits are needed for diagnostics (e.g., logging) — make the smallest atomic change. Commit: "Experiment: description (non-fix)"
   - Run the experiment, collect outcomes Y, store artifacts, bucketize to discrete categories

5. **Update beliefs**
   - Filter out hypotheses contradicted by observations; renormalize probabilities; maintain a "Hypothesis Board"
   - Report progress: outcomes observed, how probabilities changed, what was ruled out
   - Branching:
     a) If the working hypothesis is strongly supported (e.g., ≥85%) and a verifiable fix exists — go to step 6 (after user confirmation)
     b) If the hypothesis is weakened/falsified — PERFORM ROLLBACK: return to a clean state (git restore/reset, drop branch/clean worktree), document what was learned, and return to step 3
     c) Otherwise — generate a new experiment set, rank by EIG, and request approval

6. **Implement the fix**
   - Switch to or create `fix/<id>-<slug>`: if already on `fix/*`, reuse the current branch; otherwise create a new one. Implement a minimal localized patch + regression/repro test. Update docs if needed
   - Run tests/linters/profiling; compare "before/after" for repro and key metrics
   - Present diff summary, risk/scope, verification results. Ask user for "MERGE/ITERATE." Never push without explicit approval

7. **Wrap-up / escalation**
   - Success: deliver artifacts (patch/branch, logs, repro commands, new tests), a concise root-cause narrative (why the fix works), and follow-ups
   - If not solved within budget: provide best current diagnosis, remaining hypotheses with probabilities, and a next-steps plan with highest EIG

## Checklist
- [ ] Problem restated; critical context collected
- [ ] Hypotheses enumerated with probabilities
- [ ] Max-EIG experiment approved and executed
- [ ] Beliefs updated; board maintained
- [ ] Minimal fix implemented with tests
- [ ] Quality gates passed and results shared

## Turn-by-turn output format
- Summary: 2–4 sentences.
- Hypothesis Board: list {θi: p, pro/contra, quick probe, potential fix}.
- Candidate Experiments (ranked by EIG): for each x — goal, outcomes Y, execution, cost/time, EIG estimate.
- Plan Awaiting Approval: working hypothesis → chosen experiment (+ why it’s best by EIG).
- Needs from You: questions/access/limits.
- After Action (post-run): Outcomes, Updated Beliefs, Next Step.
- Do not reveal chain-of-thought; report only final conclusions and brief rationale.

## Rollback and cleanliness policy
- Any diagnostic change lives in hypothesis/* and is rolled back when falsified.
- Any product change lives in fix/* and merges only on approval.
- Between experiments the worktree is clean (empty git status).

## Hints to boost EIG in engineering
- Prefer experiments that “slice” the hypothesis space: version/flag toggles, minimal repros, dep/config isolation, git bisect on recent changes, targeted logs around control-flow forks.
- Ask the user multiple-choice questions (with “None of the above”) to keep outcomes discrete and informative.
- For web search, discretize outcomes: "≥2 matching issues with the same stack," "official regression in version X," "workaround confirmed," etc.
