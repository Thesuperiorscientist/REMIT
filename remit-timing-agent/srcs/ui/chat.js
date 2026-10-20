
import { WELCOME_MESSAGE, QUICK_PROMPTS } from '../agent/prompts.js';

/**
 * Initialize the chat panel inside the given container.
 * @param {Object} opts
 * @param {HTMLElement} opts.chatEl
 * @param {HTMLElement} opts.inputEl
 * @param {HTMLElement} opts.sendBtn
 * @param {HTMLElement} opts.chipsEl
 * @param {Function} opts.onSend - async (text) => void
 */
export function initChat({ chatEl, inputEl, sendBtn, chipsEl, onSend }) {
  addMessage(chatEl, 'assistant', WELCOME_MESSAGE);

  renderChips(chipsEl, (query) => {
    inputEl.value = query;
    handleSend();
  });

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    addMessage(chatEl, 'user', text);
    sendBtn.disabled = true;

    try {
      await onSend(text);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  return { handleSend };
}


export function addMessage(chatEl, role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  div.appendChild(bubble);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}


function renderChips(chipsEl, onClick) {
  chipsEl.innerHTML = '';
  for (const chip of QUICK_PROMPTS) {
    const el = document.createElement('div');
    el.className = 'chip';
    el.textContent = chip.label;
    el.addEventListener('click', () => onClick(chip.query));
    chipsEl.appendChild(el);
  }
}