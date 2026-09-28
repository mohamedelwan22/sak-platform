import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading } from "@/components/shared/ui-kit";
import { t } from "@/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: t("contact.k8") },
      {
        name: "description",
        content: t("contact.k9"),
      },
      { property: "og:title", content: t("contact.k10") },
      { property: "og:description", content: t("contact.k11") },
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
          eyebrow={t("contact.k5")}
          title={t("contact.k6")}
          description={t("contact.k7")}
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="card-luxe flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gold/15 p-3 text-gold">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("contact.k1")}</p>
                <p className="num font-semibold text-foreground">support@sak100.com</p>
              </div>
            </div>
            <div className="card-luxe flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gold/15 p-3 text-gold">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("contact.k2")}</p>
                <p className="font-semibold text-foreground">{t("contact.k3")}</p>
              </div>
            </div>
          </div>

          {sent ? (
            <div className="card-luxe gold-ring flex flex-col items-center justify-center p-10 text-center">
              <p className="text-lg font-bold text-gold">{t("contact.k4")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("contact.k10000")}</p>
            </div>
          ) : (
            <form
              className="card-luxe space-y-4 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                toast.success(t("contact.k12"));
              }}
            >
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                  htmlFor="c-name"
                >
                  {t("contact.k10001")}
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
                  {t("contact.k10002")}
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
                  {t("contact.k10003")}
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
                {t("contact.k10004")}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
