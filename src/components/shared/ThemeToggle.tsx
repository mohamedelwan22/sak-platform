import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Premium navbar theme toggle. Explicit light ↔ dark switch (the Settings
 * page owns Light / Dark / System). Sized like the other navbar icon
 * buttons, gold on hover/focus, fully keyboard accessible.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Icons depend on the resolved theme which may differ between SSR and the
  // pre-paint client script — render a stable placeholder until mounted.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={cn(
        "relative rounded-lg p-2 text-muted-foreground transition-colors duration-200",
        "hover:bg-gold/10 hover:text-gold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        "cursor-pointer shrink-0",
        className,
      )}
    >
      <span className="relative block h-5 w-5 overflow-hidden" aria-hidden="true">
        {mounted && (
          <>
            <Sun
              className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-300 ease-out",
                isDark ? "translate-y-0 rotate-0 opacity-100" : "translate-y-4 rotate-90 opacity-0",
              )}
            />
            <Moon
              className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-300 ease-out",
                isDark
                  ? "-translate-y-4 -rotate-90 opacity-0"
                  : "translate-y-0 rotate-0 opacity-100",
              )}
            />
          </>
        )}
      </span>
    </button>
  );
}
