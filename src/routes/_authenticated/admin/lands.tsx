import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge, StatsCard } from "@/components/shared/ui-kit";
import {
  adminListLands,
  adminSaveLand,
  adminDeleteLand,
  adminListProjects,
  adminGetAssetType,
  adminGetLandFieldValues,
  adminSaveLandFieldValues,
  type AdminLandItem,
  type AssetTypeDetail,
  type AssetTypeFieldDef,
} from "@/lib/admin.functions";
import { fmtNum } from "@/lib/format";
import { Landmark, MapPin, Plus, X, Image, FileText, ExternalLink } from "lucide-react";

const searchSchema = z.object({ projectId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/admin/lands")({
  validateSearch: searchSchema,
  component: AdminLandsPage,
});

type LandForm = {
  id?: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  asset_type: "land" | "hotel" | "mall" | "warehouse" | "resort" | "agricultural";
  country: string;
  city: string;
  area_m2: number;
  total_sak_inventory: number;
  available_sak: number;
  maturity_months: number;
  expected_roi: number;
  risk_level: "none" | "low" | "medium" | "high";
  cover_image_url: string;
  gallery: string[];
  documents: string[];
  lat: string;
  lng: string;
  status: "draft" | "active" | "partially_sold" | "sold_out" | "closed";
  project_id: string;
  use_type: "" | "agricultural" | "commercial" | "industrial" | "mixed";
  cultivation_status: "" | "cultivated" | "uncultivated" | "partial";
  acquisition_date: string;
  public_details_url: string;
  google_maps_url: string;
};

const emptyForm: LandForm = {
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  asset_type: "land",
  country: "",
  city: "",
  area_m2: 0,
  total_sak_inventory: 10000,
  available_sak: 10000,
  maturity_months: 12,
  expected_roi: 12,
  risk_level: "low",
  cover_image_url: "",
  gallery: [],
  documents: [],
  lat: "",
  lng: "",
  status: "draft",
  project_id: "",
  use_type: "",
  cultivation_status: "",
  acquisition_date: "",
  public_details_url: "",
  google_maps_url: "",
};

const ASSET_TYPES = [
  { value: "land", label: "أرض" },
  { value: "agricultural", label: "زراعي" },
  { value: "hotel", label: "فندق" },
  { value: "mall", label: "مول" },
  { value: "warehouse", label: "مستودع" },
  { value: "resort", label: "منتجع" },
] as const;

const RISK_LEVELS = [
  { value: "none", label: "بدون تقييم" },
  { value: "low", label: "منخفض" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "مرتفع" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "مسودة" },
  { value: "active", label: "نشط" },
  { value: "partially_sold", label: "متاح جزئياً" },
  { value: "sold_out", label: "نفد" },
  { value: "closed", label: "مغلق" },
] as const;

const USE_TYPES = [
  { value: "agricultural", label: "زراعي" },
  { value: "commercial", label: "تجاري" },
  { value: "industrial", label: "صناعي" },
  { value: "mixed", label: "مختلط" },
] as const;

const CULTIVATION_STATUSES = [
  { value: "cultivated", label: "مزروع" },
  { value: "uncultivated", label: "غير مزروع" },
  { value: "partial", label: "جزئياً" },
] as const;

const PAGE_SIZE = 15;

function AdminLandsPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const [form, setForm] = useState<LandForm | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState(searchParams.projectId ?? "");
  const [page, setPage] = useState(1);

  const openCreate = (prefill?: Partial<LandForm>) => setForm({ ...emptyForm, ...(prefill ?? {}) });

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-lands",
      { search, status: statusFilter, assetType: assetFilter, projectId: projectFilter, page },
    ],
    queryFn: () =>
      adminListLands({
        search: search || undefined,
        status: statusFilter || undefined,
        assetType: assetFilter || undefined,
        projectId: projectFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const { data: projects } = useQuery({
    queryKey: ["admin-projects-list"],
    queryFn: () => adminListProjects({ limit: 200 }),
  });

  const lands = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalLands = data?.total ?? 0;

  const totalSak = lands.reduce(
    (sum: number, l: AdminLandItem) => sum + Number(l.total_sak_inventory),
    0,
  );
  const availableSak = lands.reduce(
    (sum: number, l: AdminLandItem) => sum + Number(l.available_sak),
    0,
  );
  const soldSak = lands.reduce((sum: number, l: AdminLandItem) => sum + Number(l.sold_sak ?? 0), 0);

  const detailLand = detailId
    ? (lands.find((l: AdminLandItem) => l.id === detailId) ?? null)
    : null;

  const save = useMutation({
    mutationFn: (payload: { form: LandForm; fieldValues?: Record<string, unknown> }) =>
      adminSaveLand({
        id: payload.form.id,
        title_ar: payload.form.title_ar,
        title_en: payload.form.title_en,
        description_ar: payload.form.description_ar,
        description_en: payload.form.description_en,
        asset_type: payload.form.asset_type,
        country: payload.form.country,
        city: payload.form.city,
        area_m2: Number(payload.form.area_m2),
        total_sak_inventory: Number(payload.form.total_sak_inventory),
        available_sak: Number(payload.form.available_sak),
        maturity_months: Number(payload.form.maturity_months),
        expected_roi: Number(payload.form.expected_roi),
        risk_level: payload.form.risk_level,
        cover_image_url: payload.form.cover_image_url || null,
        gallery: payload.form.gallery,
        documents: payload.form.documents,
        lat: payload.form.lat ? Number(payload.form.lat) : null,
        lng: payload.form.lng ? Number(payload.form.lng) : null,
        status: payload.form.status,
        project_id: payload.form.project_id || null,
        use_type: payload.form.use_type || null,
        cultivation_status: payload.form.cultivation_status || null,
        acquisition_date: payload.form.acquisition_date || null,
        public_details_url: payload.form.public_details_url || null,
        google_maps_url: payload.form.google_maps_url || null,
      }).then(async (result) => {
        const landId = (result as any)?.id ?? payload.form.id;
        if (landId && payload.fieldValues && Object.keys(payload.fieldValues).length > 0) {
          await adminSaveLandFieldValues(landId, payload.fieldValues);
        }
        return result;
      }),
    onSuccess: () => {
      toast.success(form?.id ? "تم تحديث الأصل" : "تمت إضافة الأصل");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-lands"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteLand(id),
    onSuccess: () => {
      toast.success("تم حذف الأصل");
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-lands"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PortalShell title="إدارة الأصول">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم…"
            className="w-full max-w-[180px] rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الحالات</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={assetFilter}
            onChange={(e) => {
              setAssetFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الأنواع</option>
            {ASSET_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل المشاريع</option>
            {(projects?.data ?? []).map((p: { id: string; title_ar: string }) => (
              <option key={p.id} value={p.id}>
                {p.title_ar}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() =>
            openCreate(searchParams.projectId ? { project_id: searchParams.projectId } : undefined)
          }
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <Plus className="mb-0.5 ml-1 inline h-4 w-4" />
          إضافة أصل
        </button>
      </div>

      {!isLoading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="إجمالي الأصول"
            value={fmtNum(totalLands)}
            icon={Landmark}
            variant="info"
            isLoading={isLoading}
          />
          <StatsCard
            title="إجمالي وحدات SAK"
            value={fmtNum(totalSak)}
            icon={Landmark}
            variant="gold"
            isLoading={isLoading}
          />
          <StatsCard
            title="الوحدات المتاحة"
            value={fmtNum(availableSak)}
            icon={Landmark}
            variant="success"
            isLoading={isLoading}
          />
          <StatsCard
            title="الوحدات المباعة"
            value={fmtNum(soldSak)}
            icon={Landmark}
            variant="warning"
            isLoading={isLoading}
          />
        </div>
      )}

      {form && (
        <LandFormPanel
          form={form}
          setForm={setForm}
          save={save}
          projects={projects?.data ?? []}
          landId={form.id}
        />
      )}

      {detailLand && (
        <DetailPanel
          land={detailLand}
          onClose={() => setDetailId(null)}
          onEdit={(l) => {
            setDetailId(null);
            setForm({
              id: l.id,
              title_ar: l.title_ar,
              title_en: l.title_en,
              description_ar: l.description_ar ?? "",
              description_en: l.description_en ?? "",
              asset_type: l.asset_type as LandForm["asset_type"],
              country: l.country,
              city: l.city,
              area_m2: Number(l.area_m2),
              total_sak_inventory: Number(l.total_sak_inventory),
              available_sak: Number(l.available_sak),
              maturity_months: l.maturity_months,
              expected_roi: Number(l.expected_roi),
              risk_level: l.risk_level as LandForm["risk_level"],
              cover_image_url: l.cover_image_url ?? "",
              gallery: (l.gallery ?? []) as string[],
              documents: (l.documents ?? []) as string[],
              lat: l.lat ? String(l.lat) : "",
              lng: l.lng ? String(l.lng) : "",
              status: l.status as LandForm["status"],
              project_id: l.project_id ?? "",
              use_type: (l.use_type ?? "") as LandForm["use_type"],
              cultivation_status: (l.cultivation_status ?? "") as LandForm["cultivation_status"],
              acquisition_date: l.acquisition_date ? String(l.acquisition_date).slice(0, 10) : "",
              public_details_url: l.public_details_url ?? "",
              google_maps_url: l.google_maps_url ?? "",
            });
          }}
        />
      )}

      {isLoading ? (
        <Spinner />
      ) : !lands.length ? (
        <EmptyState
          icon={Landmark}
          title="لا أصول بعد"
          description="ابدأ بإضافة أول أصل استثماري"
          action={
            <button
              onClick={() =>
                openCreate(
                  searchParams.projectId ? { project_id: searchParams.projectId } : undefined,
                )
              }
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              + إضافة أصل
            </button>
          }
        />
      ) : (
        <>
          <div className="card-luxe overflow-x-auto !p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th className="px-4 py-3.5 font-semibold">الأصل</th>
                  <th className="px-4 py-3.5 font-semibold">النوع</th>
                  <th className="px-4 py-3.5 font-semibold">الموقع</th>
                  <th className="px-4 py-3.5 font-semibold">المساحة</th>
                  <th className="px-4 py-3.5 font-semibold">SAK</th>
                  <th className="px-4 py-3.5 font-semibold">المتاح</th>
                  <th className="px-4 py-3.5 font-semibold">العائد</th>
                  <th className="px-4 py-3.5 font-semibold">المخاطر</th>
                  <th className="px-4 py-3.5 font-semibold">الحالة</th>
                  <th className="px-4 py-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {lands.map((l: AdminLandItem) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {l.cover_image_url ? (
                          <img
                            src={l.cover_image_url}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                            <Landmark className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{l.title_ar}</p>
                          {l.project && (
                            <p className="text-xs text-muted-foreground">
                              {l.project.titleAr ?? l.project.titleEn}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {ASSET_TYPES.find((a) => a.value === l.asset_type)?.label ?? l.asset_type}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {l.city ? `${l.city}، ` : ""}
                        {l.country}
                      </span>
                    </td>
                    <td className="num px-4 py-3.5">{fmtNum(Number(l.area_m2))} م²</td>
                    <td className="num px-4 py-3.5 font-semibold">
                      {fmtNum(Number(l.total_sak_inventory))}
                    </td>
                    <td className="num px-4 py-3.5 text-gold">{fmtNum(Number(l.available_sak))}</td>
                    <td className="num px-4 py-3.5">{fmtNum(Number(l.expected_roi))}%</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={l.risk_level} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDetailId(detailId === l.id ? null : l.id)}
                          className="text-xs font-bold text-muted-foreground hover:text-foreground"
                        >
                          تفاصيل
                        </button>
                        <button
                          onClick={() =>
                            setForm({
                              id: l.id,
                              title_ar: l.title_ar,
                              title_en: l.title_en,
                              description_ar: l.description_ar ?? "",
                              description_en: l.description_en ?? "",
                              asset_type: l.asset_type as LandForm["asset_type"],
                              country: l.country,
                              city: l.city,
                              area_m2: Number(l.area_m2),
                              total_sak_inventory: Number(l.total_sak_inventory),
                              available_sak: Number(l.available_sak),
                              maturity_months: l.maturity_months,
                              expected_roi: Number(l.expected_roi),
                              risk_level: l.risk_level as LandForm["risk_level"],
                              cover_image_url: l.cover_image_url ?? "",
                              gallery: (l.gallery ?? []) as string[],
                              documents: (l.documents ?? []) as string[],
                              lat: l.lat ? String(l.lat) : "",
                              lng: l.lng ? String(l.lng) : "",
                              status: l.status as LandForm["status"],
                              project_id: l.project_id ?? "",
                              use_type: (l.use_type ?? "") as LandForm["use_type"],
                              cultivation_status: (l.cultivation_status ??
                                "") as LandForm["cultivation_status"],
                              acquisition_date: l.acquisition_date
                                ? String(l.acquisition_date).slice(0, 10)
                                : "",
                              public_details_url: l.public_details_url ?? "",
                              google_maps_url: l.google_maps_url ?? "",
                            })
                          }
                          className="text-xs font-bold text-gold hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف "${l.title_ar}"؟`))
                              remove.mutate(l.id);
                          }}
                          className="text-xs font-bold text-destructive hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
              >
                السابق
              </button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}

function LandFormPanel({
  form,
  setForm,
  save,
  projects,
  landId,
}: {
  form: LandForm;
  setForm: (f: LandForm | null) => void;
  save: {
    mutate: (payload: { form: LandForm; fieldValues?: Record<string, unknown> }) => void;
    isPending: boolean;
  };
  projects: { id: string; title_ar: string; title_en: string }[];
  landId?: string;
}) {
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [assetTypeDef, setAssetTypeDef] = useState<AssetTypeDetail | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!form.asset_type) return;
    adminGetAssetType(form.asset_type)
      .then(setAssetTypeDef)
      .catch(() => setAssetTypeDef(null));
  }, [form.asset_type]);

  useEffect(() => {
    if (!landId || !assetTypeDef?.fields?.length) {
      setFieldValues({});
      return;
    }
    adminGetLandFieldValues(landId)
      .then((fvs) => {
        const vals: Record<string, unknown> = {};
        for (const fv of fvs) {
          vals[fv.fieldKey] = fv.value;
        }
        setFieldValues(vals);
      })
      .catch(() => setFieldValues({}));
  }, [landId, assetTypeDef]);

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  return (
    <div className="card-luxe gold-ring mb-8 p-6">
      <h2 className="mb-5 font-bold text-foreground">{form.id ? "تعديل أصل" : "أصل جديد"}</h2>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            المعلومات الأساسية
          </p>
        </div>
        <Field label="العنوان (عربي)" className="md:col-span-2">
          <input
            value={form.title_ar}
            onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="العنوان (إنجليزي)">
          <input
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
            className={inp}
            dir="ltr"
          />
        </Field>
        <Field label="الوصف (عربي)" className="md:col-span-2">
          <textarea
            rows={2}
            value={form.description_ar}
            onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="الوصف (إنجليزي)">
          <textarea
            rows={2}
            value={form.description_en}
            onChange={(e) => setForm({ ...form, description_en: e.target.value })}
            className={inp}
            dir="ltr"
          />
        </Field>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            الموقع والمشروع
          </p>
        </div>
        <Field label="الدولة">
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="المدينة">
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="المشروع">
          <select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            className={inp}
          >
            <option value="">بدون مشروع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title_ar || p.title_en}
              </option>
            ))}
          </select>
        </Field>
        <Field label="خط العرض (lat)">
          <input
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
            className={inp}
            dir="ltr"
            placeholder="25.2048"
          />
        </Field>
        <Field label="خط الطول (lng)">
          <input
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
            className={inp}
            dir="ltr"
            placeholder="55.2708"
          />
        </Field>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            تفاصيل المخزون
          </p>
        </div>
        <Field label="نوع الأصل">
          <select
            value={form.asset_type}
            onChange={(e) =>
              setForm({ ...form, asset_type: e.target.value as LandForm["asset_type"] })
            }
            className={inp}
          >
            {ASSET_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المساحة (م²)">
          <input
            type="number"
            value={form.area_m2 || ""}
            onChange={(e) => setForm({ ...form, area_m2: Number(e.target.value) })}
            className={`num ${inp}`}
          />
        </Field>
        <Field label="إجمالي وحدات SAK">
          <input
            type="number"
            value={form.total_sak_inventory || ""}
            onChange={(e) => setForm({ ...form, total_sak_inventory: Number(e.target.value) })}
            className={`num ${inp}`}
          />
        </Field>
        <Field label="الوحدات المتاحة">
          <input
            type="number"
            value={form.available_sak || ""}
            onChange={(e) => setForm({ ...form, available_sak: Number(e.target.value) })}
            className={`num ${inp}`}
          />
        </Field>
        <Field label="الوحدات المباعة">
          <div className={`${inp} flex items-center bg-secondary/50`}>
            <span className="num text-muted-foreground">
              {fmtNum(form.total_sak_inventory - form.available_sak)}
            </span>
          </div>
        </Field>
        <Field label="مدة الاستحقاق (أشهر)">
          <input
            type="number"
            value={form.maturity_months || ""}
            onChange={(e) => setForm({ ...form, maturity_months: Number(e.target.value) })}
            className={`num ${inp}`}
          />
        </Field>
        <Field label="العائد المتوقع %">
          <input
            type="number"
            step="0.1"
            value={form.expected_roi || ""}
            onChange={(e) => setForm({ ...form, expected_roi: Number(e.target.value) })}
            className={`num ${inp}`}
          />
        </Field>
        <Field label="مستوى المخاطر">
          <select
            value={form.risk_level}
            onChange={(e) =>
              setForm({ ...form, risk_level: e.target.value as LandForm["risk_level"] })
            }
            className={inp}
          >
            {RISK_LEVELS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الحالة">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LandForm["status"] })}
            className={inp}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            التفاصيل الزراعية والعقارية
          </p>
        </div>
        <Field label="نوع الاستخدام">
          <select
            value={form.use_type}
            onChange={(e) => setForm({ ...form, use_type: e.target.value as LandForm["use_type"] })}
            className={inp}
          >
            <option value="">غير محدد</option>
            {USE_TYPES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالة الزراعة">
          <select
            value={form.cultivation_status}
            onChange={(e) =>
              setForm({
                ...form,
                cultivation_status: e.target.value as LandForm["cultivation_status"],
              })
            }
            className={inp}
          >
            <option value="">غير محدد</option>
            {CULTIVATION_STATUSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ الاستحواذ">
          <input
            type="date"
            value={form.acquisition_date}
            onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })}
            className={`${inp} num`}
            dir="ltr"
          />
        </Field>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            الوسائط والمستندات
          </p>
        </div>
        <Field label="صورة الغلاف (URL)" className="md:col-span-3">
          <input
            value={form.cover_image_url}
            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
            className={inp}
            dir="ltr"
            placeholder="https://..."
          />
        </Field>
        <Field label="رابط التفاصيل" className="md:col-span-3">
          <input
            type="url"
            value={form.public_details_url}
            onChange={(e) => setForm({ ...form, public_details_url: e.target.value })}
            className={inp}
            dir="ltr"
            placeholder="https://example.com/property/details"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            اختياري — يظهر للعميل كزر لمزيد من التفاصيل
          </p>
        </Field>
        <Field label="رابط Google Maps" className="md:col-span-3">
          <input
            type="url"
            value={form.google_maps_url}
            onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
            className={inp}
            dir="ltr"
            placeholder="https://maps.google.com/..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            اختياري — إذا لم يتم إدخاله لن يظهر قسم الخريطة
          </p>
        </Field>
        <Field label="المعرض (Gallery)" className="md:col-span-3">
          <div className="flex gap-2">
            <input
              value={newGalleryUrl}
              onChange={(e) => setNewGalleryUrl(e.target.value)}
              className={inp}
              dir="ltr"
              placeholder="أضف رابط صورة ثم اضغط إضافة"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGalleryUrl.trim()) {
                  e.preventDefault();
                  setForm({ ...form, gallery: [...form.gallery, newGalleryUrl.trim()] });
                  setNewGalleryUrl("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newGalleryUrl.trim()) {
                  setForm({ ...form, gallery: [...form.gallery, newGalleryUrl.trim()] });
                  setNewGalleryUrl("");
                }
              }}
              className="shrink-0 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-foreground"
            >
              إضافة
            </button>
          </div>
          {form.gallery.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {form.gallery.map((url, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={url}
                    alt={`Gallery ${i + 1}`}
                    className="aspect-square w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).className =
                        "aspect-square w-full bg-secondary flex items-center justify-center text-muted-foreground";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                    <button
                      onClick={() =>
                        setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })
                      }
                      className="scale-0 rounded-full bg-red-600 p-1.5 text-white transition group-hover:scale-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Field>
        <Field label="المستندات (Documents)" className="md:col-span-3">
          <div className="flex gap-2">
            <input
              value={newDocUrl}
              onChange={(e) => setNewDocUrl(e.target.value)}
              className={inp}
              dir="ltr"
              placeholder="أضف رابط مستند ثم اضغط إضافة"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDocUrl.trim()) {
                  e.preventDefault();
                  setForm({ ...form, documents: [...form.documents, newDocUrl.trim()] });
                  setNewDocUrl("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newDocUrl.trim()) {
                  setForm({ ...form, documents: [...form.documents, newDocUrl.trim()] });
                  setNewDocUrl("");
                }
              }}
              className="shrink-0 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-foreground"
            >
              إضافة
            </button>
          </div>
          {form.documents.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.documents.map((url, i) => {
                const name = (() => {
                  try {
                    return decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? url);
                  } catch {
                    return url;
                  }
                })();
                return (
                  <div
                    key={i}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 transition hover:bg-secondary/60"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-gold hover:underline"
                    >
                      فتح
                    </a>
                    <button
                      onClick={() =>
                        setForm({ ...form, documents: form.documents.filter((_, j) => j !== i) })
                      }
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-red-600/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Field>
      </div>

      {assetTypeDef?.fields && assetTypeDef.fields.length > 0 && (
        <div className="mb-5">
          <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">
            حقول {assetTypeDef.nameAr || assetTypeDef.nameEn}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {assetTypeDef.fields.map((field) => (
              <DynamicFieldRow
                key={field.id}
                field={field}
                value={fieldValues[field.fieldKey]}
                onChange={(v) => handleFieldChange(field.fieldKey, v)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => save.mutate({ form, fieldValues })}
          disabled={save.isPending || !form.title_ar || !form.country}
          className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        <button
          onClick={() => setForm(null)}
          className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function DetailPanel({
  land,
  onClose,
  onEdit,
}: {
  land: AdminLandItem;
  onClose: () => void;
  onEdit: (l: AdminLandItem) => void;
}) {
  const totalSak = Number(land.total_sak_inventory);
  const available = Number(land.available_sak);
  const sold = Number(land.sold_sak ?? 0);
  const soldPct = totalSak > 0 ? ((sold / totalSak) * 100).toFixed(1) : "0";

  return (
    <div className="card-luxe gold-ring mb-8 p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{land.title_ar}</h2>
          {land.title_en && (
            <p className="text-sm text-muted-foreground" dir="ltr">
              {land.title_en}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">النوع</p>
          <p className="font-semibold text-foreground">
            {ASSET_TYPES.find((a) => a.value === land.asset_type)?.label ?? land.asset_type}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">الموقع</p>
          <p className="font-semibold text-foreground">
            {land.city ? `${land.city}، ` : ""}
            {land.country}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المساحة</p>
          <p className="num font-semibold text-foreground">{fmtNum(Number(land.area_m2))} م²</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">العائد المتوقع</p>
          <p className="num font-semibold text-gold">{fmtNum(Number(land.expected_roi))}%</p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">نوع الاستخدام</p>
          <p className="font-semibold text-foreground">
            {USE_TYPES.find((u) => u.value === land.use_type)?.label ?? "غير محدد"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">حالة الزراعة</p>
          <p className="font-semibold text-foreground">
            {CULTIVATION_STATUSES.find((c) => c.value === land.cultivation_status)?.label ??
              "غير محدد"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">تاريخ الاستحواذ</p>
          <p className="num font-semibold text-foreground">
            {land.acquisition_date ? String(land.acquisition_date).slice(0, 10) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">مدة الاستحقاق</p>
          <p className="num font-semibold text-foreground">{Number(land.maturity_months)} شهر</p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">إجمالي SAK</p>
          <p className="num text-lg font-bold text-foreground">{fmtNum(totalSak)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المتاح</p>
          <p className="num text-lg font-bold text-gold">{fmtNum(available)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المباع</p>
          <p className="num text-lg font-bold text-foreground">{fmtNum(sold)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">نسبة البيع</p>
          <p className="num text-lg font-bold text-foreground">{soldPct}%</p>
        </div>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${totalSak > 0 ? (available / totalSak) * 100 : 0}%` }}
        />
      </div>

      {land.description_ar && (
        <p className="mb-4 text-sm text-muted-foreground">{land.description_ar}</p>
      )}

      <DynamicFieldValues landId={land.id} assetType={land.asset_type} />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onEdit(land)}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary/80"
        >
          تعديل
        </button>
        <StatusBadge
          status={land.risk_level}
          label={`مخاطر: ${RISK_LEVELS.find((r) => r.value === land.risk_level)?.label ?? land.risk_level}`}
        />
        <StatusBadge status={land.status} />
        {land.public_details_url && (
          <a
            href={land.public_details_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            مزيد من التفاصيل
          </a>
        )}
        {land.lat && land.lng && (
          <a
            href={`https://www.google.com/maps?q=${land.lat},${land.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <MapPin className="h-3 w-3" />
            خريطة
          </a>
        )}
      </div>
    </div>
  );
}

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold";

function DynamicFieldRow({
  field,
  value,
  onChange,
}: {
  field: AssetTypeFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = field.labelAr || field.labelEn;
  const fieldKey = field.fieldKey;

  const renderInput = () => {
    switch (field.fieldType) {
      case "textarea":
        return (
          <textarea
            rows={2}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inp}
            placeholder={label}
          />
        );
      case "number":
      case "decimal":
        return (
          <input
            type="number"
            value={(value as number | string) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`num ${inp}`}
            placeholder={label}
          />
        );
      case "boolean":
        return (
          <select
            value={value === true ? "true" : value === false ? "false" : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "true" ? true : v === "false" ? false : null);
            }}
            className={inp}
          >
            <option value="">غير محدد</option>
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </select>
        );
      case "date":
        return (
          <input
            type="date"
            value={value ? new Date(value as string).toISOString().slice(0, 10) : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${inp} num`}
          />
        );
      case "select":
        return (
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inp}
          >
            <option value="">اختر…</option>
            {Array.isArray(field.options) &&
              field.options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelAr || opt.labelEn || opt.value}
                </option>
              ))}
          </select>
        );
      case "multi_select":
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(selected);
            }}
            className={inp}
          >
            {Array.isArray(field.options) &&
              field.options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelAr || opt.labelEn || opt.value}
                </option>
              ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inp}
            placeholder={label}
          />
        );
    }
  };

  return (
    <Field label={label}>
      {renderInput()}
      {field.isRequired && <span className="text-xs text-destructive">*</span>}
    </Field>
  );
}

function DynamicFieldValues({ landId, assetType }: { landId: string; assetType: string }) {
  const { data: fieldValues, isLoading } = useQuery({
    queryKey: ["admin-land-field-values", landId],
    queryFn: () => adminGetLandFieldValues(landId),
    enabled: !!landId,
  });

  if (isLoading) {
    return <Spinner className="mb-4 inline-block" />;
  }

  if (!fieldValues?.length) {
    return null;
  }

  return (
    <div className="mb-5">
      <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground/60">حقول إضافية</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fieldValues.map(
          (fv: { fieldKey: string; labelAr?: string; labelEn?: string; value: unknown }) => (
            <div key={fv.fieldKey} className="rounded-xl bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">{fv.labelAr || fv.labelEn}</p>
              <p className="font-semibold text-foreground">
                {Array.isArray(fv.value)
                  ? fv.value.join(", ")
                  : fv.value !== null && fv.value !== undefined
                    ? String(fv.value)
                    : "—"}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
