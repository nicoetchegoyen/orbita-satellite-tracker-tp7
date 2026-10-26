export const time = (t: number, seconds = false) =>
  new Date(t).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(seconds ? { second: '2-digit' } : {}),
  });
export const date = (t: number) =>
  new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
export function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
export function countdown(ms: number) {
  if (ms <= 0) return 'En curso';
  const min = Math.ceil(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}
export function coordinate(n: number, lat: boolean) {
  return `${Math.abs(n).toFixed(2)}° ${lat ? (n >= 0 ? 'N' : 'S') : n >= 0 ? 'E' : 'O'}`;
}
export function direction(n: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(n / 45) % 8];
}
