import { Languages, Check } from "lucide-react";
import { getLanguage, setLanguage, t, type Language } from "@/i18n";

const OPTIONS: Array<{ value: Language; short: string; full: string }> = [
  { value: "en", short: "EN", full: "English" },
  { value: "ar", short: "ع", full: "العربية" },
];

/**
 * Compact EN/AR language switcher. Persists via cookie and reloads so the
 * entire app (SSR included) re-renders in the new language and direction.
 */
export function LanguageSwitcher({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const current = getLanguage();

  if (variant === "full") {
    return (
      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-foreground">
          <Languages className="h-4 w-4 text-gold" />
          {t("common.language")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("common.languageHint")}</p>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLanguage(opt.value)}
              aria-pressed={current === opt.value}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                current === opt.value
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {current === opt.value && <Check className="h-4 w-4" />}
              {opt.full}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="flex items-center overflow-hidden rounded-full border border-border/60 bg-secondary/60"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLanguage(opt.value)}
          aria-pressed={current === opt.value}
          aria-label={opt.full}
          className={`px-2.5 py-1 text-xs font-bold transition ${
            current === opt.value
              ? "bg-gold-gradient text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.short}
        </button>
      ))}
    </div>
  );
}
