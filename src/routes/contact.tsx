import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — SAK100" },
      {
        name: "description",
        content: "فريق SAK100 جاهز للإجابة عن استفساراتك حول الاستثمار والمنصة.",
      },
      { property: "og:title", content: "تواصل معنا — SAK100" },
      { property: "og:description", content: "تواصل مع فريق SAK100." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <SectionHeading
          eyebrow="تواصل معنا"
          title="نحن هنا لمساعدتك"
          description="أرسل استفسارك وسيرد عليك فريقنا في أقرب وقت."
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="card-luxe flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gold/15 p-3 text-gold">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="num font-semibold text-foreground">support@sak100.com</p>
              </div>
            </div>
            <div className="card-luxe flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gold/15 p-3 text-gold">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">للمستثمرين المسجلين</p>
                <p className="font-semibold text-foreground">تذاكر الدعم من داخل لوحة التحكم</p>
              </div>
            </div>
          </div>

          {sent ? (
            <div className="card-luxe gold-ring flex flex-col items-center justify-center p-10 text-center">
              <p className="text-lg font-bold text-gold">تم استلام رسالتك ✓</p>
              <p className="mt-2 text-sm text-muted-foreground">
                سنتواصل معك قريباً على بريدك الإلكتروني.
              </p>
            </div>
          ) : (
            <form
              className="card-luxe space-y-4 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                toast.success("تم إرسال رسالتك");
              }}
            >
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                  htmlFor="c-name"
                >
                  الاسم
                </label>
                <input
                  id="c-name"
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground outline-none focus:border-gold"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                  htmlFor="c-email"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="c-email"
                  type="email"
                  required
                  maxLength={255}
                  className="num w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground outline-none focus:border-gold"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                  htmlFor="c-msg"
                >
                  رسالتك
                </label>
                <textarea
                  id="c-msg"
                  required
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground outline-none focus:border-gold"
                />
              </div>
              <button
                type="submit"
                className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground"
              >
                إرسال
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
