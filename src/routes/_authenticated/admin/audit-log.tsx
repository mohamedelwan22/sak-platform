import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { History } from "lucide-react";

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
      <PortalShell title="سجل التدقيق">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title="سجل التدقيق">
      {rows.length === 0 ? (
        <EmptyState icon={History} title="لا توجد أحداث" />
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
                {a.success ? "نجاح" : "فشل"}
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
