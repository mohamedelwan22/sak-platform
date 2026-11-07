import { isRTL, t } from "@/i18n";
import { getStatesForCountry } from "@/lib/geoMapping";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface GovernorateSelectProps {
  value: string;
  onChange: (governorate: string) => void;
  countryIsoCode?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const GOVERNORATE_NAME_AR: Record<string, string> = {
  Alexandria: "الإسكندرية",
  Aswan: "أسوان",
  Asyut: "أسيوط",
  Beheira: "البحيرة",
  "Beni Suef": "بني سويف",
  Cairo: "القاهرة",
  Dakahlia: "الدقهلية",
  Damietta: "دمياط",
  Faiyum: "الفيوم",
  Gharbia: "الغربية",
  Giza: "الجيزة",
  Ismailia: "الإسماعيلية",
  "Kafr el-Sheikh": "كفر الشيخ",
  Luxor: "الأقصر",
  Matrouh: "مطروح",
  Minya: "المنيا",
  Monufia: "المنوفية",
  "New Valley": "الوادي الجديد",
  "North Sinai": "شمال سيناء",
  "Port Said": "بورسعيد",
  Qalyubia: "القليوبية",
  Qena: "قنا",
  "Red Sea": "البحر الأحمر",
  Sharqia: "الشرقية",
  Sohag: "سوهاج",
  "South Sinai": "جنوب سيناء",
  Suez: "السويس",
};

export function GovernorateSelect({
  value,
  onChange,
  countryIsoCode,
  placeholder,
  disabled = false,
  className,
}: GovernorateSelectProps) {
  const isArabic = isRTL();

  const states = countryIsoCode ? getStatesForCountry(countryIsoCode) : [];

  const list = states.map((s) => ({
    code: s.isoCode,
    name: isArabic ? GOVERNORATE_NAME_AR[s.name] || s.name : s.name,
  }));

  const isDisabled = disabled || !countryIsoCode;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || inp}
      disabled={isDisabled}
      aria-label={t("profile.governorate")}
    >
      <option value="">{placeholder || t("profile.governoratePlaceholder")}</option>
      {list.map((s) => (
        <option key={s.code} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
