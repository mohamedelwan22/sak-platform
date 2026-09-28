import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner } from "@/components/shared/ui-kit";
import { adminPhase04Api } from "@/api/phase04.api";
import { Save } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  ssr: false,
  component: AdminHomepage,
});

function AdminHomepage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "homepage"],
    queryFn: () => adminPhase04Api.homepage(),
  });
  const [form, setForm] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminPhase04Api.updateHomepage(body),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminHomepage.k5"));
      qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
      qc.invalidateQueries({ queryKey: ["homepage"] });
    },
    onError: () => toast.error(t("_authenticatedAdminHomepage.k6")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedAdminHomepage.k3")}>
        <Spinner />
      </PortalShell>
    );

  const cfg = data?.data?.data ?? {};

  return (
    <PortalShell title={t("_authenticatedAdminHomepage.k4")}>
      <div className="card-luxe mx-auto max-w-3xl space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-muted-foreground">
              {t("_authenticatedAdminHomepage.k10000")}
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroTitleAr ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroTitleAr: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Hero Title (EN)</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroTitleEn ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroTitleEn: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              {t("_authenticatedAdminHomepage.k10001")}
            </label>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroDescAr ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroDescAr: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Hero Description (EN)</label>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroDescEn ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroDescEn: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              {t("_authenticatedAdminHomepage.k1")}
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroCtaUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroCtaUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              {t("_authenticatedAdminHomepage.k2")}
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              defaultValue={cfg.heroImageUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, heroImageUrl: e.target.value }))}
            />
          </div>
        </div>

        <p className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          {t("_authenticatedAdminHomepage.k10000")}
        </p>

        <button
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          <Save className="inline h-4 w-4" /> {t("_authenticatedAdminHomepage.k10002")}
        </button>
      </div>
    </PortalShell>
  );
}
