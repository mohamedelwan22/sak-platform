import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge } from "@/components/shared/ui-kit";
import { useSession, useProfile } from "@/hooks/useAuth";
import { submitKyc } from "@/lib/investor.functions";

export const Route = createFileRoute("/_authenticated/kyc")({
  component: KycPage,
});

const docTypes = [
  { value: "national_id", label: "بطاقة هوية وطنية", needsBack: true },
  { value: "passport", label: "جواز سفر", needsBack: false },
  { value: "driver_license", label: "رخصة قيادة", needsBack: true },
] as const;

function KycPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);

  const { data: lastSubmission } = useQuery({
    queryKey: ["kyc-last", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const status = profile?.kyc_status ?? "not_submitted";

  return (
    <PortalShell title="التحقق من الهوية">
      <div className="mx-auto max-w-2xl">
        <div className="card-luxe mb-6 flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold/15 p-3 text-gold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">حالة التحقق (KYC)</p>
              <p className="text-xs text-muted-foreground">مطلوب قبل الإيداع أو الاستثمار أو السحب</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "approved" ? (
          <div className="card-luxe gold-ring p-8 text-center">
            <p className="text-lg font-bold text-success">✓ تم اعتماد هويتك</p>
            <p className="mt-2 text-sm text-muted-foreground">يمكنك الآن الإيداع والاستثمار والسحب بحرية.</p>
          </div>
        ) : status === "pending" ? (
          <div className="card-luxe p-8 text-center">
            <p className="text-lg font-bold text-warning">طلبك قيد المراجعة</p>
            <p className="mt-2 text-sm text-muted-foreground">سيراجع فريقنا مستنداتك ويخطرك بالنتيجة قريباً.</p>
          </div>
        ) : (
          <>
            {status === "rejected" && lastSubmission?.rejection_reason && (
              <p className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                <strong>سبب الرفض السابق:</strong> {lastSubmission.rejection_reason}
              </p>
            )}
            <KycForm userId={userId} />
          </>
        )}
      </div>
    </PortalShell>
  );
}

function KycForm({ userId }: { userId?: string }) {
  const [docType, setDocType] = useState<(typeof docTypes)[number]>(docTypes[0]);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const submitFn = useServerFn(submitKyc);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("غير مسجل");
      if (!front || !selfie || (docType.needsBack && !back)) throw new Error("يرجى رفع كل الصور المطلوبة");

      async function upload(file: File, name: string) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`ملف ${name} أكبر من 8MB`);
        const path = `${userId}/${Date.now()}-${name}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
        if (error) throw new Error(error.message);
        return path;
      }

      const frontPath = await upload(front, "front");
      const backPath = docType.needsBack && back ? await upload(back, "back") : null;
      const selfiePath = await upload(selfie, "selfie");

      await submitFn({ data: { documentType: docType.value, frontPath, backPath, selfiePath } });
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب التحقق بنجاح");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-luxe space-y-5 p-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">نوع المستند</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {docTypes.map((d) => (
            <button
              key={d.value}
              onClick={() => setDocType(d)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${docType.value === d.value ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/40"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <FileField label="الوجه الأمامي للمستند" file={front} onChange={setFront} id="kyc-front" />
      {docType.needsBack && <FileField label="الوجه الخلفي للمستند" file={back} onChange={setBack} id="kyc-back" />}
      <FileField label="صورة سيلفي واضحة" file={selfie} onChange={setSelfie} id="kyc-selfie" />

      <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-50">
        {mutation.isPending ? "جارٍ الرفع والإرسال…" : "إرسال طلب التحقق"}
      </button>
    </div>
  );
}

function FileField({ label, file, onChange, id }: { label: string; file: File | null; onChange: (f: File | null) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-sm transition-colors ${file ? "border-gold/50 bg-gold/5 text-gold" : "border-border text-muted-foreground hover:border-gold/40"}`}
      >
        <Upload className="h-4.5 w-4.5" />
        {file ? file.name : "اضغط لاختيار صورة (JPG/PNG, حتى 8MB)"}
      </label>
      <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}
