import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";
import { goldBars } from "@/lib/images";
import { ShieldCheck, Scale, Eye, Repeat } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — SAK100" },
      { name: "description", content: "SAK100 منصة استثمار رقمية تتيح ملكية موثقة في أصول حقيقية بوحدات SAK المرتبطة بسعر الذهب." },
      { property: "og:title", content: "من نحن — SAK100" },
      { property: "og:description", content: "منصة الاستثمار في الأصول الحقيقية المرتبطة بالذهب." },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: ShieldCheck, title: "أمان أولاً", body: "توثيق قانوني كامل لكل أصل، وأنظمة حماية مصرفية المستوى لبياناتك وأموالك." },
  { icon: Eye, title: "شفافية كاملة", body: "كل رقم تراه محسوب لحظياً من مصادر حية — لا أرقام وهمية ولا وعود مبهمة." },
  { icon: Scale, title: "استقرار ذهبي", body: "ربط قيمة SAK بالذهب يحمي استثمارك من تقلبات العملات والتضخم." },
  { icon: Repeat, title: "سيولة حقيقية", body: "بعد فترة الاستحقاق يمكنك بيع حصتك في السوق الداخلي لمستثمرين آخرين." },
] as const;

function AboutPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="من نحن" title="نجعل الاستثمار في الأصول الحقيقية متاحاً للجميع" />
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                يعاني المستثمرون الأفراد من صعوبة الوصول إلى الاستثمار العقاري الحقيقي: حد أدنى مرتفع، تعقيد قانوني، غياب شفافية،
                وانعدام سيولة.
              </p>
              <p>
                <strong className="text-foreground">SAK100</strong> تحل ذلك عبر التجزئة الرقمية: كل أرض تُقسَّم إلى وحدات
                <span className="text-gold font-bold"> SAK </span>
                قابلة للشراء بمبالغ صغيرة، وكل وحدة تعادل 0.1 جرام ذهب — فقيمة استثمارك مستقرة ومحمية.
              </p>
              <p>SAK ليست عملة مشفرة — هي وحدة ملكية رقمية محاسبية داخلية، موثقة بعقود ملكية رقمية موقعة من محامي الشركة.</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <img src={goldBars} alt="سبائك ذهب" loading="lazy" width={1024} height={768} className="w-full object-cover" />
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
