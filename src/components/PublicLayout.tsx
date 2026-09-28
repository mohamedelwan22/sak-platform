import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";

const navItems = [
  { to: "/", label: () => t("navigation.publicHome") },
  { to: "/projects", label: () => t("navigation.publicProjects") },
  { to: "/about", label: () => t("navigation.publicAbout") },
  { to: "/faq", label: () => t("navigation.publicFaq") },
  { to: "/contact", label: () => t("navigation.publicContact") },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img src="/logo.jpg" alt="SAK100" className="h-8 w-auto" />
    </Link>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Phase F: PUBLIC announcement ticker — ABOVE the navbar */}
      <AnnouncementTicker variant="public" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-gold" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="text-sm font-medium transition-colors"
              >
                {item.label()}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("navigation.myDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
                >
                  {t("auth.signIn")}
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "register" }}
                  className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t("auth.startInvesting")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 bg-secondary/60">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t("public.footerTagline")}
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-foreground">{t("public.links")}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {navItems.map((i) => (
                  <li key={i.to}>
                    <Link to={i.to} className="hover:text-gold">
                      {i.label()}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-foreground">
                {t("public.disclaimerTitle")}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                {t("public.disclaimerBody")}
              </p>
            </div>
          </div>
          <p className="mt-10 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground/60">
            {t("public.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
