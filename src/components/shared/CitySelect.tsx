import { isRTL, t } from "@/i18n";
import { getCitiesForState, findStateByName } from "@/lib/geoMapping";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface CitySelectProps {
  value: string;
  onChange: (cityName: string) => void;
  countryIsoCode?: string | null;
  governorate?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CITY_NAME_AR: Record<string, string> = {
  Cairo: "القاهرة",
  Alexandria: "الإسكندرية",
  Giza: "الجيزة",
  Aswan: "أسوان",
  Riyadh: "الرياض",
  Jeddah: "جدة",
  Dammam: "الدمام",
  Dubai: "دبي",
  "Abu Dhabi": "أبو ظبي",
  Sharjah: "الشارقة",
  Amman: "عمّان",
  Zarqa: "الزرقاء",
  Beirut: "بيروت",
  Tripoli: "طرابلس",
  "Kuwait City": "مدينة الكويت",
  Hawalli: "حولي",
  Manama: "المنامة",
  Doha: "الدوحة",
  Muscat: "مسقط",
  Baghdad: "بغداد",
  Basra: "البصرة",
  "Shibīn al Kawm": "شبين الكوم",
  Shibin: "شبين",
  Shinjuku: "شينجوكو",
  Tokyo: "طوكيو",
  Osaka: "أوساكا",
  Kyoto: "كيوتو",
  Yokohama: "يوكوهاما",
  "New York": "نيويورك",
  "Los Angeles": "لوس أنجلوس",
  Chicago: "شيكاغو",
  Houston: "هيوستن",
  Phoenix: "فينيكس",
  Philadelphia: "فيلادلفيا",
  "San Antonio": "سان أنطونيو",
  "San Diego": "سان دييغو",
  Dallas: "دالاس",
  "San Jose": "سان خوسيه",
  Austin: "أوستن",
  Jacksonville: "جاكسونفيل",
  "Fort Worth": "فورت وورث",
  Columbus: "كولومبوس",
  Charlotte: "شارلوت",
};

export function CitySelect({
  value,
  onChange,
  countryIsoCode,
  governorate,
  placeholder,
  disabled = false,
  className,
}: CitySelectProps) {
  const isArabic = isRTL();

  // Resolve state ISO code from governorate name for city lookup
  const stateCode =
    countryIsoCode && governorate
      ? findStateByName(countryIsoCode, governorate)?.isoCode
      : null;

  const cities =
    countryIsoCode && stateCode
      ? getCitiesForState(countryIsoCode, stateCode)
      : [];

  const cityList = cities.map((city) => ({
    name: city.name,
    displayName: isArabic ? CITY_NAME_AR[city.name] || city.name : city.name,
  }));

  const isDisabled = disabled || !countryIsoCode || !governorate;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inp}
      disabled={isDisabled}
      aria-label={t("profile.city")}
    >
      <option value="">{placeholder || t("profile.cityPlaceholder")}</option>
      {cityList.map((city) => (
        <option key={city.name} value={city.name}>
          {city.displayName}
        </option>
      ))}
    </select>
  );
}
