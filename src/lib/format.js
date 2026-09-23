// Currency + display formatting. The CDF rate is loaded from platform settings at runtime.
let CDF_RATE = 2800;

export function setCdfRate(rate) {
  const n = Number(rate);
  if (n > 0) CDF_RATE = n;
}

export function getCdfRate() {
  return CDF_RATE;
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function usdToCdf(usd) {
  return Math.round((Number(usd) || 0) * CDF_RATE);
}

export function formatUSD(n) {
  const v = round2(n);
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCDF(n) {
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString('fr-FR')} FC`;
}

export function formatMoney(usd, currency = 'USD') {
  return currency === 'CDF' ? formatCDF(usdToCdf(usd)) : formatUSD(usd);
}

export function compactNumber(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return formatDate(value);
}