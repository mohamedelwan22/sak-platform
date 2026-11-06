import type { ProfileDto } from "@/api/profile.api";

export interface ProfileCompletionResult {
  percentage: number;
  category: "incomplete" | "partial" | "substantial" | "complete";
  missingFields: string[];
}

const TRACKED_FIELDS = ["firstName", "lastName", "email", "phone", "employmentStatus"] as const;

export function calculateProfileCompletion(profile: Partial<ProfileDto>): ProfileCompletionResult {
  const filledCount = TRACKED_FIELDS.filter((field) => {
    const value = (profile as Record<string, any>)[field];
    return value && value !== "" && value !== "—";
  }).length;

  const percentage = Math.round((filledCount / TRACKED_FIELDS.length) * 100);

  const missingFields = TRACKED_FIELDS.filter((field) => {
    const value = (profile as Record<string, any>)[field];
    return !value || value === "" || value === "—";
  }) as string[];

  let category: "incomplete" | "partial" | "substantial" | "complete";
  if (percentage === 100) category = "complete";
  else if (percentage >= 70) category = "substantial";
  else if (percentage >= 40) category = "partial";
  else category = "incomplete";

  return { percentage, category, missingFields };
}
