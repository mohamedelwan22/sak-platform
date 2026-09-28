import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Landmark, MapPin, FolderKanban, ChevronDown, RefreshCw, Layers } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtNum, fmtDate } from "@/lib/format";
import { landImage } from "@/lib/images";
import { holdingsApi } from "@/api/holdings.api";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/real-assets")({
  component: RealAssetsPage,
});

interface RealAssetHolding {
  id: string;
  sakOwned: number;
  purchasePricePerSakUsd: number;
  purchaseDate: string;
  maturityDate: string;
  status: string;
}

interface RealAssetProject {
  id: string;
  titleAr: string;
  titleEn: string;
}

interface RealAsset {
  landId: string;
  landTitleAr: string;
  landTitleEn: string;
  assetType: string;
  country: string;
  city: string;
  areaM2: number;
  landStatus: string;
  riskLevel: string;
  expectedRoi: number;
  maturityMonths: number;
  coverImageUrl: string | null;
  lat: number | null;
  lng: number | null;
  project: RealAssetProject | null;
  sakOwned: number;
  totalCostUsd: number;
  averagePurchasePriceUsd: number;
  currentValueUsd: number | null;
  allocationPercent: number;
  holdings: RealAssetHolding[];
}

interface RealAssetsResult {
  assets: RealAsset[];
  totalSakOwned: number;
  totalValueUsd: number | null;
  sakPriceUsd: number | null;
  valuationDate: string | null;
}

const assetTypeLabels: Record<string, string> = {
  land: t("_authenticatedReal-assets.k19"),
  agricultural: t("_authenticatedReal-assets.k20"),
  residential: t("_authenticatedReal-assets.k21"),
  commercial: t("_authenticatedReal-assets.k22"),
  villa: t("_authenticatedReal-assets.k23"),
};

const riskLabels: Record<string, string> = {
  low: t("_authenticatedReal-assets.k24"),
  medium: t("_authenticatedReal-assets.k25"),
  high: t("_authenticatedReal-assets.k26"),
};

function assetTypeLabel(type: string): string {
  return assetTypeLabels[type] ?? type;
}

function RealAssetsPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<RealAssetsResult>({
    queryKey: ["real-assets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await holdingsApi.getRealAssets();
      return res.data.data;
    },
  });

  const assets = data?.assets ?? [];
  const totalSak = Number(data?.totalSakOwned ?? 0);
  const totalValue = data?.totalValueUsd != null ? Number(data.totalValueUsd) : null;
  const sakPrice = data?.sakPriceUsd != null ? Number(data.sakPriceUsd) : null;
  const valuationDate = data?.valuationDate ?? null;

  function toggleExpanded(landId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(landId)) next.delete(landId);
      else next.add(landId);
      return next;
    });
  }

  return (
    <PortalShell title={t("_authenticatedReal-assets.k5")}>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <div className="card-luxe flex flex-col items-center gap-4 p-10 text-center">
          <p className="font-semibold text-foreground">{t("_authenticatedReal-assets.k1")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("_authenticatedReal-assets.k10000")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-gold-gradient flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            {t("_authenticatedReal-assets.k10001")}
          </button>
        </div>
      ) : !assets.length ? (
        <EmptyState
          icon={Landmark}
          title={t("_authenticatedReal-assets.k6")}
          description={t("_authenticatedReal-assets.k7")}
          action={
            <Link
              to="/marketplace"
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("_authenticatedReal-assets.k10002")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title={t("_authenticatedReal-assets.k8")}
              value={fmtNum(assets.length, 0)}
              subtitle={t("_authenticatedReal-assets.k9")}
              icon={Layers}
              variant="info"
            />
            <StatsCard
              title={t("_authenticatedReal-assets.k10")}
              value={fmtSAK(totalSak, 2)}
              subtitle={t("_authenticatedReal-assets.k11")}
              icon={Landmark}
              variant="default"
            />
            <StatsCard
              title={t("_authenticatedReal-assets.k12")}
              value={totalValue != null ? fmtUSD(totalValue) : "…"}
              subtitle={t("_authenticatedReal-assets.k13")}
              icon={Layers}
              variant="gold"
            />
            <StatsCard
              title={t("_authenticatedReal-assets.k14")}
              value={sakPrice != null ? fmtUSD(sakPrice) : "…"}
              subtitle={
                valuationDate
                  ? t("realAssets.m1", { v: fmtDate(valuationDate) })
                  : t("_authenticatedReal-assets.k27")
              }
              icon={Landmark}
              variant="default"
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const title = asset.landTitleAr || asset.landTitleEn;
              const isOpen = expanded.has(asset.landId);
              return (
                <div key={asset.landId} className="card-luxe overflow-hidden !p-0">
                  <div className="relative h-40">
                    <img
                      src={landImage(asset.coverImageUrl)}
                      alt=""
                      loading="lazy"
                      width={1024}
                      height={683}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 start-3">
                      <StatusBadge status={asset.landStatus} />
                    </div>
                    <div className="absolute bottom-3 end-3">
                      <span className="bg-background/80 rounded-md px-2 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
                        {assetTypeLabel(asset.assetType)}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {[asset.city, asset.country]
                        .filter(Boolean)
                        .join(t("_authenticatedReal-assets.k28"))}
                    </p>

                    {asset.project && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FolderKanban className="h-3.5 w-3.5" />
                        {t("_authenticatedReal-assets.k10000")}{" "}
                        {asset.project.titleAr || asset.project.titleEn}
                      </p>
                    )}

                    {(asset.riskLevel || asset.expectedRoi > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {asset.riskLevel && (
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {riskLabels[asset.riskLevel] ?? asset.riskLevel}
                          </span>
                        )}
                        {asset.expectedRoi > 0 && (
                          <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                            {t("_authenticatedReal-assets.k10001")} {fmtNum(asset.expectedRoi, 1)}%
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 space-y-2 text-sm">
                      <Row
                        label={t("_authenticatedReal-assets.k15")}
                        value={fmtSAK(asset.sakOwned, 2)}
                      />
                      <Row
                        label={t("_authenticatedReal-assets.k16")}
                        value={asset.currentValueUsd != null ? fmtUSD(asset.currentValueUsd) : "…"}
                        gold
                      />
                      <Row
                        label={t("_authenticatedReal-assets.k17")}
                        value={`${fmtNum(asset.allocationPercent, 1)}%`}
                        subtitle={
                          asset.sakOwned > 0 ? t("_authenticatedReal-assets.k29") : undefined
                        }
                      />
                      <Row
                        label={t("_authenticatedReal-assets.k18")}
                        value={
                          asset.averagePurchasePriceUsd > 0
                            ? fmtUSD(asset.averagePurchasePriceUsd)
                            : "—"
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(asset.landId)}
                      className="mt-4 flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground"
                      aria-expanded={isOpen}
                    >
                      {t("_authenticatedReal-assets.k10003")}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-3">
                        {asset.areaM2 > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t("_authenticatedReal-assets.k10002")}{" "}
                            <span className="num font-semibold text-foreground">
                              {fmtNum(asset.areaM2, 0)}
                            </span>{" "}
                            {t("realAssets.m1")}
                            {asset.lat != null && asset.lng != null
                              ? t("realAssets.m2", {
                                  a: fmtNum(asset.lat, 4),
                                  b: fmtNum(asset.lng, 4),
                                })
                              : ""}
                          </p>
                        )}
                        {asset.holdings.map((h) => {
                          const matured = h.maturityDate
                            ? new Date(h.maturityDate) <= new Date()
                            : false;
                          return (
                            <div key={h.id} className="rounded-xl border border-border/70 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <StatusBadge
                                  status={matured && h.status === "active" ? "matured" : h.status}
                                />
                                <span className="num text-xs font-bold text-gold">
                                  {fmtSAK(h.sakOwned, 2)}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p className="flex justify-between">
                                  <span>{t("_authenticatedReal-assets.k2")}</span>
                                  <span className="num font-semibold text-foreground">
                                    {h.purchasePricePerSakUsd > 0
                                      ? fmtUSD(h.purchasePricePerSakUsd)
                                      : "—"}
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span>{t("_authenticatedReal-assets.k3")}</span>
                                  <span className="num font-semibold text-foreground">
                                    {fmtDate(h.purchaseDate)}
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span>{t("_authenticatedReal-assets.k4")}</span>
                                  <span className="num font-semibold text-foreground">
                                    {fmtDate(h.maturityDate)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PortalShell>
  );
}

function Row({
  label,
  value,
  gold,
  subtitle,
}: {
  label: string;
  value: string;
  gold?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex flex-col items-end">
        <span className={`num font-semibold ${gold ? "text-gold" : "text-foreground"}`}>
          {value}
        </span>
        {subtitle && <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>}
      </span>
    </div>
  );
}
