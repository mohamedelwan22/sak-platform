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
import { t } from "@/i18n";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const sections = [
  { key: "profile", label: t("_authenticatedSettings.k30"), icon: User },
  { key: "security", label: t("_authenticatedSettings.k31"), icon: ShieldCheck },
  { key: "kyc", label: t("_authenticatedSettings.k32"), icon: FileCheck2 },
  { key: "notifications", label: t("_authenticatedSettings.k33"), icon: Bell },
  { key: "language", label: t("_authenticatedSettings.k34"), icon: Globe },
] as const;

type SectionKey = (typeof sections)[number]["key"];

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold";

const roleLabels: Record<string, string> = {
  super_admin: t("_authenticatedSettings.k35"),
  admin: t("_authenticatedSettings.k36"),
  investor: t("_authenticatedSettings.k37"),
  client: t("_authenticatedSettings.k38"),
  support: t("_authenticatedSettings.k39"),
};

const notificationTypeLabels: { type: string; label: string; hint: string }[] = [
  { type: "system", label: t("_authenticatedSettings.k40"), hint: t("_authenticatedSettings.k41") },
  {
    type: "transaction",
    label: t("_authenticatedSettings.k42"),
    hint: t("_authenticatedSettings.k43"),
  },
  { type: "kyc", label: t("_authenticatedSettings.k44"), hint: t("_authenticatedSettings.k45") },
  {
    type: "investment",
    label: t("_authenticatedSettings.k46"),
    hint: t("_authenticatedSettings.k47"),
  },
  { type: "wallet", label: t("_authenticatedSettings.k48"), hint: t("_authenticatedSettings.k49") },
  { type: "profit", label: t("_authenticatedSettings.k50"), hint: t("_authenticatedSettings.k51") },
];

const kycDocLabels: Record<string, string> = {
  national_id: t("_authenticatedSettings.k52"),
  passport: t("_authenticatedSettings.k53"),
  driver_license: t("_authenticatedSettings.k54"),
};

