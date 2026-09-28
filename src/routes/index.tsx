import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Coins, TrendingUp, MapPin } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { GoldTicker } from "@/components/GoldTicker";
import { SectionHeading, StatusBadge } from "@/components/shared/ui-kit";
import { goldQuery, configQuery, landsQuery, sakPrice } from "@/lib/queries";
import { publicApi } from "@/api/public.api";
import { fmtUSD, fmtNum } from "@/lib/format";
import { heroLand, landImage } from "@/lib/images";
import { t, getLanguage } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: t("home.k17") },
      {
        name: "description",
        content: t("home.k18"),
      },
    ],
  }),
  component: Landing,
});

const DEFAULT_HERO = {
  titleAr: (
    <>
      {t("hero.ownLine1")} <span className="text-gold-gradient">{t("hero.ownHighlight")}</span>
      <br />
      {t("hero.ownLine2")}
    </>
  ),
  titleEn: (
    <>
      {t("hero.ownLine1")} <span className="text-gold-gradient">{t("hero.ownHighlight")}</span>
      <br />
      {t("hero.ownLine2")}
    </>
  ),
  descAr: t("home.k19"),
  descEn: t("hero.descEn"),
  ctaAr: t("home.k20"),
  ctaEn: t("hero.ctaEn"),
  image: heroLand,
};

function Landing() {
  return (
    <PublicLayout>
      <Hero />
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <GoldTicker />
      </section>
      <HowItWorks />
      <FeaturedAssets />
      <Calculator />
      <FinalCta />
    </PublicLayout>
  );
}

function Hero() {
  const { data } = useQuery({ queryKey: ["homepage"], queryFn: () => publicApi.homepage() });
  const cfg = data?.data?.data ?? {};
  const lang = getLanguage();
  const isAr = lang === "ar";
  const title = isAr
    ? cfg.heroTitleAr || DEFAULT_HERO.titleAr
    : cfg.heroTitleEn || DEFAULT_HERO.titleEn;
  const desc = isAr ? cfg.heroDescAr || DEFAULT_HERO.descAr : cfg.heroDescEn || DEFAULT_HERO.descEn;
  const cta = isAr
    ? cfg.heroCtaTextAr || DEFAULT_HERO.ctaAr
    : cfg.heroCtaTextEn || DEFAULT_HERO.ctaEn;
  const image = cfg.heroImageUrl || DEFAULT_HERO.image;
  const ctaUrl = cfg.heroCtaUrl as string | undefined;

  return (
    <section className="relative overflow-hidden">
      <img
        src={image}
        alt={t("home.k6")}
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: "var(--gradient-navy)" }} />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start px-4 pt-28 pb-24 lg:px-8 lg:pt-40 lg:pb-36">
        {/* Premium announcement badge (Phase C) */}
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold tracking-wider text-gold backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
          {t("hero.badge")}
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-bold text-white md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{desc}</p>
        {ctaUrl ? (
          <a
            href={ctaUrl}
            className="bg-gold-gradient shadow-gold mt-10 rounded-xl px-8 py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {cta}
          </a>
        ) : (
          <Link
            to="/auth"
            search={{ mode: "register" }}
            className="bg-gold-gradient shadow-gold mt-10 rounded-xl px-8 py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {cta}
          </Link>
        )}
      </div>
    </section>
  );
}

const steps = [
  {
    icon: ShieldCheck,
    title: t("home.k21"),
    body: t("home.k22"),
  },
  {
    icon: Coins,
    title: t("home.k23"),
    body: t("home.k24"),
  },
  {
    icon: TrendingUp,
    title: t("home.k25"),
    body: t("home.k26"),
  },
] as const;

