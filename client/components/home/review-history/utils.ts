export function formatShortDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

export function renderStars(count: number): string {
  return '★'.repeat(Math.max(0, Math.min(5, count)));
}
