import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Download } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatsCard } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { profileApi } from "@/api/profile.api";
import { fmtDateTime } from "@/lib/format";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/certificates")({
  component: CertificatesPage,
});

function CertificatesPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ["certificates", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.certificates();
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
        holdingId: string;
        filePath: string;
        generatedAt: string;
        holding: {
          sakOwned: number;
          purchasePricePerSakUsd: number;
          land: { titleEn: string; titleAr: string; country: string; city: string };
        };
      }>;
    },
  });

  const { data: holdings } = useQuery({
    queryKey: ["holdings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.holdings();
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
        sak_owned: number;
        land: { title_ar: string } | null;
      }>;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (holdingId: string) => {
      await profileApi.generateCertificate(holdingId);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedCertificates.k7"));
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const holdingsWithoutCert =
    holdings?.filter((h) => !certificates?.some((c) => c.holdingId === h.id)) ?? [];

  const handleDownload = async (certId: string) => {
    try {
      const res = await profileApi.downloadCertificate(certId);
      const data = res.data;
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error(t("_authenticatedCertificates.k8"));
    }
  };

  return (
    <PortalShell title={t("_authenticatedCertificates.k2")}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatsCard
              title={t("_authenticatedCertificates.k3")}
              value={(certificates?.length ?? 0).toString()}
              icon={Award}
              variant="gold"
            />
            <StatsCard
              title={t("_authenticatedCertificates.k4")}
              value={holdingsWithoutCert.length.toString()}
              icon={Award}
              variant="info"
            />
          </div>

          {holdingsWithoutCert.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {t("_authenticatedCertificates.k1")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {holdingsWithoutCert.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="mb-1 text-sm font-medium">{h.land?.title_ar}</p>
                    <p className="mb-3 text-xs text-muted-foreground">{h.sak_owned} SAK</p>
                    <button
                      onClick={() => generateMutation.mutate(h.id)}
                      disabled={generateMutation.isPending}
                      className="w-full rounded-lg bg-gold-gradient px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {generateMutation.isPending
                        ? t("_authenticatedCertificates.k9")
                        : t("_authenticatedCertificates.k10")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!certificates?.length ? (
            <EmptyState
              icon={Award}
              title={t("_authenticatedCertificates.k5")}
              description={t("_authenticatedCertificates.k6")}
            />
          ) : (
            <div className="card-luxe overflow-x-auto !p-0">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-start">
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedCertificates.k10000")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedCertificates.k10001")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedCertificates.k10002")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedCertificates.k10003")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedCertificates.k10004")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3.5">{cert.holding.land.titleAr}</td>
                      <td className="num px-5 py-3.5">{cert.holding.sakOwned}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {cert.holding.land.city}, {cert.holding.land.country}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {fmtDateTime(cert.generatedAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDownload(cert.id)}
                          className="flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t("_authenticatedCertificates.k10005")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
