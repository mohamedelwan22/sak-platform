import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
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
  Megaphone,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { t, getLanguage, setLanguage, type Language } from "@/i18n";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { useProfile, useWallet } from "@/hooks/useData";
import { fmtSAK } from "@/lib/format";
import { Logo } from "@/components/PublicLayout";
import { Avatar } from "@/components/shared/Avatar";
import { notificationsApi } from "@/api/notifications.api";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { impersonationStorage } from "@/lib/impersonationStorage";
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
    label: t("navigation.main"),
    items: [
      { to: "/dashboard", label: t("navigation.myDashboard"), icon: LayoutDashboard },
      { to: "/marketplace", label: t("navigation.market"), icon: Store },
      { to: "/convert", label: t("navigation.convert"), icon: ArrowLeftRight },
    ],
  },
  {
    label: t("navigation.myWalletGroup"),
    items: [
      { to: "/portfolio", label: t("navigation.myInvestments"), icon: Briefcase },
      { to: "/real-assets", label: t("navigation.linkedAssets"), icon: Building2 },
      { to: "/asset-allocation", label: t("navigation.assetAllocation"), icon: PieChart },
      { to: "/performance", label: t("navigation.performance"), icon: Activity },
      { to: "/sak-balance", label: t("navigation.sakBalance"), icon: Landmark },
      { to: "/payment-methods", label: t("navigation.paymentMethods"), icon: CreditCard },
    ],
  },
  {
    label: t("navigation.pricingOps"),
    items: [
      { to: "/sak-gold", label: t("navigation.sakGold"), icon: Coins },
      { to: "/transactions", label: t("navigation.transactions"), icon: ReceiptText },
      { to: "/profits", label: t("navigation.profits"), icon: TrendingUp },
      { to: "/certificates", label: t("navigation.certificates"), icon: Award },
    ],
  },
  {
    label: t("navigation.depositWithdraw"),
    items: [{ to: "/wallet", label: t("navigation.myFinanceWallet"), icon: Wallet }],
  },
  {
    label: t("navigation.supportNotifications"),
    items: [
      { to: "/support", label: t("navigation.supportTickets"), icon: LifeBuoy },
      { to: "/notifications", label: t("navigation.notifications"), icon: Bell },
    ],
  },
  {
    label: t("navigation.account"),
    items: [
      { to: "/kyc", label: t("navigation.kyc"), icon: ShieldCheck },
      { to: "/settings", label: t("navigation.personalInfo"), icon: Settings },
    ],
  },
];

const brokerGroups: Array<{
  label?: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: t("navigation.brokerPortal"),
    items: [
      { to: "/broker", label: t("navigation.overview"), icon: Store },
      { to: "/broker/profile", label: t("navigation.myProfile"), icon: Setting2 },
    ],
  },
  {
    label: t("navigation.clients"),
    items: [
      { to: "/broker/leads", label: t("navigation.leads"), icon: Users },
      { to: "/broker/clients", label: t("navigation.clients"), icon: UserCheck },
    ],
  },
  {
    label: t("navigation.adminTransactions"),
    items: [
      { to: "/broker/investment-requests", label: t("navigation.investmentRequests"), icon: Send },
      { to: "/broker/viewings", label: t("navigation.viewings"), icon: CalendarDays },
      { to: "/broker/bookings", label: t("navigation.bookings"), icon: Store },
    ],
  },
  {
    label: t("navigation.performanceRewards"),
    items: [
      { to: "/broker/commissions", label: t("navigation.commissions"), icon: TrendingUp },
      { to: "/broker/referrals", label: t("navigation.referrals"), icon: LinkIcon },
      { to: "/broker/analytics", label: t("navigation.analytics"), icon: Activity },
    ],
  },
];

