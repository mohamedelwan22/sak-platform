import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — SAK100" },
      {
        name: "description",
        content: "إجابات عن أكثر الأسئلة شيوعاً حول وحدات SAK والاستثمار والسحب والأرباح.",
      },
      { property: "og:title", content: "الأسئلة الشائعة — SAK100" },
      { property: "og:description", content: "كل ما تريد معرفته عن الاستثمار عبر SAK100." },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "ما هي وحدة SAK؟",
    a: "SAK هي وحدة ملكية رقمية داخلية تعادل 0.1 جرام ذهب. عند شرائك وحدات SAK في أرض معينة فأنت تمتلك حصة حقيقية موثقة من ذلك الأصل.",
  },
  {
    q: "هل SAK عملة مشفرة؟",
    a: "لا. SAK ليست عملة مشفرة ولا تُتداول خارج المنصة — هي وحدة محاسبية داخلية تمثل ملكية حقيقية مرتبطة بسعر الذهب.",
  },
  {
    q: "كيف يُحسب سعر وحدة SAK؟",
    a: "السعر ديناميكي دائماً: سعر جرام الذهب العالمي × 0.1. لا توجد أسعار ثابتة، ويتحدث السعر بشكل دوري.",
  },
  {
    q: "متى أستطيع بيع حصتي؟",
    a: "بعد انتهاء مدة الاستحقاق (12 شهراً للأراضي، حتى 36 شهراً للفنادق والمنتجعات) يمكنك طلب بيع حصتك في السوق الداخلي.",
  },
  {
    q: "كيف أسحب أموالي؟",
    a: "تقدم طلب سحب من محفظتك، ويُحوَّل المبلغ بنفس وسيلة الإيداع التي استخدمتها (قاعدة مكافحة غسل الأموال) بعد موافقة الإدارة.",
  },
  {
    q: "هل الاستثمار مضمون؟",
    a: "لا يوجد استثمار بلا مخاطر. لكن ربط القيمة بالذهب والتوثيق القانوني الكامل للأصول يقللان المخاطر بشكل كبير. اقرأ تفاصيل كل أصل ومستوى مخاطره قبل الاستثمار.",
  },
  {
    q: "ما هي رسوم المنصة؟",
    a: "لا رسوم على الشراء المباشر من المنصة. عند بيع حصتك في السوق الداخلي تُخصم رسوم 2% من قيمة البيع من البائع فقط.",
  },
] as const;

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="مركز المساعدة" title="الأسئلة الشائعة" />
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="card-luxe overflow-hidden !p-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-right font-semibold text-foreground"
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
