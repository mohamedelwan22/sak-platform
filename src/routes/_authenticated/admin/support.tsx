import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Paperclip, History, UserCheck, X } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, Pagination } from "@/components/shared/ui-kit";
import { fmtDateTime } from "@/lib/format";
import { t, translateApiError } from "@/i18n";
import { AttachmentLink } from "@/components/support/AttachmentLink";
import {
  supportApi,
  type SupportTicketSummary,
  type TicketStatus,
  type TicketPriority,
} from "@/api/support.api";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: AdminSupportPage,
});

const STATUS_CLS: Record<string, string> = {
  open: "bg-info/15 text-info",
  in_progress: "bg-warning/15 text-warning",
  waiting_for_investor: "bg-gold/15 text-gold",
  resolved: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_CLS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};

const TICKET_CATEGORIES = [
  "general",
  "account",
  "kyc",
  "investment",
  "payment",
  "withdrawal",
  "gold",
  "project",
  "technical",
  "other",
];

const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_for_investor",
  "resolved",
  "closed",
];

const TICKET_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

function statusLabel(status: string): string {
  return t(`status.ticket_${status}`);
}
function categoryLabel(category: string): string {
  return t(`ticketCategory.${category}`);
}
function priorityLabel(priority: string): string {
  return t(`priority.${priority}`);
}

