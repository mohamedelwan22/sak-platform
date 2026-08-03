import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatsCard } from "@/components/shared/ui-kit";
import { adminDataApi } from "@/api/admin-data.api";
import { fmtUSD, fmtNum } from "@/lib/format";
import { apiClient } from "@/api/client";

export const Route = createFileRoute("/_authenticated/admin/profits")({
  component: AdminProfitsPage,
});

type PreviewItem = {
  holdingId: string;
  userId: string;
  userFullName: string;
  sakOwned: number;
  ownershipPercent: number;
  payoutUsd: number;
  payoutSak: number;
};

type Preview = {
  landId: string;
  landTitleEn: string;
  landTitleAr: string;
  totalSakInventory: number;
  totalSakOwned: number;
  totalProfitUsd: number;
  items: PreviewItem[];
};

function AdminProfitsPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedLandId, setSelectedLandId] = useState("");
  const [totalProfitUsd, setTotalProfitUsd] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const { data: lands, isLoading: landsLoading } = useQuery({
    queryKey: ["lands-list"],
    queryFn: async () => {
      const res = await adminDataApi.landList({ limit: 100 });
      const raw = res.data?.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
      return items as Array<{
        id: string;
        titleEn: string;
        titleAr: string;
        totalSakInventory: number;
        availableSak: number;
        status: string;
      }>;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await adminDataApi.profitDistributionPreview(
        selectedLandId,
        parseFloat(totalProfitUsd),
      );
      return res.data.data as Preview;
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep(4);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("No preview data");
      await adminDataApi.profitDistributionCreate({
        landId: selectedLandId,
        totalProfitUsd: parseFloat(totalProfitUsd),
        periodStart,
        periodEnd,
        payouts: preview.items.map((item) => ({
          userId: item.userId,
          holdingId: item.holdingId,
          ownershipPercent: item.ownershipPercent,
          payoutUsd: item.payoutUsd,
          payoutSak: item.payoutSak,
        })),
      });
    },
    onSuccess: () => {
      toast.success("تم توزيع الأرباح بنجاح");
      queryClient.invalidateQueries({ queryKey: ["profit-distributions"] });
      setStep(5);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedLand = lands?.find((l) => l.id === selectedLandId);
  const canProceedStep2 = selectedLandId && totalProfitUsd && parseFloat(totalProfitUsd) > 0;
  const canProceedStep3 = canProceedStep2 && periodStart && periodEnd;

  return (
    <PortalShell title="توزيع الأرباح">
      {landsLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatsCard
              title="خطوة الحالية"
              value={`${step}/5`}
              icon={TrendingUp}
              variant="gold"
            />
            <StatsCard
              title="الأراضي المتاحة"
              value={(lands?.length ?? 0).toString()}
              icon={TrendingUp}
              variant="info"
            />
            <StatsCard
              title="إجمالي آخر توزيع"
              value={preview ? `$${preview.totalProfitUsd.toFixed(2)}` : "-"}
              icon={TrendingUp}
              variant="success"
            />
          </div>

          {/* Step indicators */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  s === step
                    ? "bg-gold text-primary-foreground"
                    : s < step
                      ? "bg-gold/20 text-gold"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
            ))}
          </div>

          {/* Step 1: Select Land */}
          {step === 1 && (
            <div className="card-luxe">
              <h3 className="mb-4 text-lg font-bold">اختيار العقار</h3>
              {!lands?.length ? (
                <EmptyState
                  icon={TrendingUp}
                  title="لا توجد أراضي"
                  description="يجب إضافة أراضي أولاً"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lands.map((land) => (
                    <button
                      key={land.id}
                      onClick={() => setSelectedLandId(land.id)}
                      className={`rounded-xl border p-4 text-right transition-all ${
                        selectedLandId === land.id
                          ? "border-gold bg-gold/10"
                          : "border-border bg-secondary/40 hover:border-gold/50"
                      }`}
                    >
                      <p className="mb-1 font-medium">{land.titleAr}</p>
                      <p className="text-xs text-muted-foreground">{land.titleEn}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {fmtNum(land.totalSakInventory)} SAK
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedLandId}
                  className="flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  التالي
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Amount */}
          {step === 2 && (
            <div className="card-luxe">
              <h3 className="mb-4 text-lg font-bold">إدخال المبلغ</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                العقار: {selectedLand?.titleAr}
              </p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">إجمالي الأرباح (USD)</label>
                <input
                  type="number"
                  value={totalProfitUsd}
                  onChange={(e) => setTotalProfitUsd(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 rounded-xl border border-border px-6 py-2.5 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  السابق
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  التالي
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Period */}
          {step === 3 && (
            <div className="card-luxe">
              <h3 className="mb-4 text-lg font-bold">فترة التوزيع</h3>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">من تاريخ</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">إلى تاريخ</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 rounded-xl border border-border px-6 py-2.5 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  السابق
                </button>
                <button
                  onClick={() => previewMutation.mutate()}
                  disabled={!canProceedStep3 || previewMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {previewMutation.isPending ? "جاري التحميل..." : "معاينة التوزيع"}
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 4 && preview && (
            <div className="card-luxe">
              <h3 className="mb-4 text-lg font-bold">معاينة التوزيع</h3>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">العقار</p>
                  <p className="font-medium">{preview.landTitleAr}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">إجمالي الأرباح</p>
                  <p className="font-medium text-gold">${preview.totalProfitUsd.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">عدد المستثمرين</p>
                  <p className="font-medium">{preview.items.length}</p>
                </div>
              </div>

              <div className="card-luxe mb-4 overflow-x-auto !p-0">
                <table className="w-full min-w-120 text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-right">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">المستثمر</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">SAK</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">النسبة</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">USD</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">SAK الموزعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <tr key={item.holdingId} className="border-b border-border/50">
                        <td className="px-4 py-3">{item.userFullName}</td>
                        <td className="num px-4 py-3">{item.sakOwned}</td>
                        <td className="num px-4 py-3">{item.ownershipPercent.toFixed(2)}%</td>
                        <td className="num px-4 py-3 font-medium text-gold">
                          ${item.payoutUsd.toFixed(2)}
                        </td>
                        <td className="num px-4 py-3">{item.payoutSak.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 rounded-xl border border-border px-6 py-2.5 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  السابق
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {createMutation.isPending ? "جاري التوزيع..." : "تأكيد التوزيع (لا يمكن التراجع)"}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="card-luxe text-center">
              <div className="mb-4 text-6xl">✓</div>
              <h3 className="mb-2 text-xl font-bold text-gold">تم توزيع الأرباح بنجاح</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                تم إنشاء توزيع الأرباح وإرسال إشعارات للمستثمرين
              </p>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedLandId("");
                  setTotalProfitUsd("");
                  setPeriodStart("");
                  setPeriodEnd("");
                  setPreview(null);
                }}
                className="rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-primary-foreground"
              >
                توزيع جديد
              </button>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
