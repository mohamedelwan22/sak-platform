import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { History } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  ssr: false,
  component: AdminAuditLog,
});

function AdminAuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => adminPhase04Api.auditLog(),
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedAdminAudit-log.k1")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title={t("_authenticatedAdminAudit-log.k2")}>
      {rows.length === 0 ? (
        <EmptyState icon={History} title={t("_authenticatedAdminAudit-log.k3")} />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div
              key={a.id}
              className="card-luxe flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span className="font-mono text-xs text-gold" dir="ltr">
                {a.action}
              </span>
              <span className="text-muted-foreground">{a.actorEmail}</span>
              <span className={a.success ? "text-success" : "text-destructive"}>
                {a.success
                  ? t("_authenticatedAdminAudit-log.k4")
                  : t("_authenticatedAdminAudit-log.k5")}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(a.createdAt ?? a.created_at ?? Date.now()).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
