/**
 * WhatsAppInput — A reusable WhatsApp number input component.
 *
 * Supports:
 * - "Same as phone" toggle — WhatsApp mirrors the phone number
 * - Independent WhatsApp number when toggle is off
 * - Separate country calling code selection for WhatsApp
 * - Real-time formatting and E.164 normalization
 * - Arabic RTL and English LTR support
 *
 * Validation contract (same as PhoneInput):
 * - `onChange` only fires with a full, valid E.164 number (or "" when cleared).
 * - `onValidityChange` reports whether the typed text is valid.
 * - Country-specific validation via libphonenumber-js (max metadata).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { isRTL, t } from "@/i18n";
import { getAllCountriesWithCallingCodes, searchCountries } from "@/lib/countries";
import { normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface WhatsAppInputProps {
  /** Phone number (E.164) — used when sameAsPhone is true */
  phone: string;
  /** On change callback — returns E.164 normalized WhatsApp number (or null when cleared/same-as-phone) */
  onChange: (e164: string | null) => void;
  /** Current WhatsApp calling code */
  whatsAppCallingCode: string;
  /** On change callback for WhatsApp calling code */
  onWhatsAppCallingCodeChange: (code: string) => void;
  /** Whether "Same as phone" is enabled */
  sameAsPhone: boolean;
  /** On change callback for sameAsPhone toggle */
  onSameAsPhoneChange: (checked: boolean) => void;
  /** Current WhatsApp number (E.164, independent) */
  whatsAppNumber: string | null;
  /** Reports whether the currently typed text is valid (empty counts as valid) */
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string | null;
  label?: string;
  helperText?: string;
}

/** Strip a leading calling code (E.164) for display; pass national text through. */
function nationalFrom(value: string | null, callingCode: string): string {
  if (!value) return "";
  if (value.startsWith("+") && value.startsWith(callingCode)) {
    return value.slice(callingCode.length);
  }
  return value;
}

export function WhatsAppInput({
  phone,
  onChange,
  whatsAppCallingCode,
  onWhatsAppCallingCodeChange,
  sameAsPhone,
  onSameAsPhoneChange,
  whatsAppNumber,
  onValidityChange,
  placeholder,
  disabled = false,
  className,
  error,
  label,
  helperText,
}: WhatsAppInputProps) {
  const isArabic = isRTL();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // The independent WhatsApp section keeps its own raw text state so the user
  // always sees what they type.
  const [raw, setRaw] = useState(() => nationalFrom(whatsAppNumber, whatsAppCallingCode));
  const lastEmittedRef = useRef(whatsAppNumber ?? "");

  useEffect(() => {
    const current = whatsAppNumber ?? "";
    if (current !== lastEmittedRef.current) {
      setRaw(nationalFrom(whatsAppNumber, whatsAppCallingCode));
      lastEmittedRef.current = current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsAppNumber, whatsAppCallingCode]);

  const filteredCountries = useMemo(() => {
    const results = searchCountries(searchQuery);
    return results.map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      nameAr: c.nameAr,
      callingCode: c.callingCode,
      flag: c.flag,
    }));
  }, [searchQuery]);

  const selectedCountry = useMemo(() => {
    return getAllCountriesWithCallingCodes().find(
      (c) => c.callingCode === whatsAppCallingCode,
    );
  }, [whatsAppCallingCode]);

  const result = useMemo(
    () => normalizePhone(raw, whatsAppCallingCode),
    [raw, whatsAppCallingCode],
  );
  const trimmed = raw.trim();
  const isEmpty = trimmed === "";
  const showInvalid = !!error || (!isEmpty && !result.valid);

  const valid = isEmpty || result.valid;
  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const handleWhatsAppChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setRaw(input);
      const r = normalizePhone(input, whatsAppCallingCode);
      if (r.valid && r.e164) {
        lastEmittedRef.current = r.e164;
        onChange(r.e164);
      } else if (input.trim() === "") {
        lastEmittedRef.current = "";
        onChange(null);
      }
    },
    [whatsAppCallingCode, onChange],
  );

  const handleCountryChange = useCallback(
    (code: string) => {
      onWhatsAppCallingCodeChange(code);
      setIsOpen(false);
      setSearchQuery("");
      const r = normalizePhone(raw, code);
      if (r.valid && r.e164) {
        lastEmittedRef.current = r.e164;
        onChange(r.e164);
      }
    },
    [onWhatsAppCallingCodeChange, onChange, raw],
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) setSearchQuery("");
      return !prev;
    });
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          className={cn(
            "text-xs font-medium text-foreground",
            error && "text-destructive",
          )}
        >
          {label}
        </label>
      )}

      {/* Same as Phone Toggle */}
      <label
        className={cn(
          "flex items-start gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          type="checkbox"
          checked={sameAsPhone}
          onChange={(e) => {
            onSameAsPhoneChange(e.target.checked);
            if (e.target.checked && phone) {
              onChange(phone);
            }
          }}
          className="mt-0.5 rounded border-input text-gold focus:ring-gold"
          disabled={disabled}
        />
        <span>{t("profile.whatsappSameAsPhone")}</span>
      </label>

      {!sameAsPhone && (
        <div
          className={cn(
            "flex flex-col xs:flex-row items-start gap-2",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {/* WhatsApp Calling Code Selector */}
          <div className="relative w-full xs:w-[150px] sm:w-[170px] shrink-0">
            <button
              type="button"
              onClick={handleToggle}
              disabled={disabled}
              className={cn(
                inp,
                "justify-between",
                isOpen && "border-gold",
                showInvalid && "border-destructive focus:border-destructive",
              )}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-lg shrink-0">{selectedCountry?.flag || "🌐"}</span>
                <span className="text-sm text-foreground truncate">
                  {selectedCountry?.callingCode || whatsAppCallingCode}
                </span>
              </div>
            </button>

            {isOpen && (
              <div
                className={cn(
                  "absolute z-50 mt-1 w-full max-h-64 overflow-y-auto overflow-x-hidden border border-border rounded-xl bg-background shadow-lg",
                  isArabic ? "right-0" : "left-0",
                )}
                role="listbox"
              >
                <input
                  type="text"
                  placeholder={t("profile.countryPlaceholder")}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full px-3 py-2 text-sm bg-background border-b border-border/50 focus:outline-none focus:border-gold"
                  autoComplete="off"
                />
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                    {t("errors.noResults") || "No countries found"}
                  </div>
                ) : (
                  filteredCountries.map((c) => (
                    <button
                      key={c.isoCode}
                      type="button"
                      onClick={() => handleCountryChange(c.callingCode)}
                      role="option"
                      aria-selected={c.callingCode === whatsAppCallingCode}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                        c.callingCode === whatsAppCallingCode
                          ? "bg-gold/10 text-gold"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="text-base shrink-0">{c.flag}</span>
                      <span className="flex-1 min-w-0 truncate text-start">
                        {isArabic ? c.nameAr : c.name}
                      </span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {c.callingCode}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Number Input */}
          <input
            type="tel"
            value={raw}
            onChange={handleWhatsAppChange}
            placeholder={placeholder || t("profile.whatsappPlaceholder")}
            disabled={disabled}
            dir="ltr"
            className={cn(
              inp,
              "flex-1 min-w-0",
              showInvalid && "border-destructive focus:border-destructive",
            )}
            aria-invalid={showInvalid}
            aria-label={label || t("profile.whatsapp")}
          />
        </div>
      )}

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {(error || showInvalid) && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error || t("validation.phone") || "Please enter a valid WhatsApp number"}
        </p>
      )}
    </div>
  );
}