const adminNav = [
  { to: "/admin", label: t("navigation.overview"), icon: Gauge },
  { to: "/admin/kyc", label: t("navigation.adminKyc"), icon: FileCheck2 },
  { to: "/admin/deposits", label: t("navigation.adminDeposits"), icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: t("navigation.adminWithdrawals"), icon: ArrowUpFromLine },
  { to: "/admin/projects", label: t("navigation.adminProjects"), icon: Landmark },
  { to: "/admin/lands", label: t("navigation.adminAssets"), icon: Landmark },
  { to: "/admin/countries", label: t("navigation.adminCountries"), icon: Globe },
  { to: "/admin/cities", label: t("navigation.adminCities"), icon: MapPin },
  { to: "/admin/investors", label: t("navigation.adminInvestors"), icon: Users },
  { to: "/admin/investment-requests", label: t("navigation.investmentRequests"), icon: Send },
  { to: "/admin/wallets", label: t("navigation.adminWallets"), icon: Wallet },
  { to: "/admin/transactions", label: t("navigation.adminTransactions"), icon: ReceiptText },
  { to: "/admin/notifications", label: t("navigation.notifications"), icon: Bell },
  { to: "/admin/support", label: t("navigation.adminSupport"), icon: LifeBuoy },
  { to: "/admin/broadcasts", label: t("navigation.adminBroadcasts"), icon: Megaphone },
  { to: "/admin/gold", label: t("navigation.adminGold"), icon: Coins },
  { to: "/admin/sak-config", label: t("navigation.adminSakConfig"), icon: Settings },
  { to: "/admin/profits", label: t("navigation.adminProfitDistribution"), icon: TrendingUp },
  { to: "/admin/profit-history", label: t("navigation.adminDistributionHistory"), icon: History },
  {
    to: "/admin/broker-applications",
    label: t("navigation.adminBrokerApplications"),
    icon: FileCheck2,
  },
  { to: "/admin/brokers", label: t("navigation.adminVerifiedBrokers"), icon: Users },
  { to: "/admin/customers", label: t("navigation.clients"), icon: Users },
  { to: "/admin/commissions", label: t("navigation.commissions"), icon: TrendingUp },
  { to: "/admin/homepage", label: t("navigation.adminHomepage"), icon: Landmark },
  { to: "/admin/audit-log", label: t("navigation.adminAuditLog"), icon: History },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isBrokerArea = pathname.startsWith("/broker");
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const groups = isBrokerArea ? brokerGroups : investorGroups;

  return (
    <div className="flex flex-col gap-1">
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
            {t("navigation.administration")}
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
    </div>
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
      {/* Sidebar — full viewport height with its own vertical scrolling:
          fixed header (logo), scrollable nav, pinned footer. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar md:flex">
        {/* Header / Logo — stable */}
        <div className="shrink-0 px-4 pt-4 pb-3">
          <Logo />
        </div>
        {/* Scrollable Navigation — the scrollbar belongs only to this area */}
        <nav
          className="min-h-0 flex-1 overflow-y-auto sidebar-scroll px-4 pb-4"
          aria-label="Main navigation"
        >
          <NavLinks />
        </nav>
        {/* Footer actions — stable */}
        <div className="shrink-0 border-t border-sidebar-border/60 px-4 py-3">
          <div className="space-y-2">
            {isBrokerArea && (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
              >
                <Briefcase className="h-4 w-4" />
                {t("navigation.backToInvestor")}
              </Link>
            )}
            <Link to="/" className="block px-3 text-xs text-muted-foreground hover:text-gold">
              {t("navigation.backToPublic")}
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4.5 w-4.5" />
              {t("navigation.signOut")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <ImpersonationBannerSlot />
        {/* Ticker + header stick together so the navbar can never slide under the ticker. */}
        <div className="sticky top-0 z-40">
          <AnnouncementTicker variant="portal" />
          <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl">
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
                  title={t("navigation.accountNumber")}
                  className="num hidden rounded-full border border-border/60 bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground xl:block"
                >
                  {user.accountNumber}
                </span>
              ) : null}
              <Link
                to="/notifications"
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("navigation.notifications")}
              >
                <Bell className="h-5 w-5" />
                {!!unread && (
                  <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
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
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Renders the impersonation banner only while a session is live. Kept as its own
 * component so the storage read happens once per render rather than on every
 * PortalShell render.
 */
function ImpersonationBannerSlot() {
  const [state] = useState(() => impersonationStorage.get());
  if (!state) return null;
  return <ImpersonationBanner state={state} />;
}

function MobileNav() {  const { user } = useAuth();
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
