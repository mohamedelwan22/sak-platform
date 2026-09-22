import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { brokerApi } from "@/api/phase04.api";
import { User } from "lucide-react";

export const Route = createFileRoute("/broker/profile")({
  ssr: false,
  component: BrokerProfile,
});

function BrokerProfile() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["broker", "me"],
    queryFn: () => brokerApi.me(),
  });
  const [form, setForm] = useState<Record<string, string>>({});

  const hasProfile = Boolean(data?.data?.data?.id);
  const profile = data?.data?.data;

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      hasProfile ? brokerApi.updateMe(body) : brokerApi.createProfile(body),
    onSuccess: () => {
      toast.success(hasProfile ? "تم تحديث الملف" : "تم إنشاء الملف");
      qc.invalidateQueries({ queryKey: ["broker", "me"] });
    },
    onError: () => toast.error("تعذر حفظ الملف"),
  });

  if (isLoading)
    return (
      <PortalShell title="ملف الوسيط">
        <Spinner />
      </PortalShell>
    );

  return (
    <PortalShell title="ملف الوسيط">
      <div className="card-luxe mx-auto max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-3">
          <User className="h-7 w-7 text-gold" />
          <h2 className="text-xl font-bold">{hasProfile ? "تعديل الملف" : "إنشاء ملف الوسيط"}</h2>
          {profile?.verificationStatus && <StatusBadge status={profile.verificationStatus} />}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">الاسم المعروض *</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              defaultValue={profile?.displayName ?? form.displayName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">الشركة</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              defaultValue={profile?.company ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">رقم الرخصة</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              defaultValue={profile?.licenseNumber ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">الهاتف</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              defaultValue={profile?.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">نبذة</label>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              defaultValue={profile?.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <button
            className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground w-full"
            disabled={save.isPending}
            onClick={() => save.mutate(form)}
          >
            {save.isPending ? "جار الحفظ..." : "حفظ"}
          </button>
        </div>

        {!hasProfile && (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            بعد تقديم الملف، يخضع للتحقق من قبل الإدارة قبل منحك صلاحيات الوسيط.
          </p>
        )}
      </div>
    </PortalShell>
  );
}
