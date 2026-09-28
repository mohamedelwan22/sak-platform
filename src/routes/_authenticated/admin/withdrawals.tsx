import { createFileRoute } from "@tanstack/react-router";
import { AdminPaymentsPage } from "@/components/admin/AdminPaymentsPage";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: () => (
    <AdminPaymentsPage type="withdrawal" title={t("_authenticatedAdminWithdrawals.k1")} />
  ),
});
