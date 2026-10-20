
const entries = [];

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function redact(obj) {
  const json = JSON.stringify(obj ?? {});
  return JSON.parse(json.replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED_KEY]'));
}

export function audit(type, data = {}) {
  const prev = entries.length ? entries[entries.length - 1].hash : '00000000';
  const entry = {
    seq: entries.length + 1,
    at: new Date().toISOString(),
    type,
    data: redact(data),
    prev,
  };
  entry.hash = fnv1a(prev + entry.seq + entry.at + entry.type + JSON.stringify(entry.data));
  entries.push(entry);
  return entry;
}

export function getAuditLog() { return entries.map((e) => ({ ...e })); }

export function clearAuditLog() { entries.length = 0; }

export function verifyAuditLog() {
  let prev = '00000000';
  for (const e of entries) {
    const expected = fnv1a(prev + e.seq + e.at + e.type + JSON.stringify(e.data));
    if (e.prev !== prev || e.hash !== expected) return false;
    prev = e.hash;
  }
  return true;
}
