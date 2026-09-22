import type { User } from "@/types";

export function hasBrokerProfile(user?: Pick<User, "broker"> | null): boolean {
  return Boolean(user?.broker);
}

export function isVerifiedActiveBroker(user?: Pick<User, "broker"> | null): boolean {
  return user?.broker?.verificationStatus === "verified" && user?.broker?.isActive === true;
}
