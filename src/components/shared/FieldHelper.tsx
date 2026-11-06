import { cn } from "@/lib/utils";
import { Info, AlertCircle } from "lucide-react";
import { t } from "@/i18n";

interface FieldHelperProps {
  /** Helper text to display below the input */
  helperText?: string;
  /** Validation error message */
  error?: string;
  /** Custom className */
  className?: string;
}

/**
 * FieldHelper - Displays helper text and/or validation error below a form field.
 * Supports RTL/LTR, shows error state with icon, and helper text with info icon.
 */
export function FieldHelper({ helperText, error, className }: FieldHelperProps) {
  if (!helperText && !error) return null;

  return (
    <div
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed",
        error ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      role={error ? "alert" : undefined}
      aria-live={error ? "polite" : "off"}
    >
      {error ? (
        <>
          <AlertCircle
            className="h-3.5 w-3.5 shrink-0 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </>
      ) : (
        <>
          <Info
            className="h-3.5 w-3.5 shrink-0 mt-0.5 flex-shrink-0 text-muted-foreground/50"
            aria-hidden="true"
          />
          <span className="text-muted-foreground/80">{helperText}</span>
        </>
      )}
    </div>
  );
}

interface FieldWrapperProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  /** id of the input element for label association */
  htmlFor?: string;
}

/**
 * FieldWrapper - A complete form field wrapper with label, required/optional
 * indicator, helper text, error message, and consistent spacing.
 */
export function FieldWrapper({
  label,
  children,
  className,
  required,
  optional,
  helperText,
  error,
  htmlFor,
}: FieldWrapperProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center justify-between text-sm font-semibold text-foreground"
      >
        <span>
          {label}
          {required && (
            <span className="ms-1 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </span>
        {optional && (
          <span className="text-xs font-normal text-muted-foreground/80">
            {t("common.optional")}
          </span>
        )}
      </label>
      {children}
      <FieldHelper helperText={helperText} error={error} />
    </div>
  );
}