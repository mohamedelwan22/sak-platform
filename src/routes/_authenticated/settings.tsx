import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  CheckCircle2,
  FileCheck2,
  Globe,
  Languages,
  LogOut,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Trash2,
  User,
  KeyRound,
  Mail,
  Smartphone,
} from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge, Spinner } from "@/components/shared/ui-kit";
import { Switch } from "@/components/ui/switch";
import { useAuth, useSession, useProfile } from "@/hooks/useAuth";
import { profileApi } from "@/api/profile.api";
import { authApi, type SessionInfo } from "@/api/auth.api";
import { notificationsApi } from "@/api/notifications.api";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const sections = [
  { key: "profile", label: "الملف الشخصي", icon: User },
  { key: "security", label: "الأمان", icon: ShieldCheck },
  { key: "kyc", label: "التحقق من الهوية", icon: FileCheck2 },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "language", label: "اللغة والمظهر", icon: Globe },
] as const;

type SectionKey = (typeof sections)[number]["key"];

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold";

const roleLabels: Record<string, string> = {
  super_admin: "مدير عام",
  admin: "مسؤول",
  investor: "مستثمر",
  client: "عميل",
  support: "دعم فني",
};

const notificationTypeLabels: { type: string; label: string; hint: string }[] = [
  { type: "system", label: "إشعارات النظام", hint: "إعلانات عامة وتحديثات المنصة" },
  { type: "transaction", label: "المعاملات", hint: "عمليات الإيداع والسحب والشراء والبيع" },
  { type: "kyc", label: "التحقق من الهوية", hint: "تحديثات حالة طلبات التحقق" },
  { type: "investment", label: "الاستثمارات", hint: "تفاصيل استثماراتك وأصولك" },
  { type: "wallet", label: "المحفظة", hint: "حركات رصيد المحفظة بالكامل" },
  { type: "profit", label: "العوائد والأرباح", hint: "توزيع الأرباح وجداول الاستحقاق" },
];

const kycDocLabels: Record<string, string> = {
  national_id: "بطاقة هوية وطنية",
  passport: "جواز سفر",
  driver_license: "رخصة قيادة",
};

function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");

  return (
    <PortalShell title="الإعدادات">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">إعدادات الحساب</h1>
            <p className="text-sm text-muted-foreground">
              إدارة بياناتك الشخصية وأمان حسابك وتفضيلاتك
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
          <aside className="shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:gap-1 lg:pb-0">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  aria-current={active === s.key ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    active === s.key
                      ? "bg-gold/15 text-gold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <s.icon className="h-4.5 w-4.5 shrink-0" />
                  {s.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {active === "profile" && <ProfileSection />}
            {active === "security" && <SecuritySection />}
            {active === "kyc" && <KycSection />}
            {active === "notifications" && <NotificationsSection />}
            {active === "language" && <LanguageSection />}
          </main>
        </div>
      </div>
    </PortalShell>
  );
}

/* ------------------------------ Profile ------------------------------ */

function ProfileSection() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile, isLoading } = useProfile(userId);
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setPhone(profile.phone ?? "");
    setIsDirty(false);
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await profileApi.updateProfile({ firstName, lastName, phone: phone || null });
    },
    onSuccess: () => {
      toast.success("تم حفظ البيانات بنجاح");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["is-admin", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return profileApi.uploadAvatar(formData);
    },
    onSuccess: () => {
      toast.success("تم تحديث الصورة الشخصية");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAvatar = useMutation({
    mutationFn: async () => profileApi.deleteAvatar(),
    onSuccess: () => {
      toast.success("تمت إزالة الصورة الشخصية");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const role = typeof profile?.role === "string" ? profile.role : profile?.role?.name;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">الصورة الشخصية</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={fullName} avatarUrl={profile?.avatarUrl} size={72} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70">
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {uploadAvatar.isPending ? "جارٍ الرفع…" : "تغيير الصورة"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploadAvatar.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar.mutate(file);
                  e.target.value = "";
                }}
              />
            </label>
            {profile?.avatarUrl && (
              <button
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending}
                className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                إزالة الصورة
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">JPG أو PNG أو WEBP حتى 5MB</p>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">البيانات الشخصية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الأول">
            <input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setIsDirty(true);
              }}
              className={inp}
              placeholder="مثال: محمد"
            />
          </Field>
          <Field label="اسم العائلة">
            <input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setIsDirty(true);
              }}
              className={inp}
              placeholder="مثال: أحمد"
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setIsDirty(true);
              }}
              className={inp}
              dir="ltr"
              placeholder="+9665xxxxxxxx"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => saveProfile.mutate()}
            disabled={!isDirty || saveProfile.isPending || isLoading}
            className="bg-gold-gradient shadow-gold rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saveProfile.isPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">معلومات الحساب</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoItem icon={Mail} label="البريد الإلكتروني" value={profile?.email ?? "—"} ltr />
          <InfoItem
            icon={Smartphone}
            label="رقم الحساب"
            value={profile?.accountNumber ?? "—"}
            ltr
            mono
          />
          <InfoItem
            icon={ShieldCheck}
            label="الدور"
            value={role ? (roleLabels[role] ?? role) : "—"}
          />
          <InfoItem
            icon={CheckCircle2}
            label="عضو منذ"
            value={profile ? fmtDateTime(profile.createdAt) : "—"}
          />
        </dl>
        <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
          رقم الحساب والبريد الإلكتروني للقراءة فقط ولا يمكن تغييرهما من هنا.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Security ------------------------------ */

