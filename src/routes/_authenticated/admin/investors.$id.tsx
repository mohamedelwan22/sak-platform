import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge, StatsCard } from "@/components/shared/ui-kit";
import { adminPhase04Api } from "@/api/phase04.api";
import { fmtNum, fmtDateTime } from "@/lib/format";
import { Users, Wallet, TrendingUp, Shield, Calendar, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/investors/$id")({
  component: AdminInvestorsDetail,
});

function AdminInvestorsDetail() {
  const params = Route.useParams();
  const id = params.id;

  // Main investor data query
  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ["admin-investor", id],
    queryFn: async () => {
      const res = await adminPhase04Api.customerById(id);
      return res.data;
    },
    enabled: !!id,
  });

  // KYC data query
  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-kyc", id],
    queryFn: async () => {
      const res = await adminPhase04Api.kycList({ status: "all", page: 1, limit: 10 });
      return res.data.data?.find((k: any) => k.userId === id) || null;
    },
    enabled: !!id,
  });

  // Holdings query
  const { data: holdingsData, isLoading: holdingsLoading } = useQuery({
    queryKey: ["admin-holdings", id],
    queryFn: async () => {
      const res = await adminPhase04Api.holdings({ customerId: id, limit: 100 });
      return res.data;
    },
    enabled: !!id,
  });

  // Investment requests query
  const { data: investmentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-investment-requests", id],
    queryFn: async () => {
      const res = await adminPhase04Api.investmentRequests({ limit: 100, status: "all" });
      return res.data;
    },
    enabled: !!id,
  });

  if (investorLoading || kycLoading || holdingsLoading) {
    return (
      <PortalShell title="تفاصيل المستثمر">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </PortalShell>
    );
  }

  if (!investor) {
    return (
      <PortalShell title="تفاصيل المستثمر">
        <div className="card-luxe p-8 text-center">
          <p className="text-muted-foreground">لم يتم العثور على المستثمر</p>
        </div>
      </PortalShell>
    );
  }

  const stats: Array<{
    title: string;
    value: string | number;
    icon: typeof Wallet;
    variant: "default" | "gold" | "success" | "danger" | "warning" | "info";
  }> = [
    {
      title: "إجمالي الاستثمارات",
      value: fmtNum(investor.investmentCount || 0),
      icon: TrendingUp,
      variant: "gold" as const,
    },
    {
      title: "الرصيد الحالي",
      value: fmtNum(investor.walletBalance || 0) + " SAK",
      icon: Wallet,
      variant: "success" as const,
    },
    {
      title: "KYC الحالة",
      value: kycData?.status || "غير مكتمل",
      icon: Shield,
      variant:
        kycData?.status === "VERIFIED"
          ? "success"
          : kycData?.status === "REJECTED"
            ? "danger"
            : "warning",
    },
    {
      title: "تاريخ التسجيل",
      value: fmtDateTime(investor.createdAt),
      icon: Calendar,
      variant: "info" as const,
    },
  ];

  return (
    <PortalShell title="تفاصيل المستثمر">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {investor.firstName} {investor.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {investor.email} • {investor.phone || "لا يوجد هاتف"}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge
              status={
                investor.status === "active"
                  ? "success"
                  : investor.status === "suspended"
                    ? "warning"
                    : "destructive"
              }
              label={
                investor.status === "active"
                  ? "نشط"
                  : investor.status === "suspended"
                    ? "معلّق"
                    : "غير نشط"
              }
            />
            {investor.status === "inactive" && <StatusBadge status="secondary" label="غير نشط" />}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={String(stat.value)}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity Section */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-gold" />
            معلومات الهوية
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاسم الأول:</span>
              <span className="font-medium">{investor.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">اسم العائلة:</span>
              <span className="font-medium">{investor.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">البريد الإلكتروني:</span>
              <span className="font-mono text-xs">{investor.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهاتف:</span>
              <span>{investor.phone || "غير متوفر"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم SAK:</span>
              <span className="font-mono font-bold text-gold">{investor.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الانضمام:</span>
              <span>{fmtDateTime(investor.createdAt)}</span>
            </div>
          </div>

          {investor.deletedAt && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3">
              <p className="text-sm text-destructive">المستثمر محذوف.</p>
              <p className="text-xs text-muted-foreground">
                تم الحذف في {fmtDateTime(investor.deletedAt)}
              </p>
            </div>
          )}
        </div>

        {/* KYC Section */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-gold" />
            حالة KYC
          </h2>
          {kycLoading ? (
            <Spinner className="h-6 w-6" />
          ) : kycData ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">حالة التوثيق:</span>
                <StatusBadge status={kycData.status.toLowerCase()} label={kycData.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">نوع الوثيقة:</span>
                <span>{kycData.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ التقديم:</span>
                <span>{fmtDateTime(kycData.createdAt)}</span>
              </div>
              {kycData.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ المراجعة:</span>
                  <span>{fmtDateTime(kycData.reviewedAt)}</span>
                </div>
              )}
              {kycData.rejectionReason && (
                <div className="mt-3 rounded-lg bg-destructive/10 p-3">
                  <p className="text-sm font-semibold text-destructive">سبب الرفض:</p>
                  <p className="text-sm">{kycData.rejectionReason}</p>
                </div>
              )}
              {kycData.reviewedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تمت المراجعة بواسطة:</span>
                  <span>{kycData.reviewedBy}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">لم يتم تقديم طلب KYC</p>
              <StatusBadge status="secondary" label="غير مكتمل" />
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-gold" />
            الملخص المالي
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الرصيد الحالي:</span>
              <span className="font-bold text-gold">{fmtNum(investor.walletBalance || 0)} SAK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">إجمالي الاستثمارات:</span>
              <span className="font-medium">{investor.investmentCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">إجمالي القيمة:</span>
              <span className="font-medium">{fmtNum(investor.totalInvestmentValue || 0)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رسوم المنصة:</span>
              <span>{investor.brokerCommission || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">عدد الصفقات:</span>
              <span>{investor.transactionCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="card-luxe p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-gold" />
          الاستثمارات الحالية ({holdingsLoading ? "..." : holdingsData?.length || 0})
        </h2>
        {holdingsLoading ? (
          <Spinner className="h-6 w-6" />
        ) : holdingsData?.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {holdingsData.map((holding: any) => (
              <div
                key={holding.id}
                className="rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
              >
                <h3 className="font-semibold text-foreground">{holding.assetName}</h3>
                <p className="text-sm text-muted-foreground">{holding.assetType}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span>الكمية: {fmtNum(holding.quantity)}</span>
                  <span className="font-medium">{fmtNum(holding.value)} USD</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  تاريخ الاستحقاق: {fmtDateTime(holding.maturityDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد استثمارات حالية</p>
          </div>
        )}
      </div>

      {/* Investment Requests Section */}
      <div className="card-luxe p-6 mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-gold" />
          طلبات الاستثمار ({investmentRequests?.length || 0})
        </h2>
        {requestsLoading ? (
          <Spinner className="h-6 w-6" />
        ) : investmentRequests?.length ? (
          <div className="space-y-3">
            {investmentRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <h3 className="font-semibold">{request.projectName}</h3>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={request.status.toLowerCase()} label={request.status} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmtDateTime(request.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد طلبات استثمار</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
