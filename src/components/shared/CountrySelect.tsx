import { isRTL, t } from "@/i18n";
import { getAllCountries } from "@/lib/geoMapping";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors";

interface CountrySelectProps {
  value: string;
  onChange: (countryIsoCode: string) => void;
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
  Japan: "اليابان",
  Pakistan: "باكستان",
  India: "الهند",
  Iran: "إيران",
  Turkey: "تركيا",
  Germany: "ألمانيا",
  France: "فرنسا",
  Italy: "إيطاليا",
  Spain: "إسبانيا",
  "South Africa": "جنوب أفريقيا",
  Nigeria: "نيجيريا",
  Kenya: "كينيا",
  Ghana: "غانا",
  Morocco: "المغرب",
  Tunisia: "تونس",
  Algeria: "الجزائر",
  Sudan: "السودان",
  Canada: "كندا",
  Australia: "أستراليا",
  "New Zealand": "نيوزيلندا",
  Brazil: "البرازيل",
  Argentina: "الأرجنتين",
  Mexico: "المكسيك",
  "South Korea": "كوريا الجنوبية",
  China: "الصين",
  Malaysia: "ماليزيا",
  Indonesia: "إندونيسيا",
  Thailand: "تايلاند",
  Vietnam: "فيتنام",
  Philippines: "الفلبين",
  Singapore: "سنغافورة",
  Switzerland: "سويسرا",
  Austria: "النمسا",
  Netherlands: "هولندا",
  Belgium: "بلجيكا",
  Sweden: "السويد",
  Norway: "النرويج",
  Denmark: "الدنمارك",
  Finland: "فنلندا",
  Poland: "بولندا",
  Russia: "روسيا",
  Ukraine: "أوكرانيا",
};

export function CountrySelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: CountrySelectProps) {
  const isArabic = isRTL();

  // All countries from the library — no database filtering
  const countries = getAllCountries();

  const list = countries.map((c) => ({
    isoCode: c.isoCode,
    flag: c.flag || "🌐",
    name: isArabic ? COUNTRY_NAME_AR[c.name] || c.name : c.name,
  }));

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inp}
      disabled={disabled}
      aria-label={t("profile.country")}
    >
      <option value="">{placeholder || t("profile.countryPlaceholder")}</option>
      {list.map((c) => (
        <option key={c.isoCode} value={c.isoCode}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}