function SecuritySection() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { changePassword, logoutAll } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["auth-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await authApi.getSessions();
      return res.data.data;
    },
  });

  const changePw = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 10) throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف");
      if (newPassword !== confirmPassword) throw new Error("كلمتا المرور غير متطابقتين");
      await changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور، وتم تسجيل الخروج من الأجهزة الأخرى");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["auth-sessions", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      await authApi.deleteSession(sessionId);
    },
    onSuccess: () => {
      toast.success("تم إنهاء الجلسة");
      queryClient.invalidateQueries({ queryKey: ["auth-sessions", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOutAll = useMutation({
    mutationFn: async () => {
      if (
        !window.confirm("سيتم تسجيل الخروج من جميع الأجهزة بما فيها هذا الجهاز. هل تريد المتابعة؟")
      ) {
        throw new Error("cancelled");
      }
      await logoutAll();
    },
    onSuccess: () => {
      navigate({ to: "/auth", replace: true });
    },
    onError: (e: Error) => {
      if (e.message !== "cancelled") toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
          <KeyRound className="h-4.5 w-4.5 text-gold" />
          تغيير كلمة المرور
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          بعد تغيير كلمة المرور سيتم تسجيل الخروج من جميع الأجهزة الأخرى تلقائياً.
        </p>
        <div className="space-y-4">
          <Field label="كلمة المرور الحالية">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inp}
              placeholder="••••••••••"
            />
          </Field>
          <Field label="كلمة المرور الجديدة">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inp}
              placeholder="10 أحرف على الأقل مع حروف وأرقام"
            />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inp}
              placeholder="••••••••••"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => changePw.mutate()}
            disabled={changePw.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="bg-gold-gradient shadow-gold rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {changePw.isPending ? "جارٍ التغيير…" : "تغيير كلمة المرور"}
          </button>
        </div>
      </div>

      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <MonitorSmartphone className="h-4.5 w-4.5 text-gold" />
            الأجهزة والجلسات
          </h2>
          <button
            onClick={() => signOutAll.mutate()}
            disabled={signOutAll.isPending}
            className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signOutAll.isPending ? "جارٍ…" : "تسجيل الخروج من الكل"}
          </button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !sessions?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد جلسات نشطة</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s: SessionInfo) => (
              <li key={s.id} className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {s.deviceName || s.browser || "جهاز غير معروف"}
                      </p>
                      {s.isCurrent && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                          هذا الجهاز
                        </span>
                      )}
                    </div>
                    <p dir="ltr" className="num mt-1 text-right text-xs text-muted-foreground">
                      {[s.browser, s.operatingSystem, s.ipAddress].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      آخر نشاط: {fmtDateTime(s.lastUsedAt)}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => {
                        if (window.confirm("إنهاء هذه الجلسة؟")) revokeSession.mutate(s.id);
                      }}
                      disabled={revokeSession.isPending}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                    >
                      إنهاء الجلسة
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
          <ShieldCheck className="h-4.5 w-4.5 text-gold" />
          التحقق بخطوتين (2FA)
        </h2>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">مصادقة عبر تطبيق توثيق</p>
            <p className="text-xs text-muted-foreground">غير متاح حالياً، سيُضاف في تحديث قادم</p>
          </div>
          <Switch checked={false} disabled aria-disabled={true} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ KYC ------------------------------ */

function KycSection() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);

  const { data: lastSubmission, isLoading } = useQuery({
    queryKey: ["kyc-last", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.kyc();
      const submissions = res.data.data;
      return Array.isArray(submissions) ? (submissions[0] ?? null) : submissions;
    },
  });

  const status = profile?.kyc_status ?? "not_submitted";

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gold/15 p-3 text-gold">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">حالة التحقق من الهوية</p>
              <p className="text-xs text-muted-foreground">
                مطلوب قبل الإيداع أو الاستثمار أو السحب
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : lastSubmission ? (
          <dl className="mt-5 grid gap-3 rounded-xl bg-secondary/60 p-4 sm:grid-cols-2">
            <InfoItem
              icon={FileCheck2}
              label="نوع المستند"
              value={
                kycDocLabels[lastSubmission.documentType] ?? lastSubmission.documentType ?? "—"
              }
            />
            <InfoItem
              icon={CheckCircle2}
              label="تاريخ الطلب"
              value={lastSubmission.created_at ? fmtDateTime(lastSubmission.created_at) : "—"}
            />
          </dl>
        ) : null}

        {status === "approved" && (
          <p className="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            ✓ تم اعتماد هويتك، يمكنك الإيداع والاستثمار والسحب بحرية.
          </p>
        )}
        {status === "pending" && (
          <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
            طلب التحقق قيد المراجعة وسيتم إشعارك بالنتيجة.
          </p>
        )}
        {status === "rejected" && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {lastSubmission?.rejection_reason ? (
              <>
                <strong>سبب الرفض:</strong> {lastSubmission.rejection_reason}
              </>
            ) : (
              "تم رفض طلب التحقق، يرجى إعادة التقديم بمستندات واضحة."
            )}
          </div>
        )}

        {status !== "approved" && (
          <div className="mt-5 flex justify-end">
            <Link
              to="/kyc"
              className="bg-gold-gradient shadow-gold rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {status === "not_submitted" ? "الانتقال إلى التحقق" : "متابعة طلب التحقق"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Notifications ------------------------------ */

function NotificationsSection() {
  const queryClient = useQueryClient();

  const { data: prefRows, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await notificationsApi.getPreferences();
      return res.data.data;
    },
  });

  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {
      system: true,
      transaction: true,
      kyc: true,
      investment: true,
      wallet: true,
      profit: true,
    };
    for (const p of prefRows ?? []) {
      next[p.type] = p.enabled;
    }
    setToggles(next);
  }, [prefRows]);

  const setPref = useMutation({
    mutationFn: async ({ type, enabled }: { type: string; enabled: boolean }) =>
      notificationsApi.setPreference({ type, channel: "in_app", enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  function handleToggle(type: string, enabled: boolean) {
    setToggles((prev) => ({ ...prev, [type]: enabled }));
    setPref.mutate(
      { type, enabled },
      {
        onError: () => {
          setToggles((prev) => ({ ...prev, [type]: !enabled }));
          toast.error("تعذر تحديث التفضيل");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-1 text-base font-bold text-foreground">تفضيلات الإشعارات</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          تحكم في نوع التنبيهات التي تصلك داخل المنصة.
        </p>

        {isLoading ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-background">
            {notificationTypeLabels.map((item) => {
              const enabled = toggles[item.type] ?? true;
              return (
                <li key={item.type} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => handleToggle(item.type, v)}
                    aria-label={item.label}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
          حالياً الإشعارات داخل المنصة فقط. قنوات البريد الإلكتروني والرسائل النصية قادمة في تحديث
          لاحق.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Language & Theme ------------------------------ */

function LanguageSection() {
  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
          <Languages className="h-4.5 w-4.5 text-gold" />
          اللغة
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          المنصة حالياً تدعم اللغة العربية فقط بواجهة من اليمين إلى اليسار (RTL).
        </p>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-3 rounded-xl bg-gold/15 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Globe className="h-4 w-4 text-gold" />
              العربية (RTL)
            </span>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
              مفعلة
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 opacity-70">
            <span className="text-sm font-semibold text-muted-foreground">English</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              غير متاحة حالياً
            </span>
          </li>
        </ul>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
          <Palette className="h-4.5 w-4.5 text-gold" />
          المظهر
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          المنصة حالياً بواجهة فاتحة فقط، الوضع الداكن قادم في تحديث لاحق.
        </p>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-3 rounded-xl bg-gold/15 px-4 py-3">
            <span className="text-sm font-bold text-foreground">الوضع الفاتح</span>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
              مفعل
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 opacity-70">
            <span className="text-sm font-semibold text-muted-foreground">الوضع الداكن</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              غير متاح حالياً
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------ small helpers ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  ltr,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ltr?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "mt-1.5 text-sm font-bold text-foreground",
          ltr && "text-right",
          mono && "num",
        )}
      >
        {value}
      </p>
    </div>
  );
}