function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <SectionHeading eyebrow={t("home.k7")} title={t("home.k8")} />
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="card-luxe group p-7 transition-colors hover:border-gold/40">
            <div className="mb-5 flex items-center justify-between">
              <div className="rounded-xl bg-gold/15 p-3 text-gold">
                <s.icon className="h-6 w-6" />
              </div>
              <span className="num text-4xl font-bold text-muted-foreground/30">{`0${i + 1}`}</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedAssets() {
  const { data: lands } = useQuery(landsQuery);
  return (
    <section className="bg-secondary/60 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between">
          <SectionHeading eyebrow={t("home.k9")} title={t("home.k10")} />
          <Link
            to="/projects"
            className="mb-8 shrink-0 text-sm font-semibold text-gold hover:underline"
          >
            {t("home.m1")}
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(lands ?? [])
            .slice(0, 3)
            .map(
              (land: {
                id: string;
                title_ar: string;
                country: string;
                city: string;
                asset_type: string;
                expected_roi: number;
                maturity_months: number;
                total_sak_inventory: number;
                available_sak: number;
                status: string;
                cover_image_url: string | null;
              }) => (
                <LandCard key={land.id} land={land} />
              ),
            )}
        </div>
      </div>
    </section>
  );
}

export function LandCard({
  land,
}: {
  land: {
    id: string;
    title_ar: string;
    country: string;
    city: string;
    asset_type: string;
    expected_roi: number;
    maturity_months: number;
    total_sak_inventory: number;
    available_sak: number;
    status: string;
    cover_image_url: string | null;
  };
}) {
  const totalSak = Number(land.total_sak_inventory) || 0;
  const availableSak = Number(land.available_sak) || 0;
  const soldPct = totalSak > 0 ? Math.round(((totalSak - availableSak) / totalSak) * 100) : 0;
  return (
    <Link
      to="/assets/$landId"
      params={{ landId: land.id }}
      className="card-luxe group block overflow-hidden !p-0 transition-transform hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={landImage(land.cover_image_url)}
          alt={land.title_ar}
          loading="lazy"
          width={1024}
          height={683}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 start-3">
          <StatusBadge status={land.status} />
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-foreground">{land.title_ar}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {land.city}
          {t("home.k10001")} {land.country}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("home.k2")}</span>
          <span className="num font-bold text-success">{Number(land.expected_roi)}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("home.k3")}</span>
          <span className="num font-semibold text-foreground">
            {land.maturity_months} {t("common.monthSuffix")}
          </span>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("home.k4")}</span>
            <span className="num">{soldPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-gold-gradient h-full rounded-full"
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function Calculator() {
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);
  const [usd, setUsd] = useState(1000);

  const sak = price ? usd / price : null;
  const grams = config && sak != null ? sak * Number(config.sak_to_gold_ratio) : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <div className="card-luxe gold-ring grid gap-10 p-8 md:grid-cols-2 md:p-12">
        <div>
          <SectionHeading
            eyebrow={t("home.k11")}
            title={t("home.k12")}
            description={t("home.k13")}
          />
          <label className="mb-2 block text-sm font-semibold text-foreground" htmlFor="calc-usd">
            {t("home.k10003")}
          </label>
          <input
            id="calc-usd"
            type="number"
            min={0}
            value={usd}
            onChange={(e) => setUsd(Number(e.target.value))}
            className="num w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-gold"
          />
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={usd}
            onChange={(e) => setUsd(Number(e.target.value))}
            className="mt-4 w-full accent-[var(--gold)]"
          />
        </div>
        <div className="flex flex-col justify-center gap-4">
          <CalcRow label={t("home.k14")} value={sak != null ? fmtNum(sak, 2) : "…"} highlight />
          <CalcRow
            label={t("home.k15")}
            value={grams != null ? t("home.m1", { v: fmtNum(grams, 2) }) : "…"}
          />
          <CalcRow label={t("home.k16")} value={price != null ? fmtUSD(price) : "…"} />
        </div>
      </div>
    </section>
  );
}

function CalcRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-5 py-4 ${highlight ? "bg-gold/10 gold-ring" : "bg-secondary/60"}`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`num text-xl font-bold ${highlight ? "text-gold" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border/60 bg-secondary/60 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          {t("home.k10002")} <span className="text-gold-gradient">{t("home.k5")}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("home.k10004")}</p>
        <Link
          to="/auth"
          search={{ mode: "register" }}
          className="bg-gold-gradient shadow-gold mt-8 inline-block rounded-xl px-8 py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          {t("home.k10005")}
        </Link>
      </div>
    </section>
  );
}
