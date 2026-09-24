import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge, StatsCard } from "@/components/shared/ui-kit";
import { adminPhase04Api } from "@/api/phase04.api";
import { fmtNum, fmtDateTime } from "@/lib/format";
import { Building, Wallet, FileText, Shield, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  component: AdminCustomerDetail,
});

function AdminCustomerDetail() {
  const params = Route.useParams();
  const id = params.id;
  const qc = useQueryClient();

  // Customer data query
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const res = await adminPhase04Api.customerById(id);
      return res.data;
    },
    enabled: !!id,
  });

  // Holdings query - customer investments
  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["admin-customer-holdings", id],
    queryFn: async () => {
      const res = await adminPhase04Api.holdings({ customerId: id, limit: 100 });
      return res.data;
    },
    enabled: !!id,
  });

  // KYC data query
  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-customer-kyc", id],
    queryFn: async () => {
      const res = await adminPhase04Api.kycList({ status: "all", page: 1, limit: 10 });
      return res.data.data?.find((k: any) => k.userId === id) || null;
    },
    enabled: !!id,
  });

  // Investment requests query
  const { data: investmentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-customer-requests", id],
    queryFn: async () => {
      const res = await adminPhase04Api.investmentRequests({ limit: 100, customerId: id });
      return res.data;
    },
    enabled: !!id,
  });

  if (customerLoading || holdingsLoading || kycLoading) {
    return (
      <PortalShell title="تفاصيل العميل">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </PortalShell>
    );
  }

  if (!customer) {
    return (
      <PortalShell title="تفاصيل العميل">
        <div className="card-luxe p-8 text-center">
          <p className="text-muted-foreground">لم يتم العثور على العميل</p>
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
      title: "إجمالي الأصول",
      value: fmtNum(holdings?.length || 0),
      icon: Building,
      variant: "info" as const,
    },
    {
      title: "إجمالي القيمة",
      value:
        fmtNum(holdings?.reduce((sum: number, h: any) => sum + (h.value || 0), 0) || 0) + " USD",
      icon: Wallet,
      variant: "gold" as const,
    },
    {
      title: "حالة KYC",
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
      title: "طلبات الاستثمار",
      value: investmentRequests?.length || 0,
      icon: FileText,
      variant: "info" as const,
    },
  ];

  return (
    <PortalShell title="تفاصيل العميل">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {customer.firstName} {customer.lastName}
        </h1>
        <p className="text-muted-foreground mt-1">
          {customer.email} • {customer.phone || "لا يوجد هاتف"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
        {/* Holdings Section */}
        <div className="card-luxe p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Building className="h-5 w-5 text-gold" />
            الأصول ({holdings?.length || 0})
          </h2>
          {holdings?.length ? (
            <div className="space-y-3">
              {holdings.map((holding: any) => (
                <div
                  key={holding.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{holding.assetName}</p>
                    <p className="text-sm text-muted-foreground">{holding.assetType}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      العميل ID: {holding.customerId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gold">{fmtNum(holding.quantity)} وحدة</p>
                    <p className="text-sm text-foreground">{fmtNum(holding.value)} USD</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      تاريخ الاستحقاق: {fmtDateTime(holding.maturityDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">لا توجد أصول مسجلة لهذا العميل</p>
          )}
        </div>

        {/* KYC Section */}
        <div className="card-luxe p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-gold" />
            حالة KYC
          </h2>
          {kycLoading ? (
            <Spinner className="h-6 w-6" />
          ) : kycData ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">الحالة:</span>
                <StatusBadge status={kycData.status.toLowerCase()} label={kycData.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">نوع الوثيقة:</span>
                <span>{kycData.documentType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">تاريخ التقديم:</span>
                <span>{fmtDateTime(kycData.createdAt)}</span>
              </div>
              {kycData.reviewedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">تاريخ المراجعة:</span>
                  <span>{fmtDateTime(kycData.reviewedAt)}</span>
                </div>
              )}
              {kycData.rejectionReason && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-semibold text-destructive">سبب الرفض:</p>
                  <p className="text-sm">{kycData.rejectionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لم يتم تقديم طلب KYC</p>
              <StatusBadge status="secondary" label="غير مكتمل" />
            </div>
          )}
        </div>
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
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{request.projectName}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>العميل ID: {request.customerId}</span>
                    <span>البلد: {request.country}</span>
                    <span>المدينة: {request.city}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
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
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">لا توجد طلبات استثمار لهذا العميل</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
