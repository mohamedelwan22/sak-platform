/**
 * CountryCallingCodeSelect — A country calling code dropdown selector.
 *
 * Rewritten to use the centralized country dataset from src/lib/countries.ts
 * instead of hardcoded fallback lists.
 *
 * @deprecated Use PhoneInput component instead for new implementations.
 * This component is kept for backward compatibility.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile.api";
import { isRTL, t } from "@/i18n";
import { cn } from "@/lib/utils";
import { getAllCountriesWithCallingCodes } from "@/lib/countries";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface CountryCallingCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CountryCallingCodeSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: CountryCallingCodeSelectProps) {
  const isArabic = isRTL();

  // Try API first, fall back to centralized dataset
  const { data: apiCountries } = useQuery({
    queryKey: ["profile-countries"],
    queryFn: async () => {
      const res = await profileApi.countries();
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const countries = useMemo(() => {
    if (apiCountries && apiCountries.length > 0) {
      return apiCountries
        .filter((c: { phoneCode?: string | null; name: string; flag?: string | null }) => Boolean(c.phoneCode))
        .map((c: { phoneCode?: string | null; name: string; flag?: string | null }) => ({
          flag: c.flag || "🌐",
          name: isArabic
            ? {
                Egypt: "مصر",
                "Saudi Arabia": "المملكة العربية السعودية",
                "United Arab Emirates": "الإمارات العربية المتحدة",
                Kuwait: "الكويت",
                Qatar: "قطر",
                Bahrain: "البحرين",
                Oman: "عُمان",
                Jordan: "الأردن",
                Lebanon: "لبنان",
                Iraq: "العراق",
                "United States": "الولايات المتحدة",
                "United Kingdom": "المملكة المتحدة",
                Pakistan: "باكستان",
                India: "الهند",
                Iran: "إيران",
              }[c.name] || c.name
            : c.name,
          code: c.phoneCode?.startsWith("+") ? c.phoneCode : `+${c.phoneCode}`,
        }));
    }
    // Use centralized dataset as fallback
    return getAllCountriesWithCallingCodes().map((c) => ({
      flag: c.flag,
      name: isArabic ? c.nameAr : c.name,
      code: c.callingCode,
    }));
  }, [apiCountries, isArabic]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className || inp)}
      disabled={disabled}
      aria-label={t("profile.callingCode")}
    >
      <option value="">{placeholder || t("profile.callingCodePlaceholder")}</option>
      {countries.map((c) => (
        <option key={`${c.code}-${c.name}`} value={c.code}>
          {c.flag} {c.code} ({c.name})
        </option>
      ))}
    </select>
  );
}
