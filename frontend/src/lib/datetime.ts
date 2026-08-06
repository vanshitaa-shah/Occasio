/** ISO string → value for a <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** ISO string → human-readable local date/time. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}
