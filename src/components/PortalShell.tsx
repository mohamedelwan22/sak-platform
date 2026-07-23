import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Wallet,
  Briefcase,
  ReceiptText,
  ShieldCheck,
  Bell,
  LogOut,
  Landmark,
  Users,
  FileCheck2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gauge,
  Globe,
  MapPin,
  Coins,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useWallet } from "@/hooks/useData";
import { fmtSAK } from "@/lib/format";
import { Logo } from "@/components/PublicLayout";
import { notificationsApi } from "@/api/notifications.api";

const investorNav = [
  { to: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
  { to: "/wallet", label: "محفظتي", icon: Wallet },
  { to: "/portfolio", label: "استثماراتي", icon: Briefcase },
  { to: "/transactions", label: "المعاملات", icon: ReceiptText },
  { to: "/kyc", label: "التحقق من الهوية", icon: ShieldCheck },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
] as const;

const adminNav = [
  { to: "/admin", label: "نظرة عامة", icon: Gauge },
  { to: "/admin/kyc", label: "طلبات KYC", icon: FileCheck2 },
  { to: "/admin/deposits", label: "الإيداعات", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "السحوبات", icon: ArrowUpFromLine },
  { to: "/admin/projects", label: "المشاريع", icon: Landmark },
  { to: "/admin/lands", label: "الأراضي", icon: Landmark },
  { to: "/admin/countries", label: "الدول", icon: Globe },
  { to: "/admin/cities", label: "المدن", icon: MapPin },
  { to: "/admin/investors", label: "المستثمرون", icon: Users },
  { to: "/admin/wallets", label: "المحافظ", icon: Wallet },
  { to: "/admin/transactions", label: "المعاملات", icon: ReceiptText },
  { to: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { to: "/admin/gold", label: "أسعار الذهب", icon: Coins },
  { to: "/admin/sak-config", label: "إعدادات SAK", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <nav className="flex flex-col gap-1">
      {investorNav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeProps={{ className: "bg-gold/15 text-gold" }}
          inactiveProps={{
            className: "text-muted-foreground hover:bg-secondary hover:text-foreground",
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <>
          <p className="mt-5 mb-1 px-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            الإدارة
          </p>
          {adminNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.to === "/admin" }}
              activeProps={{ className: "bg-gold/15 text-gold" }}
              inactiveProps={{
                className: "text-muted-foreground hover:bg-secondary hover:text-foreground",
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}

export function PortalShell({ children, title }: { children: ReactNode; title: string }) {
  const { user, logout } = useAuth();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { data: wallet } = useWallet(userId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ["unread-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount(userId);
      return res.data.data?.count ?? 0;
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-8 px-2 pt-2">
          <Logo />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-3 pt-6">
          <Link to="/" className="block px-3 text-xs text-muted-foreground hover:text-gold">
            ← العودة للموقع العام
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4.5 w-4.5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="md:hidden">
                <Logo />
              </span>
              <h1 className="hidden text-lg font-bold text-foreground md:block">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="num hidden rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold sm:block">
                {wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
              </span>
              <Link
                to="/notifications"
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="الإشعارات"
              >
                <Bell className="h-5 w-5" />
                {!!unread && (
                  <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <span className="hidden max-w-32 truncate text-sm text-muted-foreground lg:block">
                {profile?.full_name || user?.email}
              </span>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-t border-border/40 px-2 py-2 md:hidden">
            <MobileNav />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function MobileNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const items = isAdmin ? [...investorNav, ...adminNav] : [...investorNav];
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/admin" }}
          activeProps={{ className: "bg-gold/15 text-gold" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
