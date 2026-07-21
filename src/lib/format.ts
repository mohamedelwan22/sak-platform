export function fmtUSD(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? Number(n) : n;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtSAK(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? Number(n) : n;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals })} SAK`;
}

export function fmtNum(n: number | string, decimals = 0): string {
  const num = typeof n === "string" ? Number(n) : n;
  return num.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
