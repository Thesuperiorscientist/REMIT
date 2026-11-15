// format.js
// Number, currency, and text formatting helpers for the UI.

export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

export function formatMMK(n) {
  return `${formatNumber(n)}`;
}

export function formatMYR(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${n.toFixed(2)}`;
}

export function formatPct(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatRate(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(2);
}

export function formatCompact(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}

export function shortenAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Relative time like "3 min ago" for source timestamps. */
export function formatRelativeTime(iso) {
  if (!iso) return 'unknown';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}