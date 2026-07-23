function safeNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const num = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(num) ? num : 0;
}

export function fmtUSD(n: number | string | null | undefined, decimals = 2): string {
  const num = safeNum(n);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtSAK(n: number | string | null | undefined, decimals = 2): string {
  const num = safeNum(n);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals })} SAK`;
}

export function fmtNum(n: number | string | null | undefined, decimals = 0): string {
  const num = safeNum(n);
  return num.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
