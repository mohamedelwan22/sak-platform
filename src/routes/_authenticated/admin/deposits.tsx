import { createFileRoute } from "@tanstack/react-router";
import { AdminPaymentsPage } from "@/components/admin/AdminPaymentsPage";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  component: () => <AdminPaymentsPage type="deposit" title="طلبات الإيداع" />,
});
