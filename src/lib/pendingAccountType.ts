export const PENDING_ACCOUNT_TYPE_KEY = "sak_pending_account_type";

export function setPendingAccountType(type: "investor" | "broker"): void {
  try {
    sessionStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, type);
  } catch {
    // sessionStorage may be unavailable (SSR/privacy mode) — fail silently
  }
}

export function consumePendingAccountType(): "investor" | "broker" | null {
  try {
    const value = sessionStorage.getItem(PENDING_ACCOUNT_TYPE_KEY);
    sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    if (value === "broker") return "broker";
    if (value === "investor") return "investor";
    return null;
  } catch {
    return null;
  }
}
