// agent.js
// Orchestration for the Remittance Timing Agent.
// - multi-turn memory (bounded)
// - guardrails: tool allowlist, step cap, input length cap, audit log
// - injectable LLM function so the agent loop can be tested offline

import { chatCompletion, setApiKey, hasApiKey } from './groqClient.js';
import { buildSystemPrompt } from './prompts.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { audit } from './audit.js';

export { setApiKey, hasApiKey };

const MAX_ITERATIONS = 4;
const MAX_INPUT_CHARS = 1000;
const MAX_HISTORY_MESSAGES = 12;

let llm = chatCompletion;
let requireKey = true;
let history = []; // user/assistant turns only (tool traffic is not kept)

/** Test hook: replace the LLM call. Pass null to restore. */
export function setLLM(fn) {
  llm = fn || chatCompletion;
  requireKey = !fn;
}

export function resetAgent() {
  history = [];
}

export async function runAgent(userMessage) {
  if (requireKey && !hasApiKey()) {
    return { reply: 'Please enter your Groq API key first.', ui: null };
  }

  const text = String(userMessage ?? '').slice(0, MAX_INPUT_CHARS);
  audit('user_message', { chars: text.length });

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...history,
    { role: 'user', content: text },
  ];

  let uiPayload = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const assistantMsg = await llm({ messages, tools: TOOL_DEFINITIONS, toolChoice: 'auto' });

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const reply = assistantMsg.content || 'Done.';
      remember(text, reply);
      audit('agent_reply', { chars: reply.length });
      return { reply, ui: uiPayload };
    }

    messages.push(assistantMsg);

    for (const call of assistantMsg.tool_calls) {
      const name = call.function.name;
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        args = {};
      }

      const { toolResult, ui } = await executeTool(name, args);
      if (ui) uiPayload = ui;

      messages.push({ role: 'tool', tool_call_id: call.id, content: toolResult });
    }
  }

  audit('agent_step_limit', {});
  return {
    reply: 'The agent reached the maximum number of steps. Please try a simpler request.',
    ui: uiPayload,
  };
}

function remember(userText, reply) {
  history.push({ role: 'user', content: userText });
  history.push({ role: 'assistant', content: reply });
  if (history.length > MAX_HISTORY_MESSAGES) {
    history = history.slice(history.length - MAX_HISTORY_MESSAGES);
  }
}