function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");

  return (
    <PortalShell title={t("_authenticatedSettings.k14")}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("_authenticatedSettings.k1")}</h1>
            <p className="text-sm text-muted-foreground">{t("_authenticatedSettings.k10000")}</p>
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
      toast.success(t("_authenticatedSettings.k55"));
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
      toast.success(t("_authenticatedSettings.k56"));
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAvatar = useMutation({
    mutationFn: async () => profileApi.deleteAvatar(),
    onSuccess: () => {
      toast.success(t("_authenticatedSettings.k57"));
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const role = typeof profile?.role === "string" ? profile.role : profile?.role?.name;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">
          {t("_authenticatedSettings.k2")}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={fullName} avatarUrl={profile?.avatarUrl} size={72} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70">
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {uploadAvatar.isPending
                  ? t("_authenticatedSettings.k58")
                  : t("_authenticatedSettings.k59")}
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
                {t("_authenticatedSettings.k10001")}
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("_authenticatedSettings.k3")}</p>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">
          {t("_authenticatedSettings.k4")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("_authenticatedSettings.k15")}>
            <input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setIsDirty(true);
              }}
              className={inp}
              placeholder={t("_authenticatedSettings.k16")}
            />
          </Field>
          <Field label={t("_authenticatedSettings.k17")}>
            <input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setIsDirty(true);
              }}
              className={inp}
              placeholder={t("_authenticatedSettings.k18")}
            />
          </Field>
          <Field label={t("_authenticatedSettings.k19")}>
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
            {saveProfile.isPending
              ? t("_authenticatedSettings.k60")
              : t("_authenticatedSettings.k61")}
          </button>
        </div>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">
          {t("_authenticatedSettings.k5")}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoItem
            icon={Mail}
            label={t("_authenticatedSettings.k20")}
            value={profile?.email ?? "—"}
            ltr
          />
          <InfoItem
            icon={Smartphone}
            label={t("_authenticatedSettings.k21")}
            value={profile?.accountNumber ?? "—"}
            ltr
            mono
          />
          <InfoItem
            icon={ShieldCheck}
            label={t("_authenticatedSettings.k22")}
            value={role ? (roleLabels[role] ?? role) : "—"}
          />
          <InfoItem
            icon={CheckCircle2}
            label={t("_authenticatedSettings.k23")}
            value={profile ? fmtDateTime(profile.createdAt) : "—"}
          />
        </dl>
        <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
          {t("_authenticatedSettings.k10002")}
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
      if (newPassword.length < 10) throw new Error(t("_authenticatedSettings.k62"));
      if (newPassword !== confirmPassword) throw new Error(t("_authenticatedSettings.k63"));
      await changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedSettings.k64"));
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
      toast.success(t("_authenticatedSettings.k65"));
      queryClient.invalidateQueries({ queryKey: ["auth-sessions", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOutAll = useMutation({
    mutationFn: async () => {
      if (!window.confirm(t("_authenticatedSettings.k66"))) {
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
          {t("_authenticatedSettings.k10003")}
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">{t("_authenticatedSettings.k10004")}</p>
        <div className="space-y-4">
          <Field label={t("_authenticatedSettings.k24")}>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inp}
              placeholder="••••••••••"
            />
          </Field>
          <Field label={t("_authenticatedSettings.k25")}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inp}
              placeholder={t("_authenticatedSettings.k26")}
            />
          </Field>
          <Field label={t("_authenticatedSettings.k27")}>
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
            {changePw.isPending ? t("_authenticatedSettings.k67") : t("_authenticatedSettings.k68")}
          </button>
        </div>
      </div>

      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <MonitorSmartphone className="h-4.5 w-4.5 text-gold" />
            {t("_authenticatedSettings.k10005")}
          </h2>
          <button
            onClick={() => signOutAll.mutate()}
            disabled={signOutAll.isPending}
            className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signOutAll.isPending
              ? t("_authenticatedSettings.k69")
              : t("_authenticatedSettings.k70")}
          </button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !sessions?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("_authenticatedSettings.k6")}
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s: SessionInfo) => (
              <li key={s.id} className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {s.deviceName || s.browser || t("_authenticatedSettings.k71")}
                      </p>
                      {s.isCurrent && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                          {t("_authenticatedSettings.k10006")}
                        </span>
                      )}
                    </div>
                    <p dir="ltr" className="num mt-1 text-start text-xs text-muted-foreground">
                      {[s.browser, s.operatingSystem, s.ipAddress].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {t("_authenticatedSettings.k10000")} {fmtDateTime(s.lastUsedAt)}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => {
                        if (window.confirm(t("_authenticatedSettings.k72")))
                          revokeSession.mutate(s.id);
                      }}
                      disabled={revokeSession.isPending}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                    >
                      {t("_authenticatedSettings.k10007")}
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
          {t("_authenticatedSettings.k10008")}
        </h2>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("_authenticatedSettings.k7")}
            </p>
            <p className="text-xs text-muted-foreground">{t("_authenticatedSettings.k8")}</p>
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
              <p className="font-bold text-foreground">{t("_authenticatedSettings.k9")}</p>
              <p className="text-xs text-muted-foreground">{t("_authenticatedSettings.k10009")}</p>
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
              label={t("_authenticatedSettings.k28")}
              value={
                kycDocLabels[lastSubmission.documentType] ?? lastSubmission.documentType ?? "—"
              }
            />
            <InfoItem
              icon={CheckCircle2}
              label={t("_authenticatedSettings.k29")}
              value={lastSubmission.created_at ? fmtDateTime(lastSubmission.created_at) : "—"}
            />
          </dl>
        ) : null}

        {status === "approved" && (
          <p className="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            {t("settings.m1")}
          </p>
        )}
        {status === "pending" && (
          <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
            {t("_authenticatedSettings.k10010")}
          </p>
        )}
        {status === "rejected" && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {lastSubmission?.rejection_reason ? (
              <>
                <strong>{t("_authenticatedSettings.k10")}</strong> {lastSubmission.rejection_reason}
              </>
            ) : (
              t("_authenticatedSettings.k73")
            )}
          </div>
        )}

        {status !== "approved" && (
          <div className="mt-5 flex justify-end">
            <Link
              to="/kyc"
              className="bg-gold-gradient shadow-gold rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {status === "not_submitted"
                ? t("_authenticatedSettings.k74")
                : t("_authenticatedSettings.k75")}
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
          toast.error(t("_authenticatedSettings.k76"));
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-luxe p-6">
        <h2 className="mb-1 text-base font-bold text-foreground">
          {t("_authenticatedSettings.k11")}
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">{t("_authenticatedSettings.k10011")}</p>

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
          {t("_authenticatedSettings.k10012")}
          {t("_authenticatedSettings.k10013")}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Language & Theme ------------------------------ */

function LanguageSection() {
  return (
    <div className="space-y-6">
      <LanguageSwitcher variant="full" />

      <div className="card-luxe p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
          <Palette className="h-4.5 w-4.5 text-gold" />
          {t("_authenticatedSettings.k10019")}
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">{t("_authenticatedSettings.k10020")}</p>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-3 rounded-xl bg-gold/15 px-4 py-3">
            <span className="text-sm font-bold text-foreground">
              {t("_authenticatedSettings.k12")}
            </span>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
              {t("_authenticatedSettings.k10021")}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 opacity-70">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("_authenticatedSettings.k13")}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              {t("_authenticatedSettings.k10022")}
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
          ltr && "text-start",
          mono && "num",
        )}
      >
        {value}
      </p>
    </div>
  );
}
