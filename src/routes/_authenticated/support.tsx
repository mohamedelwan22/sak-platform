import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { LifeBuoy, PlusCircle, Paperclip, ArrowRight, X, Send } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, Pagination } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDateTime } from "@/lib/format";
import { t, translateApiError } from "@/i18n";
import { AttachmentLink } from "@/components/support/AttachmentLink";
import {
  supportApi,
  type SupportTicketDetail,
  type SupportTicketSummary,
  type TicketStatus,
} from "@/api/support.api";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
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

const TICKET_CATEGORIES: Array<{ key: string }> = [
  { key: "general" },
  { key: "account" },
  { key: "kyc" },
  { key: "investment" },
  { key: "payment" },
  { key: "withdrawal" },
  { key: "gold" },
  { key: "project" },
  { key: "technical" },
  { key: "other" },
];

const TICKET_STATUSES: Array<{ key: TicketStatus }> = [
  { key: "open" },
  { key: "in_progress" },
  { key: "waiting_for_investor" },
  { key: "resolved" },
  { key: "closed" },
];

function statusLabel(status: string): string {
  return t(`status.ticket_${status}`);
}

function categoryLabel(category: string): string {
  return t(`ticketCategory.${category}`);
}

function priorityLabel(priority: string): string {
  return t(`priority.${priority}`);
}

function SupportPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ category: string; subject: string; message: string }>({
    category: "general",
    subject: "",
    message: "",
  });
  const [replyText, setReplyText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", page, statusFilter, categoryFilter],
    enabled: !!userId,
    queryFn: async () => {
      const res = await supportApi.list({
        page,
        limit: 10,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      return res.data.data;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["support-ticket", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await supportApi.getById(selectedId!);
      return res.data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["support-ticket"] });
  };

  const createTicket = useMutation({
    mutationFn: () =>
      supportApi.create({
        category: form.category,
        subject: form.subject,
        message: form.message,
        files: pendingFiles,
      }),
    onSuccess: () => {
      toast.success(t("support.createdToast"));
      setCreating(false);
      setForm({ category: "general", subject: "", message: "" });
      setPendingFiles([]);
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.createFailed")),
  });

  const sendReply = useMutation({
    mutationFn: () => supportApi.reply(selectedId!, replyText, pendingFiles),
    onSuccess: () => {
      toast.success(t("support.replySentToast"));
      setReplyText("");
      setPendingFiles([]);
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.replyFailed")),
  });

  const setStatus = useMutation({
    mutationFn: (status: TicketStatus) => supportApi.setStatus(selectedId!, status),
    onSuccess: () => {
      toast.success(t("support.statusUpdatedToast"));
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "support.statusFailed")),
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...pendingFiles, ...Array.from(list)].slice(0, 5);
    setPendingFiles(next);
  }

  const canReply = detail && detail.status !== "closed";
  const canReopen = detail && (detail.status === "resolved" || detail.status === "closed");

  return (
    <PortalShell title={t("support.pageTitle")}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">{t("support.allStatuses")}</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {statusLabel(s.key)}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">{t("support.allCategories")}</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {categoryLabel(c.key)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <PlusCircle className="h-4 w-4" />
          {t("support.newTicket")}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card-luxe gold-ring mb-6 p-6">
          <h2 className="mb-5 font-bold text-foreground">{t("support.newTicket")}</h2>
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("support.category")}
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {categoryLabel(c.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("support.subject")}
              </span>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={t("support.subjectPlaceholder")}
                maxLength={255}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("support.message")}
              </span>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={t("support.messagePlaceholder")}
                rows={5}
                maxLength={8000}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-foreground">
                {t("support.attachments")} ({t("support.attachmentsHint")})
              </span>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm font-semibold text-foreground hover:border-gold"
              >
                <Paperclip className="h-4 w-4" />
                {t("support.attachFiles")}
              </button>
              {pendingFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setPendingFiles(pendingFiles.filter((_, j) => j !== i))}
                        aria-label={t("common.delete")}
                        className="text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => createTicket.mutate()}
              disabled={
                createTicket.isPending ||
                form.subject.trim().length < 3 ||
                form.message.trim().length < 1
              }
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {createTicket.isPending ? t("common.loading") : t("support.submitTicket")}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Ticket detail (conversation) */}
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
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canReopen && (
                    <button
                      onClick={() => setStatus.mutate("open")}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                    >
                      {t("support.reopen")}
                    </button>
                  )}
                  {canReply && detail.status !== "closed" && (
                    <button
                      onClick={() => setStatus.mutate("closed")}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                    >
                      {t("support.closeTicket")}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label={t("common.close")}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Conversation */}
              <div className="space-y-3">
                {detail.messages.map((m) => {
                  const isStaff = m.sender_role === "admin" || m.sender_role === "super_admin";
                  return (
                    <article
                      key={m.id}
                      className={`rounded-xl border p-4 ${
                        isStaff ? "border-gold/30 bg-gold/5" : "border-border bg-secondary/40"
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-foreground">
                          {isStaff ? t("support.team") : (m.sender?.name ?? t("support.you"))}
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
                              <AttachmentLink ticketId={detail.id} attachment={a} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Reply box */}
              {canReply && (
                <div className="mt-5">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("support.replyPlaceholder")}
                    rows={3}
                    maxLength={8000}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      onChange={(e) => addFiles(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {t("support.attachFiles")}
                    </button>
                    <button
                      onClick={() => sendReply.mutate()}
                      disabled={sendReply.isPending || replyText.trim().length < 1}
                      className="ms-auto flex items-center gap-2 bg-gold-gradient rounded-lg px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {t("support.sendReply")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Ticket list */}
      {isLoading ? (
        <Spinner />
      ) : !tickets?.data?.length ? (
        <EmptyState
          icon={LifeBuoy}
          title={t("support.emptyTitle")}
          description={t("support.emptyDescription")}
        />
      ) : (
        <div className="space-y-3">
          {tickets.data.map((tk: SupportTicketSummary) => (
            <button
              key={tk.id}
              type="button"
              onClick={() => setSelectedId(tk.id)}
              className="card-luxe flex w-full flex-wrap items-center justify-between gap-4 p-5 text-start transition-colors hover:border-gold/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="num rounded bg-secondary px-2 py-0.5 text-xs font-bold text-gold"
                    dir="ltr"
                  >
                    {tk.ticket_number}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[tk.status]}`}
                  >
                    {statusLabel(tk.status)}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {categoryLabel(tk.category)}
                  </span>
                </div>
                <span className="mt-1.5 block truncate font-bold text-foreground">
                  {tk.subject}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("common.updatedAt")}: {fmtDateTime(tk.updated_at)} ·{" "}
                  {t("support.messageCount", { v: tk.message_count })}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
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
