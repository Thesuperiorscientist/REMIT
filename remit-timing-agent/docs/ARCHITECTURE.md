# Technical documentation: architecture, algorithm, security design

## 1. System overview
```
 Browser UI  ──►  Agent loop ──► LLM (Groq, tool-calling)
    │                │  ▲
    │                ▼  │ tool results (JSON)
    │          Tool layer (allowlist, validation, tiers, audit)
    │                │
    ▼                ▼
 Planner / Twin / Charts      Engine: rates, Monte Carlo, strategies, targets
    │                                   │
    └── human click only ──►  Sandbox wallet (limits, approval, ledger)
```
Design principle: **the LLM routes and explains; deterministic code computes and decides; a human approves.**

## 2. Components
| Module | Responsibility |
|---|---|
| `engine/rateEngine.js` | Rate lookup (live Wise when reachable → direct reference → inverse → USD triangulation), plausibility guard (live rate must be within 25% of reference), Monte Carlo simulation of N-day outcomes, target-hit probability. |
| `engine/monteCarlo.js` | Seedable RNG (mulberry32), Box-Muller normals, path generation, percentiles, histograms. |
| `engine/strategies.js` | Strategy evaluation (now / wait N / split a:b) and objective-based recommendation. |
| `engine/targets.js` | Target-rate probability and advice. |
| `engine/twin.js` | 12-month projection with rate and cost shocks. |
| `engine/sandbox.js` | Simulated wallet: proposals, approval, limits, ledger. |
| `agent/agent.js` | Agent loop: bounded history (12 msgs), 1000-char input cap, 4-step cap, injectable LLM for tests. |
| `agent/tools.js` | Tool schemas, allowlist, argument validation, permission tiers, error containment. |
| `agent/audit.js` | Hash-chained append-only log, key redaction, verification. |

## 3. Core algorithm
Rate path: `R(t+1) = R(t) · (1 + σ·Z)`, `Z ~ N(0,1)`, drift 0, σ default 0.8%/day (configurable, calibratable).
Payout for amount `A` sent on day `d`: `A · (1 − fee) · R(d)`, fee default 1.5%.
For each strategy we run 1,000 paths and report mean, p10, p50, p90, and `P(payout ≥ recipient minimum)`.

Strategies: **Send now** (deterministic), **Wait N** (payout at day N), **Split a/b** (a% now, remainder at day N; payouts summed per path).

Objectives:
1. `max_expected`: highest mean payout.
2. `min_risk`: highest probability of meeting the recipient's minimum (or best p10 if none given).
3. `max_with_cap`: highest mean among strategies whose (mean − p10)/mean ≤ cap; else best p10.

Because drift is zero, expected payouts of all single-date strategies are equal up to fee and sampling noise.
The value delivered is therefore **risk control against a deadline and minimum requirement**, plus honest probability statements, not a forecast.
This is covered by test `waiting keeps the mean (zero drift) but widens the spread`.

Target probability: fraction of paths that touch the target at least once within the horizon (barrier-hit probability), plus mean days to hit.

## 4. Agent tools and permission tiers
| Tool | Tier | Effect |
|---|---|---|
| `simulate_transfer`, `compare_options`, `check_target_rate`, `get_wallet` | T0 read-only | Computes and returns numbers |
| `propose_transfer` | T1 propose | Creates a **pending** proposal; no balance change |
| (approve / reject) | T2 execute | **Not a tool.** Only reachable from a UI button |

## 5. Security design (summary; full model in SECURITY.md)
Allowlisted tools, strict argument validation, execution outside the LLM's reach, replay/expiry protection,
limits re-checked at execution, hash-chained audit, output escaping, bounded memory and steps, key redaction.

## 6. Testing and evidence
- `npm test`: 31 tests (engine correctness, regression for the target-rate crash, guardrails, prompt-injection, limits, audit).
- `npm run eval`: 16 scripted financial tasks run through the real tool layer and agent loop; writes `evals/report.md` and `evals/report.json`.
- CI: GitHub Actions runs both on every push and uploads the report.

## 7. Known gaps
See SECURITY.md "Known risks".
