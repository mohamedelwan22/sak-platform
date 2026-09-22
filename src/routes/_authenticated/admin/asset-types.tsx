import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { Layers, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/asset-types")({
  ssr: false,
  component: AdminAssetTypes,
});

function AdminAssetTypes() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "asset-types"],
    queryFn: () => adminPhase04Api.assetTypes({ limit: 100 }),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminPhase04Api.createAssetType(body),
    onSuccess: () => {
      toast.success("تم إنشاء نوع الأصل");
      setShowCreate(false);
      setForm({});
      qc.invalidateQueries({ queryKey: ["admin", "asset-types"] });
    },
    onError: () => toast.error("تعذر الإنشاء"),
  });

  if (isLoading)
    return (
      <PortalShell title="أنواع الأصول">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title="أنواع الأصول">
      <div className="mb-4 flex justify-end">
        <button
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="inline h-4 w-4" /> نوع جديد
        </button>
      </div>

      {showCreate && (
        <div className="card-luxe mb-4 grid gap-3 p-5 sm:grid-cols-2">
          <input
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
            placeholder="slug (مثال hotel)"
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <input
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
            placeholder="الاسم بالعربية"
            onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
          />
          <input
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
            placeholder="Name (EN)"
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
          />
          <button
            className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={create.isPending || !form.slug || !form.nameAr || !form.nameEn}
            onClick={() => create.mutate(form)}
          >
            حفظ
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="لا توجد أنواع أصول"
          description="أنشئ نوع أصل جديد وأضف حقولاً مخصصة له."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <div key={t.id} className="card-luxe p-4">
              <p className="font-semibold">{t.nameAr}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {t.slug}
              </p>
              <p className="mt-2 text-xs text-gold">{t.fieldCount ?? 0} حقول</p>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
