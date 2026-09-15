import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, PlusCircle, Send, ArrowRight, X } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDateTime } from "@/lib/format";
import { supportApi, type SupportTicketDetail, type SupportTicketSummary } from "@/api/support.api";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "general", label: "استفسار عام" },
  { key: "deposit", label: "إيداع" },
  { key: "withdrawal", label: "سحب" },
  { key: "buy", label: "شراء SAK" },
  { key: "sell", label: "بيع SAK" },
  { key: "kyc", label: "التحقق من الهوية" },
  { key: "technical", label: "مشكلة تقنية" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

const STATUS_CLS: Record<string, string> = {
  open: "bg-success/15 text-success",
  in_progress: "bg-warning/15 text-warning",
  resolved: "bg-info/15 text-info",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_CLS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-info/15 text-info",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};

function SupportPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["support-tickets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await supportApi.list();
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

  const tickets: SupportTicketSummary[] = data?.data ?? [];

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["support-ticket", selectedId] });
  }

  const createMutation = useMutation({
    mutationFn: () => supportApi.create({ subject, category, body }),
    onSuccess: (res) => {
      toast.success("تم إنشاء التذكرة بنجاح");
      setShowCreate(false);
      setSubject("");
      setBody("");
      setCategory("general");
      setSelectedId(res.data.data.id);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "تعذر إنشاء التذكرة");
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => supportApi.reply(selectedId!, reply),
    onSuccess: () => {
      toast.success("تم إرسال الرد");
      setReply("");
      afterMutation();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "تعذر إرسال الرد");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => supportApi.close(selectedId!),
    onSuccess: () => {
      toast.success("تم إغلاق التذكرة");
      afterMutation();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "تعذر إغلاق التذكرة");
    },
  });

  function openCreate() {
    setShowCreate((v) => !v);
    setSelectedId(null);
  }

  return (
    <PortalShell title="الدعم والتذاكر">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          أنشئ تذكرة دعم وفريقنا سيرد عليك في أقرب وقت.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="bg-gold-gradient flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {showCreate ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
          {showCreate ? "إلغاء" : "إنشاء تذكرة جديدة"}
        </button>
      </div>

      {showCreate && (
        <div className="card-luxe mb-6 p-6">
          <h2 className="mb-4 font-bold text-foreground">تذكرة جديدة</h2>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              الموضوع
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="وصف مختصر للاستفسار"
              className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              التصنيف
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              الرسالة
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="اشرح المشكلة أو الاستفسار بالتفصيل…"
              className="w-full resize-y rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!subject.trim() || subject.trim().length < 3) {
                toast.error("الموضوع مطلوب (3 أحرف على الأقل)");
                return;
              }
              if (!body.trim()) {
                toast.error("اكتب رسالة التذكرة");
                return;
              }
              createMutation.mutate();
            }}
            disabled={createMutation.isPending}
            className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {createMutation.isPending ? "جارٍ الإرسال…" : "إرسال التذكرة"}
          </button>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !tickets.length ? (
        <EmptyState
          icon={LifeBuoy}
          title="لا توجد تذاكر بعد"
          description="ابدأ بإنشاء تذكرة دعم وسيظهر هنا سجلها وردود الفريق."
        />
      ) : selectedId ? (
        <TicketDetail
          detail={detail}
          detailLoading={detailLoading}
          reply={reply}
          setReply={setReply}
          onBack={() => setSelectedId(null)}
          onSend={() => {
            if (!reply.trim()) {
              toast.error("اكتب رسالة الرد أولاً");
              return;
            }
            replyMutation.mutate();
          }}
          sending={replyMutation.isPending}
          onClose={() => {
            closeMutation.mutate();
          }}
          closing={closeMutation.isPending}
        />
      ) : (
        <div className="grid gap-4">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className="card-luxe flex w-full items-center justify-between gap-4 p-5 text-start transition-colors hover:border-gold/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{t.subject}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[t.status] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.key === t.category)?.label ?? t.category}
                  {t.message_count > 0 ? ` · ${t.message_count} رسالة` : " · تذاكر جديدة"} ·{" "}
                  {fmtDateTime(t.updated_at)}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

function TicketDetail({
  detail,
  detailLoading,
  reply,
  setReply,
  onBack,
  onSend,
  sending,
  onClose,
  closing,
}: {
  detail: SupportTicketDetail | undefined;
  detailLoading: boolean;
  reply: string;
  setReply: (v: string) => void;
  onBack: () => void;
  onSend: () => void;
  sending: boolean;
  onClose: () => void;
  closing: boolean;
}) {
  const canReply = !!detail && (detail.status === "open" || detail.status === "in_progress");

  return (
    <div className="card-luxe p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" /> عودة للتذاكر
      </button>

      {detailLoading || !detail ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{detail.subject}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[detail.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {STATUS_LABELS[detail.status] ?? detail.status}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_CLS[detail.priority] ?? "bg-muted text-muted-foreground"}`}
            >
              أولوية {PRIORITY_LABELS[detail.priority] ?? detail.priority}
            </span>
          </div>
          <p className="mb-6 text-xs text-muted-foreground">
            {CATEGORIES.find((c) => c.key === detail.category)?.label ?? detail.category} ·{" "}
            {fmtDateTime(detail.created_at)}
          </p>

          <div className="space-y-3">
            {detail.messages.map((m) => {
              const mine = m.sender?.id === detail.user?.id;
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    mine
                      ? "self-start rounded-tr-sm bg-secondary text-foreground"
                      : "mr-auto rounded-tl-sm bg-gold/10 text-foreground"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-gold">
                      {m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "الفريق"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {fmtDateTime(m.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              );
            })}
          </div>

          {canReply ? (
            <>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="اكتب ردك…"
                className="mt-5 w-full resize-y rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sending}
                  className="bg-gold-gradient flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "جارٍ الإرسال…" : "إرسال الرد"}
                </button>
                {detail.status !== "closed" && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={closing}
                    className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    {closing ? "جارٍ الإغلاق…" : "إغلاق التذكرة"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
              التذكرة {detail.status === "resolved" ? "محلولة" : "مغلقة"} — لا يمكن إضافة ردود
              جديدة.
            </p>
          )}
        </>
      )}
    </div>
  );
}
