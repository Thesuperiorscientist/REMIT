# Remit Timing Agent

**Shenzhen FinTechathon 2026, International Track, Topic C: Cross-Border & Student Finance Assistant**

An AI agent that helps an international student decide **how and when to send money home** under a
deadline, with risk quantified instead of guessed, and with a hard guarantee that **the AI can never move money**.

## The problem
Students abroad send money home every month. Rates move, fees are opaque, and the recipient often
has a hard requirement ("rent is due Friday, we need at least X"). Most apps show today's rate and nothing else.

## What it does
| Feature | What it gives the student |
|---|---|
| **Transfer Planner** | Compares *send now / wait / split* under an explicit objective: maximize expected payout, minimize the risk of missing the recipient's minimum, or maximize payout under a downside cap. Respects the deadline. |
| **Agent chat** (tool-calling LLM) | Natural-language access to the engine. Numbers always come from deterministic code, never from the LLM. Multi-turn memory. |
| **Sandbox wallet + approval inbox** | The agent can *propose* a transfer. Only a human click executes it, inside a simulated wallet with per-transfer and daily limits. |
| **Financial Twin** | 12-month projection of savings, remittance and risk of running out of money. |
| **Target-rate check** | Probability of hitting a target within N days, with an honest "already met" path. |
| **Audit log** | Hash-chained log of every message, tool call and approval. |

## An honest model
The simulation is a zero-drift random walk. **Waiting does not raise the expected payout; it widens the range.**
So the product is a *risk and deadline* tool, not a rate-prediction tool, and the agent is instructed to say so.
Volatility is a configurable input; `npm run calibrate` estimates it from real historical rates.

## Run it
```bash
npm test          # 31 unit and security tests
npm run eval      # 16 scripted financial tasks -> evals/report.md
npm start         # serves the app at http://localhost:5173  (needs a free Groq key for the chat)
```
No build step: native ES modules. The planner, twin and simulations work **without** any API key.
Without network, rates fall back to dated reference rates (labelled `REFERENCE` in the UI).

## Repository map
```
srcs/engine     simulation, strategies, targets, twin, sandbox wallet (no UI, no LLM)
srcs/agent      LLM client, prompts, tools (permission tiers), agent loop, audit log
srcs/ui         rendering
srcs/app        entry point, HTML, CSS
tests/          unit + security tests (node:test)
evals/          scripted task suite + generated report (execution evidence)
scripts/        calibrate.mjs (estimate volatility from real data)
docs/           ARCHITECTURE.md, SECURITY.md, PITCH.md
```

## Limitations (stated plainly)
- Sandbox only: no real payments, no real accounts.
- Live rates are scraped from a public page through CORS proxies when reachable; otherwise dated reference rates are used. A production system would use a licensed rates API.
- Volatility defaults to an assumed 0.8%/day until calibrated with real history.
- The Groq key is entered in the browser for the demo; production would call the model through a backend proxy.
- Not financial advice.

## License
MIT. Third-party: none at runtime (no npm dependencies).
