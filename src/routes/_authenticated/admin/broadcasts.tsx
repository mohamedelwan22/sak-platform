import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send, Eye, Ban, Users, Loader2 } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, Pagination, StatusBadge } from "@/components/shared/ui-kit";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { t, translateApiError } from "@/i18n";
import { isSafeHttpUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  broadcastApi,
  type BroadcastDto,
  type BroadcastAudienceType,
  type BroadcastSegment,
  type BroadcastUserOption,
} from "@/api/broadcast.api";

export const Route = createFileRoute("/_authenticated/admin/broadcasts")({
  component: AdminBroadcastsPage,
});

interface BroadcastForm {
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  externalUrl: string;
  audienceType: BroadcastAudienceType;
  segmentKey: string;
  selectedUserIds: string[];
  showInTicker: boolean;
  isPublic: boolean;
  previewLang: "en" | "ar";
}

const emptyForm: BroadcastForm = {
  titleEn: "",
  titleAr: "",
  messageEn: "",
  messageAr: "",
  ctaLabelEn: "",
  ctaLabelAr: "",
  externalUrl: "",
  audienceType: "ALL_INVESTORS",
  segmentKey: "",
  selectedUserIds: [],
  showInTicker: true,
  isPublic: false,
  previewLang: "en",
};

const AUDIENCES: BroadcastAudienceType[] = [
  "ALL_INVESTORS",
  "ALL_BROKERS",
  "SPECIFIC_USERS",
  "SEGMENT",
];

function audienceLabel(a: string): string {
  return t(`broadcastAudience.${a}`);
}

function AdminBroadcastsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BroadcastForm | null>(null);
  const [page, setPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: list, isLoading } = useQuery({
    queryKey: ["admin-broadcasts", page],
    queryFn: async () => {
      const res = await broadcastApi.list({ page, limit: 15 });
      return res.data.data;
    },
  });

  const { data: segments } = useQuery({
    queryKey: ["broadcast-segments"],
    queryFn: async () => {
      const res = await broadcastApi.segments();
      return res.data.data;
    },
  });

  const { data: userOptions } = useQuery({
    queryKey: ["broadcast-users", userSearch],
    enabled: form?.audienceType === "SPECIFIC_USERS",
    queryFn: async () => {
      const res = await broadcastApi.users({ search: userSearch || undefined, limit: 20 });
      return res.data.data;
    },
  });

  const { data: preview } = useQuery({
    queryKey: [
      "broadcast-audience-preview",
      form?.audienceType,
      form?.segmentKey,
      form?.selectedUserIds,
    ],
    enabled: !!form,
    queryFn: async () => {
      const res = await broadcastApi.previewAudience({
        audienceType: form!.audienceType,
        targetUserIds: form!.audienceType === "SPECIFIC_USERS" ? form!.selectedUserIds : null,
        segmentKey: form!.audienceType === "SEGMENT" ? form!.segmentKey : null,
      });
      return res.data.data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-broadcast", detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const res = await broadcastApi.getById(detailId!);
      return res.data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-broadcast"] });
  };

  const create = useMutation({
    mutationFn: () =>
      broadcastApi.create({
        titleEn: form!.titleEn,
        titleAr: form!.titleAr,
        messageEn: form!.messageEn,
        messageAr: form!.messageAr,
        ctaLabelEn: form!.ctaLabelEn || null,
        ctaLabelAr: form!.ctaLabelAr || null,
        externalUrl: form!.externalUrl || null,
        audienceType: form!.audienceType,
        targetUserIds: form!.audienceType === "SPECIFIC_USERS" ? form!.selectedUserIds : null,
        segmentKey: form!.audienceType === "SEGMENT" ? form!.segmentKey : null,
        showInTicker: form!.showInTicker,
        isPublic: form!.isPublic,
      }),
    onSuccess: () => {
      toast.success(t("broadcast.createdToast"));
      setForm(null);
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "broadcast.createFailed")),
  });

  const send = useMutation({
    mutationFn: (id: string) => broadcastApi.send(id),
    onSuccess: (res: { data: { data: { recipientCount: number; failureCount: number } } }) => {
      toast.success(t("broadcast.sentToast", { v: fmtNum(res.data.data.recipientCount) }));
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "broadcast.sendFailedToast")),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => broadcastApi.cancel(id),
    onSuccess: () => {
      toast.success(t("broadcast.cancelledToast"));
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "broadcast.cancelFailedToast")),
  });

  const toggleTicker = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      broadcastApi.setTickerActive(input.id, input.active),
    onSuccess: () => {
      invalidate();
    },
    onError: (e) => toast.error(translateApiError(e, "errors.generic")),
  });

  // Mirrors the server rule (http/https only) so the operator gets immediate,
  // field-level feedback instead of only a generic 422 after submitting.
  const externalUrlError =
    form && form.externalUrl.trim().length > 0 && !isSafeHttpUrl(form.externalUrl.trim())
      ? t("broadcast.urlMustBeHttp")
      : null;

  const validForm =
    form &&
    form.titleEn.trim().length >= 3 &&
    form.titleAr.trim().length >= 3 &&
    form.messageEn.trim().length >= 3 &&
    form.messageAr.trim().length >= 3 &&
    !externalUrlError &&
    (form.audienceType !== "SPECIFIC_USERS" || form.selectedUserIds.length > 0) &&
    (form.audienceType !== "SEGMENT" || form.segmentKey !== "");

  const previewTitle = form ? (form.previewLang === "ar" ? form.titleAr : form.titleEn) : "";
  const previewMessage = form ? (form.previewLang === "ar" ? form.messageAr : form.messageEn) : "";
  const previewCta = form ? (form.previewLang === "ar" ? form.ctaLabelAr : form.ctaLabelEn) : "";

  const inp =
    "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold";

  return (
    <PortalShell title={t("broadcast.adminTitle")}>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setForm(form ? null : { ...emptyForm })}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {form ? t("common.cancel") : t("broadcast.newAnnouncement")}
        </button>
      </div>

      {/* Create form */}
      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">{t("broadcast.newAnnouncement")}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.titleEn")}
                  </span>
                  <input
                    value={form.titleEn}
                    onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    dir="ltr"
                    className={inp}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.titleAr")}
                  </span>
                  <input
                    value={form.titleAr}
                    onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                    dir="rtl"
                    className={inp}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.messageEn")}
                  </span>
                  <textarea
                    value={form.messageEn}
                    onChange={(e) => setForm({ ...form, messageEn: e.target.value })}
                    dir="ltr"
                    rows={4}
                    className={inp}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.messageAr")}
                  </span>
                  <textarea
                    value={form.messageAr}
                    onChange={(e) => setForm({ ...form, messageAr: e.target.value })}
                    dir="rtl"
                    rows={4}
                    className={inp}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.ctaLabelEn")} ({t("common.optional")})
                  </span>
                  <input
                    value={form.ctaLabelEn}
                    onChange={(e) => setForm({ ...form, ctaLabelEn: e.target.value })}
                    dir="ltr"
                    className={inp}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.ctaLabelAr")} ({t("common.optional")})
                  </span>
                  <input
                    value={form.ctaLabelAr}
                    onChange={(e) => setForm({ ...form, ctaLabelAr: e.target.value })}
                    dir="rtl"
                    className={inp}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">
                  {t("broadcast.externalUrl")} ({t("common.optional")})
                </span>
                <input
                  value={form.externalUrl}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                  placeholder="https://…"
                  dir="ltr"
                  aria-invalid={externalUrlError ? true : undefined}
                  className={cn(inp, externalUrlError && "border-destructive focus:border-destructive")}
                />
                {externalUrlError ? (
                  <span className="mt-1 block text-xs font-semibold text-destructive">
                    {externalUrlError}
                  </span>
                ) : null}
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.showInTicker}
                  onChange={(e) => setForm({ ...form, showInTicker: e.target.checked })}
                  className="h-4 w-4 accent-[#C9A84C]"
                />
                {t("broadcast.showInTicker")}
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="h-4 w-4 accent-[#C9A84C]"
                />
                {t("broadcast.isPublic")}
              </label>
            </div>

            {/* Audience + preview */}
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-foreground">
                  {t("broadcast.audience")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm({ ...form, audienceType: a })}
                      aria-pressed={form.audienceType === a}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        form.audienceType === a
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {audienceLabel(a)}
                    </button>
                  ))}
                </div>
              </div>

              {form.audienceType === "SEGMENT" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.segment")}
                  </span>
                  <select
                    value={form.segmentKey}
                    onChange={(e) => setForm({ ...form, segmentKey: e.target.value })}
                    className={inp}
                  >
                    <option value="">{t("broadcast.selectSegment")}</option>
                    {(segments ?? []).map((s: BroadcastSegment) => (
                      <option key={s.key} value={s.key}>
                        {form.previewLang === "ar" ? s.labelAr : s.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {form.audienceType === "SPECIFIC_USERS" && (
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">
                    {t("broadcast.selectUsers")}
                  </span>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t("broadcast.userSearchPlaceholder")}
                    className={inp}
                  />
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
                    {(userOptions ?? []).map((u: BroadcastUserOption) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary/50"
                      >
                        <input
                          type="checkbox"
                          checked={form.selectedUserIds.includes(u.id)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              selectedUserIds: e.target.checked
                                ? [...form.selectedUserIds, u.id]
                                : form.selectedUserIds.filter((id) => id !== u.id),
                            })
                          }
                          className="h-3.5 w-3.5 accent-[#C9A84C]"
                        />
                        <span className="font-semibold text-foreground">{u.name}</span>
                        <span className="text-muted-foreground" dir="ltr">
                          {u.email}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Audience count */}
              {preview && (
                <p className="flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-gold" />
                  {t("broadcast.audienceCount", { v: fmtNum(preview.count) })}
                </p>
              )}

              {/* Bilingual preview */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t("broadcast.preview")}
                  </span>
                  <div className="flex rounded-lg bg-secondary p-1">
                    {(["en", "ar"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setForm({ ...form, previewLang: lang })}
                        className={`rounded-md px-3 py-1 text-xs font-bold ${
                          form.previewLang === lang
                            ? "bg-gold-gradient text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {lang === "en" ? "EN" : "ع"}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  dir={form.previewLang === "ar" ? "rtl" : "ltr"}
                  className="rounded-xl border border-gold/30 bg-gold/5 p-4"
                >
                  <p className="flex items-center gap-2 font-bold text-foreground">
                    <Megaphone className="h-4 w-4 text-gold" />
                    {previewTitle || "…"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{previewMessage || "…"}</p>
                  {form.externalUrl && previewCta && (
                    <span className="mt-2 inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-gold">
                      {previewCta}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending || !validForm}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? t("common.loading") : t("broadcast.saveDraft")}
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detailId && detail && (
        <div className="card-luxe mb-8 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detail.status} />
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {audienceLabel(detail.audience_type)}
                </span>
                {detail.show_in_ticker && detail.ticker_active && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">
                    {t("broadcast.inTicker")}
                  </span>
                )}
                {detail.is_public && (
                  <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                    {t("broadcast.isPublic")}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-bold text-foreground" dir="ltr">
                {detail.title_en}
              </h2>
              <h2 className="font-bold text-foreground" dir="rtl">
                {detail.title_ar}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("broadcast.sentAt")}: {detail.sent_at ? fmtDateTime(detail.sent_at) : "—"} ·{" "}
                {t("broadcast.recipients")}: {fmtNum(detail.recipient_count)} ·{" "}
                {t("broadcast.failures")}: {fmtNum(detail.failure_count)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.status === "draft" && (
                <>
                  <button
                    onClick={() => send.mutate(detailId!)}
                    disabled={send.isPending}
                    className="flex items-center gap-2 bg-gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {send.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t("broadcast.sendNow")}
                  </button>
                  <button
                    onClick={() => cancel.mutate(detailId!)}
                    className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                  >
                    <Ban className="h-4 w-4" />
                    {t("broadcast.cancelBtn")}
                  </button>
                </>
              )}
              <button
                onClick={() =>
                  toggleTicker.mutate({ id: detailId!, active: !detail.ticker_active })
                }
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
              >
                {detail.ticker_active
                  ? t("broadcast.hideFromTicker")
                  : t("broadcast.showInTickerBtn")}
              </button>
            </div>
          </div>
          {detail.delivery.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detail.delivery.map((d) => (
                <span
                  key={d.status}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {t(`status.delivery_${d.status}`)}: {fmtNum(d.count)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <Spinner />
      ) : !list?.data?.length ? (
        <EmptyState
          icon={Megaphone}
          title={t("broadcast.emptyTitle")}
          description={t("broadcast.emptyDescription")}
        />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-140 text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">{t("broadcast.titleEn")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("broadcast.titleAr")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("broadcast.audience")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("common.status")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("broadcast.recipients")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("broadcast.sentAt")}</th>
              </tr>
            </thead>
            <tbody>
              {(list.data as BroadcastDto[]).map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setDetailId(b.id)}
                  className="cursor-pointer border-b border-border/50 hover:bg-secondary/40"
                >
                  <td
                    className="max-w-52 truncate px-5 py-3.5 font-semibold text-foreground"
                    dir="ltr"
                  >
                    {b.title_en}
                  </td>
                  <td className="max-w-52 truncate px-5 py-3.5 text-muted-foreground" dir="rtl">
                    {b.title_ar}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {audienceLabel(b.audience_type)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="num px-5 py-3.5 text-foreground">{fmtNum(b.recipient_count)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {b.sent_at ? fmtDateTime(b.sent_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list && list.totalPages > 1 && (
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          onPage={setPage}
        />
      )}
    </PortalShell>
  );
}
