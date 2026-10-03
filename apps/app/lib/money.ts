/** Whole dollars (what the screens show and type) to cents (what the DB keeps). */
export const toCents = (dollars: number) => Math.round(dollars * 100);
export const toDollars = (cents: number | null | undefined) =>
  cents == null ? undefined : Math.round(cents) / 100;

/** Cents as a price label: "$32", "$32.50", "$1,250". Whole dollars drop the ".00". */
export function formatCents(cents: number | null | undefined) {
  if (cents == null || !Number.isFinite(cents)) return "";
  const rounded = Math.round(cents);
  const whole = rounded % 100 === 0;
  return `$${(rounded / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}
