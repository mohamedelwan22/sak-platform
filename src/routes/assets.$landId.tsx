import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, TrendingUp, Layers, Ruler, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { GoldTicker } from "@/components/GoldTicker";
import { Spinner, StatusBadge, EmptyState } from "@/components/shared/ui-kit";
import { landQuery, goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtNum } from "@/lib/format";
import { landImage } from "@/lib/images";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { buySak } from "@/lib/investor.functions";

export const Route = createFileRoute("/assets/$landId")({
  head: () => ({
    meta: [
      { title: "تفاصيل الأصل — SAK100" },
      {
        name: "description",
        content:
          "تفاصيل الأصل الاستثماري: المساحة، العائد المتوقع، مدة الاستحقاق، والوحدات المتاحة.",
      },
    ],
  }),
  component: AssetDetail,
});

function AssetDetail() {
  const { landId } = Route.useParams();
  const { data: land, isLoading } = useQuery(landQuery(landId));

  if (isLoading)
    return (
      <PublicLayout>
        <Spinner className="py-32" />
      </PublicLayout>
    );

  if (!land)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24">
          <EmptyState
            title="الأصل غير موجود"
            description="ربما تم إغلاقه أو حذف الرابط"
            action={
              <Link to="/projects" className="text-gold hover:underline">
                تصفح المشاريع
              </Link>
            }
          />
        </div>
      </PublicLayout>
    );

  const totalSak = Number(land.total_sak_inventory) || 0;
  const availableSak = Number(land.available_sak) || 0;
  const soldPct = totalSak > 0
    ? Math.round(((totalSak - availableSak) / totalSak) * 100)
    : 0;

  return (
    <PublicLayout>
      <div className="relative h-72 overflow-hidden md:h-96">
        <img
          src={landImage(land.cover_image_url)}
          alt={land.title_ar}
          width={1920}
          height={1088}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-navy)" }} />
        <div className="absolute right-0 bottom-0 left-0">
          <div className="mx-auto max-w-7xl px-4 pb-8 lg:px-8">
            <StatusBadge status={land.status} />
            <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">{land.title_ar}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/80">
              <MapPin className="h-4 w-4 text-gold" />
              {land.city}، {land.country}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <GoldTicker />
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoTile icon={Ruler} label="المساحة" value={`${fmtNum(Number(land.area_m2))} م²`} />
              <InfoTile
                icon={TrendingUp}
                label="العائد المتوقع"
                value={`${Number(land.expected_roi)}%`}
              />
              <InfoTile icon={Clock} label="الاستحقاق" value={`${land.maturity_months} شهراً`} />
              <InfoTile
                icon={Layers}
                label="إجمالي الوحدات"
                value={fmtNum(Number(land.total_sak_inventory))}
              />
            </div>

            <div className="card-luxe p-6">
              <h2 className="mb-3 text-lg font-bold text-foreground">عن هذا الأصل</h2>
              <p className="leading-relaxed text-muted-foreground">
                {land.description_ar || land.description_en}
              </p>
            </div>

            {Array.isArray(land.gallery) && land.gallery.length > 0 && (
              <GallerySection images={land.gallery as string[]} title={land.title_ar} />
            )}

            {land.lat && land.lng && (
              <MapSection lat={Number(land.lat)} lng={Number(land.lng)} />
            )}

            {Array.isArray(land.documents) && land.documents.length > 0 && (
              <DocumentsSection documents={land.documents as string[]} />
            )}

            <div className="card-luxe p-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">الوحدات المباعة</span>
                <span className="num font-bold text-gold">{soldPct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-gold-gradient h-full rounded-full"
                  style={{ width: `${soldPct}%` }}
                />
              </div>
              <p className="num mt-3 text-sm text-muted-foreground">
                متاح: {fmtNum(Number(land.available_sak))} من{" "}
                {fmtNum(Number(land.total_sak_inventory))} SAK
              </p>
            </div>
          </div>

          <InvestPanel land={land} />
        </div>
      </div>
    </PublicLayout>
  );
}

