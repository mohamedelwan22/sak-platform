import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";
import { goldBars } from "@/lib/images";
import { ShieldCheck, Scale, Eye, Repeat } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: t("about.k4") },
      {
        name: "description",
        content: t("about.k5"),
      },
      { property: "og:title", content: t("about.k6") },
      { property: "og:description", content: t("about.k7") },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: ShieldCheck,
    title: t("about.k8"),
    body: t("about.k9"),
  },
  {
    icon: Eye,
    title: t("about.k10"),
    body: t("about.k11"),
  },
  {
    icon: Scale,
    title: t("about.k12"),
    body: t("about.k13"),
  },
  {
    icon: Repeat,
    title: t("about.k14"),
    body: t("about.k15"),
  },
] as const;

function AboutPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow={t("about.k1")} title={t("about.k2")} />
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                {t("about.k10000")}
                {t("about.k10001")}
              </p>
              <p>
                <strong className="text-foreground">SAK100</strong> {t("about.k10000")}
                {t("about.k10002")}
                <span className="text-gold font-bold"> SAK </span>
                {t("about.k10003")}
                {t("about.k10004")}
              </p>
              <p>
                {t("about.k10005")}
                {t("about.k10006")}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <img
              src={goldBars}
              alt={t("about.k3")}
              loading="lazy"
              width={1024}
              height={768}
              className="w-full object-cover"
            />
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="card-luxe p-6">
              <div className="mb-4 w-fit rounded-xl bg-gold/15 p-3 text-gold">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
