
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_RETRIES = 1;

let apiKey = '';

export function setApiKey(key) { apiKey = typeof key === 'string' ? key.trim() : ''; }
export function hasApiKey() { return apiKey.length > 0; }

export async function chatCompletion({
  messages,
  tools,
  model = DEFAULT_MODEL,
  temperature = 0.2,
  toolChoice = 'auto',
}) {
  if (!apiKey) throw new Error('Groq API key is not set.');

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body = { model, messages, temperature };

      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = toolChoice;
      }

      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        await sleep(1000);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data.choices[0].message;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(500);
    }
  }

  throw lastError || new Error('Groq request failed.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}