import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
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
import { CountrySelect } from "@/components/shared/CountrySelect";
import { CitySelect } from "@/components/shared/CitySelect";
import { GovernorateSelect } from "@/components/shared/GovernorateSelect";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { WhatsAppInput } from "@/components/shared/WhatsAppInput";
import { findStateByName } from "@/lib/geoMapping";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { FieldWrapper } from "@/components/shared/FieldHelper";
import { validateField, validateProfile, type ProfileFieldInput } from "@/lib/profileValidation";

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
  const location = useLocation();

  useEffect(() => {
    const searchObj = location.search as Record<string, unknown> | undefined;
    const tab = (searchObj?.tab as SectionKey) || undefined;
    if (tab && sections.some((s) => s.key === tab)) {
      setActive(tab);
    }
  }, [location.search]);

  return (
    <PortalShell title={t("_authenticatedSettings.k14")}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("_authenticatedSettings.k1")}</h1>
            <p className="text-sm text-muted-foreground">{t("_authenticatedSettings.k10000")}</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[220px_1fr] lg:items-start">
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

  // Personal Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");

  // Contact Information
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(true);
  const [countryCallingCode, setCountryCallingCode] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappValid, setWhatsappValid] = useState(true);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");

  // Address Information
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [poBox, setPoBox] = useState("");

  // Professional Information
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");

  // Education Information
  const [educationLevel, setEducationLevel] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");

  const [isDirty, setIsDirty] = useState(false);

  // Guard to only auto-populate from profile on first load.
  // Prevents overwriting user edits during background React Query refetches.
  const profileInitialized = useRef(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate a single field on blur/change
  const validateFieldOnBlur = useCallback((field: string, value: unknown) => {
    const error = validateField(field, value);
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Handle field change with inline validation
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setIsDirty(true);
    // Validate on change for immediate feedback
    const error = validateField(field, value);
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleReset = () => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setFatherName(profile.fatherName ?? "");
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "");
    setNationality(profile.nationality ?? "");
    setPhone(profile.phone ?? "");
    setCountryCallingCode(profile.countryCallingCode ?? "");
    setWhatsappNumber(profile.whatsappNumber ?? "");
    setWhatsappSameAsPhone(profile.whatsappSameAsPhone ?? false);
    setTelegramUsername(profile.telegramUsername ?? "");
    setCountryCode(profile.countryCode ?? "");
    setStateCode(profile.stateCode ?? "");
    setCityName(profile.cityName ?? "");
    setGovernorate(profile.governorate ?? "");
    setStreetAddress(profile.streetAddress ?? "");
    setPostalCode(profile.postalCode ?? "");
    setPoBox(profile.poBox ?? "");
    setEmploymentStatus(profile.employmentStatus ?? "");
    setJobTitle(profile.jobTitle ?? "");
    setEmployer(profile.employer ?? "");
    setEducationLevel(profile.educationLevel ?? "");
    setFieldOfStudy(profile.fieldOfStudy ?? "");
    setIsDirty(false);
    setErrors({});
  };

  // Rehydrate form from fetched profile data on first load.
  // Ensures saved values are restored when returning to the Profile page
  // or refreshing the browser, without overwriting user edits.
  useEffect(() => {
    if (profile && !profileInitialized.current) {
      handleReset();
      profileInitialized.current = true;
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await profileApi.updateProfile({
        firstName,
        lastName,
        fatherName: fatherName || null,
        dateOfBirth: dateOfBirth || null,
        nationality: nationality || null,
        phone: phone || null,
        countryCallingCode: countryCallingCode || undefined,
        whatsappNumber: whatsappSameAsPhone ? phone : whatsappNumber || null,
        whatsappSameAsPhone,
        telegramUsername: telegramUsername || null,
        countryCode: countryCode || null,
        stateCode: stateCode || null,
        cityName: cityName || null,
        governorate: governorate || null,
        streetAddress: streetAddress || null,
        postalCode: postalCode || null,
        poBox: poBox || null,
        employmentStatus: employmentStatus || null,
        jobTitle: jobTitle || null,
        employer: employer || null,
        educationLevel: educationLevel || null,
        fieldOfStudy: fieldOfStudy || null,
      });
    },
    onSuccess: () => {
      toast.success(t("_authenticatedSettings.k55"));
      setIsDirty(false);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["is-admin", userId] });
    },
    onError: (e: unknown) => {
      // Map backend VALIDATION_ERROR details to specific fields
      const err = e as {
        response?: {
          status?: number;
          data?: { error?: { code?: string; message?: string; details?: Record<string, string[]> } };
        };
        message?: string;
      };
      const details = err?.response?.data?.error?.details;
      if (err?.response?.status === 422 && details && typeof details === "object") {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(details)) {
          if (Array.isArray(messages) && messages.length > 0) {
            const msg = messages[0];
            // Translate known validation messages; otherwise show raw backend message
            const knownKeys: Record<string, string> = {
              "First name must be at least 2 characters": "validation.minLengthArabic",
              "Last name must be at least 2 characters": "validation.minLengthArabic",
              "Date must be in YYYY-MM-DD format": "validation.dateFormat",
              "Date of birth cannot be in the future": "validation.dateFuture",
              "Country calling code must be in format +X, +XX, +XXX, or +XXXX": "validation.callingCodeFormat",
              "Telegram username must contain only letters, numbers, and underscores": "validation.telegramUsername",
              "Invalid phone number format": "validation.phone",
              "Phone number format is invalid": "validation.phone",
              "Phone number may only contain digits, spaces, +, - and ()": "validation.phone",
              "Phone number is required": "validation.phone",
            };
            fieldErrors[field] = knownKeys[msg] ? t(knownKeys[msg]) : msg;
          }
        }
        setErrors(fieldErrors);
        // Scroll to first invalid field
        const firstField = Object.keys(fieldErrors)[0];
        if (firstField) {
          const el = document.querySelector<HTMLElement>(`[data-field="${firstField}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        toast.error(t("errors.validationError"));
        return;
      }
      toast.error(err?.message || t("errors.generic"));
    },
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

  const completion = useMemo(
    () =>
      calculateProfileCompletion({
        firstName,
        lastName,
        email: profile?.email,
        phone,
        employmentStatus,
      }),
    [firstName, lastName, profile?.email, phone, employmentStatus],
  );

  // Full form validation before submission
  const handleSave = () => {
    const fieldErrors = validateProfile({
      firstName,
      lastName,
      fatherName: fatherName || null,
      dateOfBirth: dateOfBirth || null,
      nationality: nationality || null,
      phone: phone || null,
      countryCallingCode: countryCallingCode || undefined,
      whatsappNumber: whatsappSameAsPhone ? phone : whatsappNumber || null,
      telegramUsername: telegramUsername || null,
      countryCode: countryCode || null,
      stateCode: stateCode || null,
      cityName: cityName || null,
      governorate: governorate || null,
      streetAddress: streetAddress || null,
      postalCode: postalCode || null,
      poBox: poBox || null,
      employmentStatus: employmentStatus || null,
      jobTitle: jobTitle || null,
      employer: employer || null,
      educationLevel: educationLevel || null,
      fieldOfStudy: fieldOfStudy || null,
    } as Partial<ProfileFieldInput>);

    // Block submission while an incomplete/invalid number is visible in the
    // inputs (the shared schema above also guards, this catches in-progress text).
    if (!phoneValid) fieldErrors.phone = "validation.phone";
    if (!whatsappSameAsPhone && !whatsappValid)
      fieldErrors.whatsappNumber = "validation.whatsapp";

    // Required-field checks (required on UI but optional() in shared schema)
    if (!firstName.trim()) fieldErrors.firstName = t("validation.required");
    if (!lastName.trim()) fieldErrors.lastName = t("validation.required");

    if (Object.keys(fieldErrors).length > 0) {
      // Translate known keys into user-facing messages
      const translated: Record<string, string> = {};
      for (const [field, msg] of Object.entries(fieldErrors)) {
        translated[field] = msg.startsWith("validation.") ? t(msg) : msg;
      }
      setErrors(translated);
      const firstField = Object.keys(translated)[0];
      const el = document.querySelector<HTMLElement>(`[data-field="${firstField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(t("errors.validationError"));
      return;
    }

    setErrors({});
    saveProfile.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="card-luxe p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">
          {t("_authenticatedSettings.k2")}
        </h2>
        <div className="flex flex-wrap items-center gap-3 xs:gap-4">
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
                type="button"
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending}
                className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                {t("_authenticatedSettings.k10001")}
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("_authenticatedSettings.k3")}</p>
      </div>

      {/* Personal Information */}
      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center gap-2">
          <User className="h-4.5 w-4.5 text-gold shrink-0" />
          <h3 className="text-base font-bold text-foreground">{t("profile.personalInfo")}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FieldWrapper
            label={t("profile.firstName")}
            required
            helperText={t("profile.helper.firstName")}
            error={errors.firstName}
          >
            <div data-field="firstName">
              <input
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  handleFieldChange("firstName", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("firstName", firstName)}
                className={cn(inp, errors.firstName && "border-destructive focus:border-destructive")}
                placeholder={t("profile.firstNamePlaceholder")}
                aria-invalid={!!errors.firstName}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.lastName")}
            required
            helperText={t("profile.helper.lastName")}
            error={errors.lastName}
          >
            <div data-field="lastName">
              <input
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  handleFieldChange("lastName", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("lastName", lastName)}
                className={cn(inp, errors.lastName && "border-destructive focus:border-destructive")}
                placeholder={t("profile.lastNamePlaceholder")}
                aria-invalid={!!errors.lastName}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.fatherName")}
            optional
            helperText={t("profile.helper.fatherName")}
            error={errors.fatherName}
          >
            <div data-field="fatherName">
              <input
                value={fatherName}
                onChange={(e) => {
                  setFatherName(e.target.value);
                  handleFieldChange("fatherName", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("fatherName", fatherName)}
                className={cn(inp, errors.fatherName && "border-destructive focus:border-destructive")}
                placeholder={t("profile.fatherNamePlaceholder")}
                aria-invalid={!!errors.fatherName}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.dateOfBirth")}
            optional
            helperText={t("profile.helper.dateOfBirth")}
            error={errors.dateOfBirth}
          >
            <div data-field="dateOfBirth">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  handleFieldChange("dateOfBirth", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("dateOfBirth", dateOfBirth)}
                max={new Date().toISOString().split("T")[0]}
                className={cn(inp, errors.dateOfBirth && "border-destructive focus:border-destructive")}
                aria-invalid={!!errors.dateOfBirth}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.nationality")}
            optional
            helperText={t("profile.helper.nationality")}
            error={errors.nationality}
            className="sm:col-span-2"
          >
            <div data-field="nationality">
              <input
                value={nationality}
                onChange={(e) => {
                  setNationality(e.target.value);
                  handleFieldChange("nationality", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("nationality", nationality)}
                className={cn(inp, errors.nationality && "border-destructive focus:border-destructive")}
                placeholder={t("profile.nationalityPlaceholder")}
                aria-invalid={!!errors.nationality}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      {/* Contact Information */}
      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center gap-2">
          <Mail className="h-4.5 w-4.5 text-gold shrink-0" />
          <h3 className="text-base font-bold text-foreground">{t("profile.contactInfo")}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FieldWrapper label={t("account.email")} className="sm:col-span-2">
            <div
              dir="ltr"
              className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-2.5 text-sm text-muted-foreground text-start select-all"
            >
              {profile?.email ?? "—"}
            </div>
          </FieldWrapper>

          {/* Phone with Country Calling Code Selector */}
          <div data-field="phone" className="sm:col-span-2">
            <PhoneInput
              value={phone}
              onChange={(e164) => {
                setPhone(e164);
                handleFieldChange("phone", e164);
              }}
              countryCallingCode={countryCallingCode}
              onCountryCallingCodeChange={(code) => {
                setCountryCallingCode(code);
                handleFieldChange("countryCallingCode", code);
              }}
              onValidityChange={setPhoneValid}
              label={t("profile.phone")}
              helperText={t("profile.helper.phone")}
              error={errors.phone}
              required
            />
          </div>

          {/* WhatsApp Input */}
          <div data-field="whatsappNumber">
            <WhatsAppInput
              phone={phone}
              onChange={(e164) => {
                setWhatsappNumber(e164 ?? "");
                handleFieldChange("whatsappNumber", e164 ?? "");
              }}
              whatsAppCallingCode={countryCallingCode}
              onWhatsAppCallingCodeChange={(code) => {
                setCountryCallingCode(code);
                handleFieldChange("countryCallingCode", code);
              }}
              sameAsPhone={whatsappSameAsPhone}
              onSameAsPhoneChange={(checked) => {
                setWhatsappSameAsPhone(checked);
                if (checked && phone) {
                  setWhatsappNumber(phone);
                  handleFieldChange("whatsappNumber", phone);
                }
                setIsDirty(true);
              }}
              whatsAppNumber={whatsappNumber}
              label={t("profile.whatsapp")}
              helperText={t("profile.helper.whatsapp")}
              error={errors.whatsappNumber}
              onValidityChange={setWhatsappValid}
              disabled={whatsappSameAsPhone}
            />
          </div>

          {/* Telegram */}
          <FieldWrapper
            label={t("profile.telegram")}
            optional
            helperText={t("profile.helper.telegram")}
            error={errors.telegramUsername}
          >
            <div className="relative flex items-center" data-field="telegramUsername">
              <span className="pointer-events-none absolute start-3.5 text-sm text-muted-foreground select-none">
                @
              </span>
              <input
                value={telegramUsername}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/^@/, "").replace(/\s+/g, "");
                  setTelegramUsername(cleaned);
                  handleFieldChange("telegramUsername", cleaned);
                }}
                onBlur={() => validateFieldOnBlur("telegramUsername", telegramUsername)}
                className={cn(
                  inp,
                  "ps-8",
                  errors.telegramUsername && "border-destructive focus:border-destructive",
                )}
                dir="ltr"
                maxLength={50}
                placeholder={t("profile.telegramPlaceholder")}
                aria-invalid={!!errors.telegramUsername}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      {/* Address Information */}
      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center gap-2">
          <MapPin className="h-4.5 w-4.5 text-gold shrink-0" />
          <h3 className="text-base font-bold text-foreground">{t("profile.addressInfo")}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FieldWrapper
            label={t("profile.country")}
            optional
            helperText={t("profile.helper.country")}
            error={errors.countryCode}
          >
            <div data-field="countryCode">
              <CountrySelect
                value={countryCode}
                onChange={(val) => {
                  setCountryCode(val);
                  setStateCode("");
                  setCityName("");
                  setGovernorate("");
                  handleFieldChange("countryCode", val);
                }}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.city")}
            optional
            helperText={t("profile.helper.city")}
            error={errors.cityName}
          >
            <div data-field="cityName">
              <CitySelect
                value={cityName}
                onChange={(val) => {
                  setCityName(val);
                  handleFieldChange("cityName", val);
                }}
                countryIsoCode={countryCode || null}
                governorate={governorate || null}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.governorate")}
            optional
            helperText={t("profile.helper.governorate")}
            error={errors.governorate}
          >
            <div data-field="governorate">
              <GovernorateSelect
                value={governorate}
                onChange={(val) => {
                  setGovernorate(val);
                  const state = findStateByName(countryCode || "", val);
                  setStateCode(state?.isoCode ?? "");
                  setCityName("");
                  handleFieldChange("governorate", val);
                }}
                countryIsoCode={countryCode || null}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.postalCode")}
            optional
            helperText={t("profile.helper.postalCode")}
            error={errors.postalCode}
          >
            <div data-field="postalCode">
              <input
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  handleFieldChange("postalCode", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("postalCode", postalCode)}
                className={cn(inp, errors.postalCode && "border-destructive focus:border-destructive")}
                dir="ltr"
                placeholder={t("profile.postalCodePlaceholder")}
                aria-invalid={!!errors.postalCode}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.poBox")}
            optional
            helperText={t("profile.helper.poBox")}
            error={errors.poBox}
          >
            <div data-field="poBox">
              <input
                value={poBox}
                onChange={(e) => {
                  setPoBox(e.target.value);
                  handleFieldChange("poBox", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("poBox", poBox)}
                className={cn(inp, errors.poBox && "border-destructive focus:border-destructive")}
                placeholder={t("profile.poBoxPlaceholder")}
                aria-invalid={!!errors.poBox}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.streetAddress")}
            optional
            helperText={t("profile.helper.streetAddress")}
            error={errors.streetAddress}
            className="sm:col-span-2"
          >
            <div data-field="streetAddress">
              <input
                value={streetAddress}
                onChange={(e) => {
                  setStreetAddress(e.target.value);
                  handleFieldChange("streetAddress", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("streetAddress", streetAddress)}
                className={cn(inp, errors.streetAddress && "border-destructive focus:border-destructive")}
                placeholder={t("profile.streetAddressPlaceholder")}
                aria-invalid={!!errors.streetAddress}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      {/* Professional Information */}
      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center gap-2">
          <Briefcase className="h-4.5 w-4.5 text-gold shrink-0" />
          <h3 className="text-base font-bold text-foreground">{t("profile.professionalInfo")}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FieldWrapper
            label={t("profile.employmentStatus")}
            optional
            helperText={t("profile.helper.employmentStatus")}
            error={errors.employmentStatus}
          >
            <div data-field="employmentStatus">
              <select
                value={employmentStatus}
                onChange={(e) => {
                  setEmploymentStatus(e.target.value);
                  handleFieldChange("employmentStatus", e.target.value);
                }}
                className={cn(inp, errors.employmentStatus && "border-destructive focus:border-destructive")}
                aria-invalid={!!errors.employmentStatus}
              >
                <option value="">{t("common.notSpecified")}</option>
                <option value="employed">{t("profile.employed")}</option>
                <option value="self_employed">{t("profile.selfEmployed")}</option>
                <option value="business_owner">{t("profile.businessOwner")}</option>
                <option value="freelancer">{t("profile.freelancer")}</option>
                <option value="student">{t("profile.student")}</option>
                <option value="retired">{t("profile.retired")}</option>
                <option value="unemployed">{t("profile.unemployed")}</option>
                <option value="other">{t("profile.other")}</option>
              </select>
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.jobTitle")}
            optional
            helperText={t("profile.helper.jobTitle")}
            error={errors.jobTitle}
          >
            <div data-field="jobTitle">
              <input
                value={jobTitle}
                onChange={(e) => {
                  setJobTitle(e.target.value);
                  handleFieldChange("jobTitle", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("jobTitle", jobTitle)}
                className={cn(inp, errors.jobTitle && "border-destructive focus:border-destructive")}
                placeholder={t("profile.jobTitlePlaceholder")}
                aria-invalid={!!errors.jobTitle}
              />
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.employer")}
            optional
            helperText={t("profile.helper.employer")}
            error={errors.employer}
            className="sm:col-span-2"
          >
            <div data-field="employer">
              <input
                value={employer}
                onChange={(e) => {
                  setEmployer(e.target.value);
                  handleFieldChange("employer", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("employer", employer)}
                className={cn(inp, errors.employer && "border-destructive focus:border-destructive")}
                placeholder={t("profile.employerPlaceholder")}
                aria-invalid={!!errors.employer}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      {/* Education Information */}
      <div className="card-luxe p-6">
        <div className="mb-5 flex items-center gap-2">
          <GraduationCap className="h-4.5 w-4.5 text-gold shrink-0" />
          <h3 className="text-base font-bold text-foreground">{t("profile.educationInfo")}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FieldWrapper
            label={t("profile.educationLevel")}
            optional
            helperText={t("profile.helper.educationLevel")}
            error={errors.educationLevel}
          >
            <div data-field="educationLevel">
              <select
                value={educationLevel}
                onChange={(e) => {
                  setEducationLevel(e.target.value);
                  handleFieldChange("educationLevel", e.target.value);
                }}
                className={cn(inp, errors.educationLevel && "border-destructive focus:border-destructive")}
                aria-invalid={!!errors.educationLevel}
              >
                <option value="">{t("common.notSpecified")}</option>
                <option value="basic">{t("profile.educationBasic")}</option>
                <option value="secondary">{t("profile.educationSecondary")}</option>
                <option value="university">{t("profile.educationUniversity")}</option>
                <option value="postgraduate">{t("profile.educationPostgraduate")}</option>
                <option value="doctorate">{t("profile.educationDoctorate")}</option>
              </select>
            </div>
          </FieldWrapper>
          <FieldWrapper
            label={t("profile.fieldOfStudy")}
            optional
            helperText={t("profile.helper.fieldOfStudy")}
            error={errors.fieldOfStudy}
          >
            <div data-field="fieldOfStudy">
              <input
                value={fieldOfStudy}
                onChange={(e) => {
                  setFieldOfStudy(e.target.value);
                  handleFieldChange("fieldOfStudy", e.target.value);
                }}
                onBlur={() => validateFieldOnBlur("fieldOfStudy", fieldOfStudy)}
                className={cn(inp, errors.fieldOfStudy && "border-destructive focus:border-destructive")}
                placeholder={t("profile.fieldOfStudyPlaceholder")}
                aria-invalid={!!errors.fieldOfStudy}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      {/* Account Overview & Profile Completion */}
      <div className="card-luxe p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">{t("profile.accountInfo")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("_authenticatedSettings.k10002")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("profile.completion")}:
            </span>
            <span className="num text-sm font-bold text-gold">{completion.percentage}%</span>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden mb-6">
          <div
            className="h-full bg-gold-gradient rounded-full transition-all duration-500"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>

        <dl className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <InfoItem icon={Mail} label={t("account.email")} value={profile?.email ?? "—"} ltr />
          <InfoItem
            icon={Smartphone}
            label={t("account.number")}
            value={profile?.accountNumber ?? "—"}
            ltr
            mono
          />
          <InfoItem
            icon={ShieldCheck}
            label={t("account.type")}
            value={role ? (roleLabels[role] ?? role) : "—"}
          />
          <InfoItem
            icon={CheckCircle2}
            label={t("account.registered")}
            value={profile ? fmtDateTime(profile.createdAt) : "—"}
          />
        </dl>
      </div>

      {/* Sticky Save / Cancel Action Bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-border/80 bg-background/95 p-3 xs:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 xs:gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-start">
            {isDirty ? (
              <span className="text-gold font-semibold">{t("_authenticatedSettings.k10000")}</span>
            ) : (
              <span>{t("_authenticatedSettings.k3")}</span>
            )}
          </p>
          <div className="flex w-full sm:w-auto items-center gap-2 xs:gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saveProfile.isPending}
              className="flex-1 sm:flex-initial rounded-xl border border-border px-4 xs:px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saveProfile.isPending || isLoading}
              className="flex-1 sm:flex-initial bg-gold-gradient shadow-gold rounded-xl px-4 xs:px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              {saveProfile.isPending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>{t("common.saving")}</span>
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        </div>
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
          <dl className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 rounded-xl bg-secondary/60 p-4">
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

function Field({
  label,
  children,
  className,
  required,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label className="flex items-center justify-between text-sm font-semibold text-foreground">
        <span>
          {label}
          {required && <span className="ms-1 text-destructive">*</span>}
        </span>
        {optional && (
          <span className="text-xs font-normal text-muted-foreground/80">
            {t("common.optional")}
          </span>
        )}
      </label>
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
  value: React.ReactNode;
  ltr?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
        <span>{label}</span>
      </p>
      <div
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "mt-1.5 text-sm font-bold text-foreground break-words",
          ltr && "text-start",
          mono && "num",
        )}
      >
        {value}
      </div>
    </div>
  );
}
