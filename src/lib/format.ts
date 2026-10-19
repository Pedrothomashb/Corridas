const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** 00:00,00 (ou 1:00:00,00 acima de uma hora) — mesmo formato do cronômetro do iPhone. */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)},${pad(cs)}` : `${pad(m)}:${pad(s)},${pad(cs)}`;
}

export function formatGap(ms: number): string {
  if (ms < 60000) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor(ms / 10) % 100;
    return `+${s},${pad(cs)}`;
  }
  return `+${formatMs(ms)}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatClock(ts: number, seconds = false): string {
  const d = new Date(ts);
  const base = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return seconds ? `${base}:${pad(d.getSeconds())}` : base;
}

export function defaultRaceName(ts = Date.now()): string {
  return `Corrida ${formatDate(ts)} ${formatClock(ts)}`;
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
