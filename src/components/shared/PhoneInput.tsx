/**
 * PhoneInput — A reusable international phone number input component.
 *
 * Combines a country calling code selector with a phone number input field,
 * providing real-time formatting as the user types and E.164 normalization
 * on change. Supports all countries via the centralized countries dataset.
 *
 * Features:
 * - Country flag, name, and calling code in selector
 * - Searchable by name (EN/AR), ISO code, or calling code
 * - Real-time national formatting as user types
 * - E.164 value output (suitable for storage)
 * - Arabic RTL and English LTR support
 * - Keyboard navigation
 * - Mobile-friendly
 *
 * Validation contract:
 * - `onChange` only ever fires with a full, valid E.164 number (or "" when the
 *   field is cleared). The parent never receives an invalid number, so a saved
 *   value is always persistable.
 * - `onValidityChange` reports whether the text currently typed is valid, so
 *   parents can block submission while an incomplete number is visible.
 * - Validation uses libphonenumber-js (max metadata) against the selected
 *   country's number formats. There is no regex fallback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Globe, AlertTriangle } from "lucide-react";
import { isRTL, t } from "@/i18n";
import {
  getAllCountriesWithCallingCodes,
  searchCountries,
  type CountryCallingCode,
} from "@/lib/countries";
import { normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface PhoneInputProps {
  /** Current phone number (E.164, as confirmed by this component or the backend) */
  value: string;
  /** On change callback — returns E.164 normalized number, or "" when cleared */
  onChange: (e164: string) => void;
  /** Current calling code (e.g., "+20") */
  countryCallingCode: string;
  /** On change callback for calling code */
  onCountryCallingCodeChange: (code: string) => void;
  /** Reports whether the currently typed text is valid (empty counts as valid) */
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string | null;
  label?: string;
  helperText?: string;
}

interface CountryOption {
  isoCode: string;
  name: string;
  nameAr: string;
  callingCode: string;
  flag: string;
}

/** Strip a leading calling code (E.164) for display; pass national text through. */
function nationalFrom(value: string, callingCode: string): string {
  if (!value) return "";
  if (value.startsWith("+") && value.startsWith(callingCode)) {
    return value.slice(callingCode.length);
  }
  return value;
}

export function PhoneInput({
  value,
  onChange,
  countryCallingCode,
  onCountryCallingCodeChange,
  onValidityChange,
  placeholder,
  disabled = false,
  className,
  required = false,
  error,
  label,
  helperText,
}: PhoneInputProps) {
  const isArabic = isRTL();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Raw text as typed by the user. The input is always fed from this state,
  // so in-progress (invalid) input stays visible instead of being swallowed.
  const [raw, setRaw] = useState(() => nationalFrom(value, countryCallingCode));
  const lastEmittedRef = useRef(value);

  // Sync externally driven value changes (profile load / reset / save) into
  // the input without clobbering keystrokes: only when the prop differs from
  // the last value this component emitted.
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setRaw(nationalFrom(value, countryCallingCode));
      lastEmittedRef.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, countryCallingCode]);

  const result = useMemo(
    () => normalizePhone(raw, countryCallingCode),
    [raw, countryCallingCode],
  );
  const trimmed = raw.trim();
  const isEmpty = trimmed === "";
  const showInvalid = !!error || (!isEmpty && !result.valid);

  // Report validity to the parent whenever it changes.
  const valid = isEmpty || result.valid;
  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  // Filter countries based on search
  const filteredCountries = useMemo<CountryOption[]>(() => {
    const results = searchCountries(searchQuery);
    return results.map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      nameAr: c.nameAr,
      callingCode: c.callingCode,
      flag: c.flag,
    }));
  }, [searchQuery]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setRaw(input);
      const r = normalizePhone(input, countryCallingCode);
      if (r.valid && r.e164) {
        lastEmittedRef.current = r.e164;
        onChange(r.e164);
      } else if (input.trim() === "") {
        // Field cleared — the parent should forget the previous number.
        lastEmittedRef.current = "";
        onChange("");
      }
      // Otherwise: keep the parent's value untouched; the validity flag (via
      // onValidityChange) blocks submission while the text is invalid.
    },
    [countryCallingCode, onChange],
  );

  const handleCountryChange = useCallback(
    (code: string) => {
      onCountryCallingCodeChange(code);
      setIsOpen(false);
      setSearchQuery("");
      // Re-validate the national number under the newly selected calling code.
      const r = normalizePhone(raw, code);
      if (r.valid && r.e164) {
        lastEmittedRef.current = r.e164;
        onChange(r.e164);
      }
    },
    [onCountryCallingCodeChange, onChange, raw],
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

  const selectedCountry = useMemo(() => {
    return getAllCountriesWithCallingCodes().find(
      (c) => c.callingCode === countryCallingCode,
    );
  }, [countryCallingCode]);

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label
          className={cn(
            "text-xs font-medium text-foreground",
            error && "text-destructive",
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <div
        className={cn(
          "flex flex-col xs:flex-row items-start gap-2",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {/* Country Calling Code Selector */}
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
              <span className="text-base shrink-0">{selectedCountry?.flag || "🌐"}</span>
              <span className="text-sm text-foreground truncate max-w-[6rem]">
                {selectedCountry?.callingCode || countryCallingCode}
              </span>
              <Globe className="h-4 w-4 text-muted-foreground shrink-0 ms-auto" />
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
                placeholder={t("profile.countryPlaceholder") || "Search countries…"}
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
                    aria-selected={c.callingCode === countryCallingCode}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                      c.callingCode === countryCallingCode
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

        {/* Phone Number Input */}
        <input
          type="tel"
          value={raw}
          onChange={handlePhoneChange}
          placeholder={placeholder || t("profile.phonePlaceholder")}
          disabled={disabled}
          dir="ltr"
          className={cn(
            inp,
            "flex-1 min-w-0",
            showInvalid && "border-destructive focus:border-destructive",
          )}
          aria-invalid={showInvalid}
          aria-label={label || t("profile.phone")}
        />
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {(error || showInvalid) && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error || t("validation.phone") || "Please enter a valid phone number"}
        </p>
      )}
    </div>
  );
}
