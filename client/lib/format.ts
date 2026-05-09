export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatUsagePercent(used: number, limit: number): string {
  if (limit <= 0) return '0.0%';
  const percent = (used / limit) * 100;
  if (percent > 0 && percent < 0.1) return '<0.1%';
  return `${percent.toFixed(1)}%`;
}
