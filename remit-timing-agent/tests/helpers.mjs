import { setSeed } from '../srcs/engine/monteCarlo.js';
import { setLiveFetchEnabled, setPair } from '../srcs/engine/rateEngine.js';
import { resetSandbox } from '../srcs/engine/sandbox.js';
import { clearAuditLog } from '../srcs/agent/audit.js';
import { resetAgent, setLLM } from '../srcs/agent/agent.js';

export function freshEnv(pair = { from: 'CNY', to: 'MMK' }) {
  setSeed(42);
  setLiveFetchEnabled(false); 
  setPair(pair);
  resetSandbox();
  clearAuditLog();
  resetAgent();
  setLLM(null);
}
