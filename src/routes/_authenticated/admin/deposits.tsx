import { createFileRoute } from "@tanstack/react-router";
import { AdminPaymentsPage } from "@/components/admin/AdminPaymentsPage";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  component: () => <AdminPaymentsPage type="deposit" title={t("_authenticatedAdminDeposits.k1")} />,
});