function GallerySection({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const prev = () => setActive((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActive((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="card-luxe p-6">
      <h2 className="mb-3 text-lg font-bold text-foreground">معرض الصور</h2>
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={images[active]}
          alt={`${title} ${active + 1}`}
          className="h-64 w-full object-cover sm:h-80"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" className="h-14 w-14 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapSection({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="card-luxe p-6">
      <h2 className="mb-3 text-lg font-bold text-foreground">الموقع على الخريطة</h2>
      <div className="overflow-hidden rounded-xl">
        <iframe
          title="خرائط الموقع"
          width="100%"
          height="300"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}&zoom=14`}
        />
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-gold" />
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:underline"
        >
          فتح في Google Maps ↗
        </a>
      </div>
    </div>
  );
}

function DocumentsSection({ documents }: { documents: string[] }) {
  const label = (url: string) => {
    try {
      const parts = url.split("/").pop()?.split("?")[0] ?? url;
      return decodeURIComponent(parts);
    } catch {
      return url;
    }
  };

  return (
    <div className="card-luxe p-6">
      <h2 className="mb-3 text-lg font-bold text-foreground">المستندات</h2>
      <div className="space-y-2">
        {documents.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground transition hover:bg-secondary"
          >
            <FileText className="h-5 w-5 shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate">{label(url)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">PDF</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="card-luxe p-4">
      <Icon className="mb-2 h-5 w-5 text-gold" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-0.5 font-bold text-foreground">{value}</p>
    </div>
  );
}

function InvestPanel({ land }: { land: { id: string; status: string; available_sak: number } }) {
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: wallet } = useWallet(session?.user.id);
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);
  const [sak, setSak] = useState(100);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const purchasable = land.status === "active" || land.status === "partially_sold";
  const cost = price != null ? sak * price : null;

  const mutation = useMutation({
    mutationFn: () => buySak({ landId: land.id, sakAmount: sak }),
    onSuccess: () => {
      toast.success("تم تأكيد استثمارك بنجاح 🎉");
      queryClient.invalidateQueries();
      navigate({ to: "/portfolio" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <aside className="card-luxe gold-ring sticky top-24 h-fit p-6">
      <h2 className="text-lg font-bold text-foreground">استثمر في هذا الأصل</h2>
      {!purchasable ? (
        <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          هذا الأصل غير متاح للشراء حالياً.
        </p>
      ) : (
        <>
          <label
            className="mt-5 mb-2 block text-sm font-semibold text-foreground"
            htmlFor="sak-qty"
          >
            عدد وحدات SAK
          </label>
          <input
            id="sak-qty"
            type="number"
            min={1}
            max={Number(land.available_sak)}
            value={sak}
            onChange={(e) => setSak(Math.max(0, Number(e.target.value)))}
            className="num w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-gold"
          />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر الوحدة الآن</span>
              <span className="num font-semibold text-foreground">
                {price != null ? fmtUSD(price) : "…"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">التكلفة الإجمالية</span>
              <span className="num text-lg font-bold text-gold">
                {cost != null ? fmtUSD(cost) : "…"}
              </span>
            </div>
            {session && wallet && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">رصيدك</span>
                <span className="num font-semibold text-foreground">
                  {fmtNum(Number(wallet.sak_balance), 2)} SAK
                </span>
              </div>
            )}
          </div>

          {!session ? (
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="bg-gold-gradient shadow-gold mt-6 block rounded-xl py-3.5 text-center font-bold text-primary-foreground"
            >
              سجّل للاستثمار
            </Link>
          ) : profile?.kyc_status !== "approved" ? (
            <Link
              to="/kyc"
              className="mt-6 block rounded-xl border border-warning/40 bg-warning/10 py-3.5 text-center font-bold text-warning"
            >
              أكمل التحقق من الهوية أولاً
            </Link>
          ) : (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || sak <= 0 || sak > Number(land.available_sak)}
              className="bg-gold-gradient shadow-gold mt-6 w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? "جارٍ التنفيذ…" : "تأكيد الاستثمار"}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground/70">
            الشراء يخصم من رصيد SAK في محفظتك
          </p>
        </>
      )}
    </aside>
  );
}
