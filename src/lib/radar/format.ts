const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(n: number): string {
  return inr.format(Math.round(n));
}

export function formatINRCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000) {
    const lakhs = abs / 100000;
    const digits = lakhs >= 10 ? 0 : 1;
    return `${sign}₹${lakhs.toFixed(digits)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${Math.round(abs / 1000)}k`;
  }
  return formatINR(n);
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function daysLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? "1 day overdue" : `${n} days overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
