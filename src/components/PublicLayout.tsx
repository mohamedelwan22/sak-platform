import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "@/hooks/useAuth";

const navItems = [
  { to: "/", label: "الرئيسية" },
  { to: "/projects", label: "المشاريع" },
  { to: "/about", label: "من نحن" },
  { to: "/faq", label: "الأسئلة الشائعة" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span
        className="text-gold-gradient font-display text-2xl font-bold tracking-tight"
        style={{ fontFamily: "Marcellus, 'Noto Kufi Arabic', serif" }}
      >
        SAK100
      </span>
      <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">
        Secure
        <br />
        Asset Keys
      </span>
    </Link>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const { session } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
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
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link
                to="/dashboard"
                className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                لوحتي
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "register" }}
                  className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  ابدأ الاستثمار
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 bg-navy-soft">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                منصة استثمار رقمية في أصول حقيقية — أراضٍ زراعية وفنادق ومستودعات — بوحدات SAK
                المرتبطة بسعر الذهب.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-foreground">روابط</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {navItems.map((i) => (
                  <li key={i.to}>
                    <Link to={i.to} className="hover:text-gold">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-foreground">إخلاء مسؤولية</p>
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                SAK ليست عملة مشفرة — هي وحدة ملكية رقمية محاسبية داخلية. الاستثمار في الأصول
                الحقيقية ينطوي على مخاطر، والعوائد السابقة لا تضمن العوائد المستقبلية.
              </p>
            </div>
          </div>
          <p className="mt-10 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} SAK100 — Secure Asset Keys. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
