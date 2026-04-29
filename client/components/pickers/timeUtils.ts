export function normalizeTime(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return '01:00';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return '01:00';
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '01:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function splitTime(value: string): { hour: string; minute: string } {
  const normalized = normalizeTime(value);
  const [hour, minute] = normalized.split(':');
  return { hour, minute };
}
