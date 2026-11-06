import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile.api";
import { isRTL, t } from "@/i18n";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface CitySelectProps {
  value: string;
  onChange: (cityId: string) => void;
  countryId?: string | null;
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
};

export function CitySelect({
  value,
  onChange,
  countryId,
  placeholder,
  disabled = false,
  className,
}: CitySelectProps) {
  const isArabic = isRTL();

  const { data: apiCities, isLoading } = useQuery({
    queryKey: ["profile-cities", countryId],
    enabled: Boolean(countryId),
    queryFn: async () => {
      const res = await profileApi.cities(countryId);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const cityList = (apiCities || []).map((city) => ({
    id: city.id,
    name: isArabic ? CITY_NAME_AR[city.name] || city.name : city.name,
  }));

  const isDisabled = disabled || !countryId || isLoading;

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
        <option key={city.id} value={city.id}>
          {city.name}
        </option>
      ))}
    </select>
  );
}
