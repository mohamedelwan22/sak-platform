import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtNum, fmtDate, daysUntil } from "@/lib/format";
import { landImage } from "@/lib/images";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);

  const { data: holdings, isLoading } = useQuery({
    queryKey: ["holdings-full", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holdings")
        .select("*, lands(title_ar, country, city, cover_image_url)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PortalShell title="استثماراتي">
      {isLoading ? (
        <Spinner />
      ) : !holdings?.length ? (
        <EmptyState
          icon={Briefcase}
          title="لا استثمارات بعد"
          description="ابدأ ببناء محفظتك من الأصول الحقيقية"
          action={
            <Link to="/projects" className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground">
              تصفح الأصول
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {holdings.map((h) => {
            const matured = new Date(h.maturity_date) <= new Date();
            const days = daysUntil(h.maturity_date);
            const currentValue = price != null ? Number(h.sak_owned) * price : null;
            const costBasis = Number(h.sak_owned) * Number(h.purchase_price_per_sak_usd);
            const pnl = currentValue != null ? currentValue - costBasis : null;
            return (
              <div key={h.id} className="card-luxe overflow-hidden !p-0">
                <div className="relative h-36">
                  <img src={landImage(h.lands?.cover_image_url)} alt="" loading="lazy" width={1024} height={683} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-navy-deep/40" />
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={matured && h.status === "active" ? "matured" : h.status} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground">{h.lands?.title_ar ?? "أصل"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {h.lands?.city}، {h.lands?.country}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label="الوحدات" value={`${fmtNum(Number(h.sak_owned), 2)} SAK`} />
                    <Row label="القيمة الحالية" value={currentValue != null ? fmtUSD(currentValue) : "…"} gold />
                    <Row label="تكلفة الشراء" value={fmtUSD(costBasis)} />
                    {pnl != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الربح/الخسارة</span>
                        <span className={`num font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {pnl >= 0 ? "+" : ""}
                          {fmtUSD(pnl)}
                        </span>
                      </div>
                    )}
                    <Row label="تاريخ الشراء" value={fmtDate(h.purchase_date)} />
                  </div>
                  <div className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold ${matured ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"}`}>
                    {matured ? "استحق — يمكنك طلب البيع قريباً" : `الاستحقاق بعد ${days} يوماً (${fmtDate(h.maturity_date)})`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-semibold ${gold ? "text-gold" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
