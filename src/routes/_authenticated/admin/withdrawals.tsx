import { createFileRoute } from "@tanstack/react-router";
import { AdminPaymentsPage } from "@/components/admin/AdminPaymentsPage";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: () => <AdminPaymentsPage type="withdrawal" title="طلبات السحب" />,
});
