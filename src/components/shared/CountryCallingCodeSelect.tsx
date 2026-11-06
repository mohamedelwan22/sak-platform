import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile.api";
import { isRTL, t } from "@/i18n";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors";

interface CountryCallingCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
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

const FALLBACK_CALLING_CODES = [
  { flag: "🇪🇬", name: "Egypt", code: "+20" },
  { flag: "🇸🇦", name: "Saudi Arabia", code: "+966" },
  { flag: "🇦🇪", name: "United Arab Emirates", code: "+971" },
  { flag: "🇰🇼", name: "Kuwait", code: "+965" },
  { flag: "🇶🇦", name: "Qatar", code: "+974" },
  { flag: "🇧🇭", name: "Bahrain", code: "+973" },
  { flag: "🇴🇲", name: "Oman", code: "+968" },
  { flag: "🇯🇴", name: "Jordan", code: "+962" },
  { flag: "🇱🇧", name: "Lebanon", code: "+961" },
  { flag: "🇮🇶", name: "Iraq", code: "+964" },
  { flag: "🇺🇸", name: "United States", code: "+1" },
  { flag: "🇬🇧", name: "United Kingdom", code: "+44" },
];

export function CountryCallingCodeSelect({
  value,
  onChange,
  placeholder,
  className,
}: CountryCallingCodeSelectProps) {
  const isArabic = isRTL();

  const { data: apiCountries } = useQuery({
    queryKey: ["profile-countries"],
    queryFn: async () => {
      const res = await profileApi.countries();
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const options =
    apiCountries && apiCountries.length > 0
      ? apiCountries
          .filter((c) => Boolean(c.phoneCode))
          .map((c) => ({
            flag: c.flag || "🌐",
            name: isArabic ? COUNTRY_NAME_AR[c.name] || c.name : c.name,
            code: c.phoneCode?.startsWith("+") ? c.phoneCode : `+${c.phoneCode}`,
          }))
      : FALLBACK_CALLING_CODES.map((c) => ({
          flag: c.flag,
          name: isArabic ? COUNTRY_NAME_AR[c.name] || c.name : c.name,
          code: c.code,
        }));

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inp}
      aria-label={t("profile.callingCode")}
    >
      <option value="">{placeholder || t("profile.callingCode")}</option>
      {options.map((item) => (
        <option key={item.code} value={item.code}>
          {item.flag} {item.code} ({item.name})
        </option>
      ))}
    </select>
  );
}