function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatusFilter] = useState("");
  const [priority, setPriorityFilter] = useState("");
  const [category, setCategoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets", page, search, status, priority, category],
    queryFn: async () => {
      const res = await supportApi.adminList({
        page,
        limit: 15,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
      });
      return res.data.data;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-support-ticket", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await supportApi.adminGetById(selectedId!);
      return res.data.data;
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["admin-support-audit", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await supportApi.getAudit(selectedId!);
      return res.data.data;
    },
  });

  const { data: assignees } = useQuery({
    queryKey: ["admin-support-assignees"],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await supportApi.getAssignees();
      return res.data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin-support-ticket"] });
    queryClient.invalidateQueries({ queryKey: ["admin-support-audit"] });
  };

  const reply = useMutation({
    mutationFn: () => supportApi.reply(selectedId!, replyText, undefined, true),
    onSuccess: () => {
      toast.success(t("support.replySentToast"));
      setReplyText("");
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.replyFailed")),
  });

  const update = useMutation({
    mutationFn: (data: { status?: TicketStatus; priority?: TicketPriority }) =>
      supportApi.adminUpdate(selectedId!, data),
    onSuccess: () => {
      toast.success(t("support.statusUpdatedToast"));
      setNewPriority("");
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.statusFailed")),
  });

  const assign = useMutation({
    mutationFn: () => supportApi.adminAssign(selectedId!, assigneeId),
    onSuccess: () => {
      toast.success(t("support.assignedToast"));
      setAssigneeId("");
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.assignFailed")),
  });

  const detailStatus = detail?.status;

  return (
    <PortalShell title={t("support.adminTitle")}>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("support.searchPlaceholder")}
          className="w-64 rounded-xl border border-border bg-secondary/60 px-4 py-2 text-sm text-foreground outline-none focus:border-gold"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
        >
          <option value="">{t("support.allStatuses")}</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
        >
          <option value="">{t("support.allPriorities")}</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {priorityLabel(p)}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
        >
          <option value="">{t("support.allCategories")}</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Ticket detail panel */}
      {selectedId && (
        <div className="card-luxe mb-6 p-6">
          {detailLoading || !detail ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="num rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-gold"
                      dir="ltr"
                    >
                      {detail.ticket_number}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[detail.status]}`}
                    >
                      {statusLabel(detail.status)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_CLS[detail.priority]}`}
                    >
                      {priorityLabel(detail.priority)}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {categoryLabel(detail.category)}
                    </span>
                  </div>
                  <h2 className="mt-2 font-bold text-foreground">{detail.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("common.investor")}: {detail.user?.name} ({detail.user?.email})
                    {detail.assigned_to
                      ? ` · ${t("support.assignedTo")}: ${detail.assigned_to.name}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label={t("common.close")}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Conversation */}
              <div className="space-y-3">
                {detail.messages.map((m) => {
                  const isStaffMsg = m.sender_role === "admin" || m.sender_role === "super_admin";
                  return (
                    <article
                      key={m.id}
                      className={`rounded-xl border p-4 ${
                        isStaffMsg ? "border-gold/30 bg-gold/5" : "border-border bg-secondary/40"
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-foreground">
                          {isStaffMsg
                            ? t("support.team")
                            : (m.sender?.name ?? t("support.investorLabel"))}
                        </span>
                        <span className="text-muted-foreground">{fmtDateTime(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {m.body}
                      </p>
                      {m.attachments.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {m.attachments.map((a) => (
                            <li key={a.id}>
                              <AttachmentLink ticketId={detail.id} attachment={a} admin />
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Staff controls */}
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("support.replyPlaceholder")}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  />
                  <button
                    onClick={() => reply.mutate()}
                    disabled={
                      reply.isPending || replyText.trim().length < 1 || detailStatus === "closed"
                    }
                    className="mt-2 bg-gold-gradient rounded-lg px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {t("support.sendReply")}
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {t("support.changeStatus")}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TICKET_STATUSES.filter((s) => s !== detailStatus).map((s) => (
                        <button
                          key={s}
                          onClick={() => update.mutate({ status: s })}
                          disabled={update.isPending}
                          className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-40"
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {t("support.changePriority")}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold"
                      >
                        <option value="">{t("support.selectPriority")}</option>
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          newPriority && update.mutate({ priority: newPriority as TicketPriority })
                        }
                        disabled={update.isPending || !newPriority}
                        className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-40"
                      >
                        {t("common.save")}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {t("support.assignTo")}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold"
                      >
                        <option value="">{t("support.selectAssignee")}</option>
                        {(assignees ?? [])
                          .filter((a) => a.id !== detail.assigned_to?.id)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.role})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => assign.mutate()}
                        disabled={assign.isPending || !assigneeId}
                        className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-40"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {t("support.assign")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit history */}
              {audit && audit.data.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                    <History className="h-4 w-4 text-gold" />
                    {t("support.auditHistory")}
                  </h3>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 p-3">
                    {audit.data.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-foreground/90">
                          {t(`support.auditAction.${a.action.replace("support_ticket.", "")}`)}
                          {a.action === "support_ticket.status_changed" && a.newValues
                            ? ` → ${String((a.newValues as Record<string, unknown>).status ?? "")}`
                            : ""}
                        </span>
                        <span className="text-muted-foreground">
                          {a.actorEmail} · {fmtDateTime(a.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : !tickets?.data?.length ? (
        <EmptyState icon={LifeBuoy} title={t("support.adminEmptyTitle")} />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-140 text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">{t("support.ticketNumberCol")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.subject")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.investor")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.category")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.priority")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.status")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("support.assignedTo")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.updatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.data.map((tk: SupportTicketSummary) => (
                <tr
                  key={tk.id}
                  onClick={() => setSelectedId(tk.id)}
                  className="cursor-pointer border-b border-border/50 hover:bg-secondary/40"
                >
                  <td className="num px-5 py-3.5 font-bold text-gold" dir="ltr">
                    {tk.ticket_number}
                  </td>
                  <td className="max-w-56 truncate px-5 py-3.5 font-semibold text-foreground">
                    {tk.subject}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{tk.user?.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {categoryLabel(tk.category)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_CLS[tk.priority]}`}
                    >
                      {priorityLabel(tk.priority)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[tk.status]}`}
                    >
                      {statusLabel(tk.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {tk.assigned_to?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {fmtDateTime(tk.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tickets && tickets.totalPages > 1 && (
        <Pagination
          page={tickets.page}
          totalPages={tickets.totalPages}
          total={tickets.total}
          onPage={setPage}
        />
      )}
    </PortalShell>
  );
}
