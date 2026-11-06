import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile.api";
import { isRTL, t } from "@/i18n";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors";

interface CountrySelectProps {
  value: string;
  onChange: (countryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const COUNTRY_NAME_AR: Record<string, string> = {
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
};

const FALLBACK_COUNTRIES = [
  { id: "eg", code: "EGY", flag: "🇪🇬", name: "Egypt" },
  { id: "sa", code: "SAU", flag: "🇸🇦", name: "Saudi Arabia" },
  { id: "ae", code: "ARE", flag: "🇦🇪", name: "United Arab Emirates" },
  { id: "kw", code: "KWT", flag: "🇰🇼", name: "Kuwait" },
  { id: "qa", code: "QAT", flag: "🇶🇦", name: "Qatar" },
  { id: "bh", code: "BHR", flag: "🇧🇭", name: "Bahrain" },
  { id: "om", code: "OMN", flag: "🇴🇲", name: "Oman" },
  { id: "jo", code: "JOR", flag: "🇯🇴", name: "Jordan" },
  { id: "lb", code: "LBN", flag: "🇱🇧", name: "Lebanon" },
  { id: "iq", code: "IRQ", flag: "🇮🇶", name: "Iraq" },
  { id: "us", code: "USA", flag: "🇺🇸", name: "United States" },
  { id: "gb", code: "GBR", flag: "🇬🇧", name: "United Kingdom" },
];

export function CountrySelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: CountrySelectProps) {
  const isArabic = isRTL();

  const { data: apiCountries, isLoading } = useQuery({
    queryKey: ["profile-countries"],
    queryFn: async () => {
      const res = await profileApi.countries();
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const list =
    apiCountries && apiCountries.length > 0
      ? apiCountries.map((c) => ({
          id: c.id,
          flag: c.flag || "🌐",
          name: isArabic ? COUNTRY_NAME_AR[c.name] || c.name : c.name,
        }))
      : FALLBACK_COUNTRIES.map((c) => ({
          id: c.id,
          flag: c.flag,
          name: isArabic ? COUNTRY_NAME_AR[c.name] || c.name : c.name,
        }));

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inp}
      disabled={disabled || isLoading}
      aria-label={t("profile.country")}
    >
      <option value="">{placeholder || t("profile.countryPlaceholder")}</option>
      {list.map((c) => (
        <option key={c.id} value={c.id}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}
