import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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
  TrendingUp,
  Award,
  History,
  Store,
  Building2,
  PieChart,
  ArrowLeftRight,
  CreditCard,
  LifeBuoy,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useWallet } from "@/hooks/useData";
import { fmtSAK } from "@/lib/format";
import { Logo } from "@/components/PublicLayout";
import { Avatar } from "@/components/shared/Avatar";
import { notificationsApi } from "@/api/notifications.api";
import {
  Settings as Setting2,
  CalendarDays,
  Link as LinkIcon,
  Send,
  UserCheck,
} from "lucide-react";

const investorGroups: Array<{
  label?: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "الرئيسية",
    items: [
      { to: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
      { to: "/marketplace", label: "السوق", icon: Store },
      { to: "/convert", label: "تحويل إلى SAK", icon: ArrowLeftRight },
    ],
  },
  {
    label: "محفظتي",
    items: [
      { to: "/portfolio", label: "استثماراتي", icon: Briefcase },
      { to: "/real-assets", label: "الأصول المرتبطة", icon: Building2 },
      { to: "/asset-allocation", label: "توزيع الأصول", icon: PieChart },
      { to: "/performance", label: "الأداء والعوائد", icon: Activity },
      { to: "/sak-balance", label: "رصيد SAK", icon: Landmark },
      { to: "/payment-methods", label: "طرق الدفع", icon: CreditCard },
    ],
  },
  {
    label: "الأسعار والعمليات",
    items: [
      { to: "/sak-gold", label: "SAK والذهب", icon: Coins },
      { to: "/transactions", label: "العمليات", icon: ReceiptText },
      { to: "/profits", label: "العوائد", icon: TrendingUp },
      { to: "/certificates", label: "شهادات التملك", icon: Award },
    ],
  },
  {
    label: "الإيداع والسحب",
    items: [{ to: "/wallet", label: "محفظتي المالية", icon: Wallet }],
  },
  {
    label: "الدعم والإشعارات",
    items: [
      { to: "/support", label: "الدعم والتذاكر", icon: LifeBuoy },
      { to: "/notifications", label: "الإشعارات", icon: Bell },
    ],
  },
  {
    label: "الحساب",
    items: [
      { to: "/kyc", label: "التحقق من الهوية", icon: ShieldCheck },
      { to: "/settings", label: "المعلومات الشخصية", icon: Settings },
    ],
  },
];

const brokerGroups: Array<{
  label?: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "بوابة الوسيط",
    items: [
      { to: "/broker", label: "نظرة عامة", icon: Store },
      { to: "/broker/profile", label: "ملفي", icon: Setting2 },
    ],
  },
  {
    label: "العملاء",
    items: [
      { to: "/broker/leads", label: "العملاء المحتملون", icon: Users },
      { to: "/broker/clients", label: "العملاء", icon: UserCheck },
    ],
  },
  {
    label: "المعاملات",
    items: [
      { to: "/broker/investment-requests", label: "طلبات الاستثمار", icon: Send },
      { to: "/broker/viewings", label: "المعاينات", icon: CalendarDays },
      { to: "/broker/bookings", label: "الحجوزات", icon: Store },
    ],
  },
  {
    label: "الأداء والمكافآت",
    items: [
      { to: "/broker/commissions", label: "العمولات", icon: TrendingUp },
      { to: "/broker/referrals", label: "الإحالات", icon: LinkIcon },
      { to: "/broker/analytics", label: "التحليلات", icon: Activity },
    ],
  },
];

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
  { to: "/admin/investment-requests", label: "طلبات الاستثمار", icon: Send },
  { to: "/admin/wallets", label: "المحافظ", icon: Wallet },
  { to: "/admin/transactions", label: "المعاملات", icon: ReceiptText },
  { to: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { to: "/admin/gold", label: "أسعار الذهب", icon: Coins },
  { to: "/admin/sak-config", label: "إعدادات SAK", icon: Settings },
  { to: "/admin/profits", label: "توزيع الأرباح", icon: TrendingUp },
  { to: "/admin/profit-history", label: "سجل التوزيعات", icon: History },
  { to: "/admin/broker-applications", label: "طلبات انضمام الوسطاء", icon: FileCheck2 },
  { to: "/admin/brokers", label: "الوسطاء المعتمدون", icon: Users },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/commissions", label: "العمولات", icon: TrendingUp },
  { to: "/admin/asset-types", label: "أنواع الأصول", icon: Landmark },
  { to: "/admin/homepage", label: "الصفحة الرئيسية", icon: Landmark },
  { to: "/admin/audit-log", label: "سجل التدقيق", icon: History },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isBrokerArea = pathname.startsWith("/broker");
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const groups = isBrokerArea ? brokerGroups : investorGroups;

  return (
    <nav className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.label}>
          {group.label && (
            <p className="mt-4 mb-1 px-3 text-xs font-bold tracking-widest text-muted-foreground/60 first:mt-0">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.to === "/dashboard" || item.to === "/broker" }}
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
        </div>
      ))}
      {isAdmin && !isBrokerArea && (
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
  const location = useLocation();
  const isBrokerArea = location.pathname.startsWith("/broker");
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
          {isBrokerArea && (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
            >
              <Briefcase className="h-4 w-4" />
              الرجوع للوحة المستثمر
            </Link>
          )}
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
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
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
              {user?.accountNumber ? (
                <span
                  dir="ltr"
                  title="رقم حساب SAK"
                  className="num hidden rounded-full border border-border/60 bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground xl:block"
                >
                  {user.accountNumber}
                </span>
              ) : null}
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
              <span className="hidden max-w-32 items-center gap-2 text-sm text-muted-foreground lg:flex">
                <Avatar
                  name={profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
                  avatarUrl={profile?.avatarUrl}
                  size={28}
                />
                <span className="truncate">
                  {profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.email}
                </span>
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
  const { pathname } = useLocation();
  const isBrokerArea = pathname.startsWith("/broker");
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const primaryItems = (isBrokerArea ? brokerGroups : investorGroups).flatMap((g) => g.items);
  const items = !isBrokerArea && isAdmin ? [...primaryItems, ...adminNav] : primaryItems;
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
