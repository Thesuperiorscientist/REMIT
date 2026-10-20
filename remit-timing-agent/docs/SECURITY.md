# Security self-assessment

Scope: browser app + LLM agent + simulated wallet. No real funds, no real PII beyond what the user types.

## 1. Permission tiers (implemented)
| Tier | Capability | Who can trigger | Control |
|---|---|---|---|
| T0 | Read-only simulation and advice | LLM | Allowlist, argument validation |
| T1 | Create a pending transfer proposal | LLM (only when the user explicitly asks) | Limits checked, expires in 10 min, no balance change |
| T2 | Execute the proposal | **Human click only** | Not exposed as a tool; limits re-checked; single-use; audited |

## 2. Threat model (STRIDE)
| Threat | Example | Mitigation | Evidence |
|---|---|---|---|
| **S**poofing | Injected text pretends to be the system or user | Roles are fixed by the app; tool output and user text are treated as data; prompt says to ignore embedded instructions | test: prompt-injection |
| **T**ampering | Edit the audit log; change a proposal's amount | Hash-chained log with verification; proposals are server-side objects keyed by id and re-validated at execution | test: audit tamper, proposal tests |
| **R**epudiation | "I never approved that" | Every proposal, approval and rejection is logged with timestamp and id | audit log |
| **I**nformation disclosure | API key leaks into logs or UI | Key redaction in audit; key held in memory only (never in localStorage); no PII sent to tools | test: key redaction |
| **D**enial of service | Infinite tool loops, huge inputs | 4-step cap, 1000-char input cap, bounded history, amount bounds, LLM retry cap | test: step cap |
| **E**levation of privilege | LLM calls an unlisted or admin tool; LLM approves its own proposal | Allowlist; approval is not a tool | tests: unknown tool, hostile LLM |

## 3. OWASP Top 10 for LLM / agentic applications: mapping
| Risk | Our control |
|---|---|
| Prompt injection | Untrusted-data rule in the system prompt; most importantly, **architectural** containment (injection cannot reach T2) |
| Excessive agency | Least privilege: read-only tools plus propose-only; human approval for execution |
| Insecure output handling | UI uses `textContent` for chat; `escapeHtml` for dynamic HTML; no `eval` |
| Sensitive information disclosure | Key redaction, no PII in prompts, local-only state |
| Unbounded consumption | Step, input, history and amount caps |
| Overreliance / hallucinated numbers | Numbers come only from deterministic tools; prompt forbids estimating percentiles; honest zero-drift disclosure |
| Supply chain | No runtime npm dependencies |

## 4. Compliance posture
- Not a payment institution: it executes nothing real. The sandbox demonstrates the control flow a licensed partner would enforce.
- Rate-source transparency: every result is labelled LIVE or REFERENCE with a date.
- Not financial advice: stated in the UI and prompts.
- Data minimisation: no account numbers, IDs or personal identifiers are collected.

## 5. Known risks and next steps (honest list)
| # | Risk | Severity | Planned fix |
|---|---|---|---|
| 1 | Groq key typed into the browser | Medium | Backend proxy holding the key, per-user rate limiting |
| 2 | Live rates scraped via public CORS proxies | Medium | Licensed rates API; signed rate quotes |
| 3 | Audit hash is FNV-1a (tamper-evident, not cryptographic) | Low | SHA-256 via `crypto.subtle`, anchor head hash server-side |
| 4 | Sandbox state lives in memory (reset on reload) | Low | Persist server-side with authentication |
| 5 | No user authentication / MFA | Medium (for production) | Add passkeys / MFA before any real wallet |
| 6 | Model volatility is assumed until calibrated | Medium | `scripts/calibrate.mjs` with real history; show backtest |
| 7 | No jurisdiction rules (limits, KYC thresholds) | Medium | Per-corridor policy packs |
