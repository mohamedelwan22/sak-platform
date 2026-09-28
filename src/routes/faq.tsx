import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";
import { t } from "@/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: t("faq.k3") },
      {
        name: "description",
        content: t("faq.k4"),
      },
      { property: "og:title", content: t("faq.k5") },
      { property: "og:description", content: t("faq.k6") },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: t("faq.k7"),
    a: t("faq.k8"),
  },
  {
    q: t("faq.k9"),
    a: t("faq.k10"),
  },
  {
    q: t("faq.k11"),
    a: t("faq.k12"),
  },
  {
    q: t("faq.k13"),
    a: t("faq.k14"),
  },
  {
    q: t("faq.k15"),
    a: t("faq.k16"),
  },
  {
    q: t("faq.k17"),
    a: t("faq.k18"),
  },
  {
    q: t("faq.k19"),
    a: t("faq.k20"),
  },
] as const;

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow={t("faq.k1")} title={t("faq.k2")} />
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="card-luxe overflow-hidden !p-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-start font-semibold text-foreground"
                aria-expanded={open === i}
              >
                {f.q}
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gold transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <p className="px-6 pb-5 leading-relaxed text-muted-foreground">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
