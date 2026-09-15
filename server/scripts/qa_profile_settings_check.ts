/**
 * Focused QA check for Phase 02 Profile & Settings endpoints.
 * Run with: npx tsx scripts/qa_profile_settings_check.ts
 */
import { prisma } from "../src/lib/prisma.js";

const BASE = process.env.API_BASE ?? "http://127.0.0.1:3001/api/v1";
const EMAIL = "qa.investor.a@sak100.qa";
const PASSWORD = "Qa!Investor2026";

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail) });
}

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
  raw?: boolean,
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: raw ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: json };
}

function tinyPng(): Buffer {
  // 1x1 transparent PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
}

async function main() {
  const login = await api("POST", "/auth/login", undefined, {
    email: EMAIL,
    password: PASSWORD,
  });
  check("login ok", login.status === 200 && login.body?.success);
  const token = login.body?.data?.accessToken as string | undefined;
  if (!token) {
    check("access token issued", false);
    print();
    await prisma.$disconnect();
    return;
  }

  const before = (await api("GET", "/profile/me", token)).body?.data ?? {};
  const origFirst = before.firstName ?? "Qa";
  const origLast = before.lastName ?? "InvestorA";
  const origPhone = before.phone ?? null;

  // 1. PATCH profile with valid data
  const patched = await api("PATCH", "/profile", token, {
    firstName: "QaUpdate",
    lastName: "InvestorA",
    phone: "+966500000001",
  });
  check(
    "PATCH profile 200 + applied",
    patched.status === 200 &&
      patched.body?.data?.firstName === "QaUpdate" &&
      patched.body?.data?.phone === "+966500000001" &&
      patched.body?.data?.avatarUrl !== undefined,
    `${patched.status} first=${patched.body?.data?.firstName}`,
  );

  // 2. Whitelist: role/email/accountNumber must be ignored
  const escalate = await api("PATCH", "/profile", token, {
    firstName: "QaUpdate2",
    role: "admin",
    email: "hacked@sak100.com",
    accountNumber: "SAK999999",
    status: "suspended",
  });
  check(
    "PATCH ignores privileged fields",
    escalate.status === 200 &&
      escalate.body?.data?.firstName === "QaUpdate2" &&
      escalate.body?.data?.role?.name === "investor" &&
      escalate.body?.data?.email === EMAIL &&
      escalate.body?.data?.accountNumber === "SAK900001",
    `role=${JSON.stringify(escalate.body?.data?.role)} email=${escalate.body?.data?.email}`,
  );
  const froze = (await api("GET", "/profile/me", token)).body?.data ?? {};
  check(
    "role unchanged in DB",
    froze.role?.name === "investor" && froze.accountNumber === "SAK900001",
  );

  // 3. Validation errors
  const emptyPatch = await api("PATCH", "/profile", token, {});
  check("PATCH empty body 422", emptyPatch.status === 422);
  const badPhone = await api("PATCH", "/profile", token, {
    phone: "1".repeat(31),
  });
  check("PATCH phone too long 422", badPhone.status === 422);

  // 4. Avatar lifecycle
  const form = new FormData();
  form.append(
    "avatar",
    new Blob([tinyPng() as unknown as BlobPart], { type: "image/png" }),
    "avatar.png",
  );
  const up = await api("POST", "/profile/avatar", token, form as unknown as string, true);
  check(
    "avatar upload 201",
    up.status === 201 && up.body?.data?.avatarUrl?.startsWith("avatar/"),
    `${up.status}`,
  );
  const avatarHeader = await fetch(`${BASE}/profile/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(
    "avatar GET returns image",
    avatarHeader.status === 200 &&
      (avatarHeader.headers.get("content-type") ?? "").startsWith("image/"),
    `${avatarHeader.status} ${avatarHeader.headers.get("content-type")}`,
  );
  const up2 = await api("POST", "/profile/avatar", token, form as unknown as string, true);
  check("avatar replace 201", up2.status === 201, `${up2.status}`);
  const meAfterAvatar = (await api("GET", "/profile/me", token)).body?.data;
  check(
    "profile/me exposes avatarUrl",
    typeof meAfterAvatar?.avatarUrl === "string" && meAfterAvatar.avatarUrl?.length > 0,
  );
  const del = await api("DELETE", "/profile/avatar", token);
  check("avatar delete 200", del.status === 200 && del.body?.data?.avatarUrl === null);
  const afterDel = await fetch(`${BASE}/profile/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check("avatar GET after delete 404", afterDel.status === 404, `${afterDel.status}`);

  // 5. Notification preferences
  const prefs = await api("GET", "/notifications/preferences", token);
  check("GET preferences 200 array", prefs.status === 200 && Array.isArray(prefs.body?.data));
  const putPref = await api("PUT", "/notifications/preferences", token, {
    type: "profit",
    channel: "in_app",
    enabled: false,
  });
  check("PUT preference 200", putPref.status === 200 && putPref.body?.data?.enabled === false);
  const prefs2 = (await api("GET", "/notifications/preferences", token)).body?.data ?? [];
  check(
    "preference persisted",
    prefs2.some(
      (p: { type: string; channel: string; enabled: boolean }) =>
        p.type === "profit" && p.channel === "in_app" && p.enabled === false,
    ),
  );
  const putBack = await api("PUT", "/notifications/preferences", token, {
    type: "profit",
    channel: "in_app",
    enabled: true,
  });
  check("preference restored", putBack.status === 200 && putBack.body?.data?.enabled === true);

  // 6. Sessions
  const refreshToken = login.body?.data?.refreshToken as string | undefined;
  const sessionsRes = await fetch(`${BASE}/auth/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(refreshToken ? { "X-Current-Refresh-Token": refreshToken } : {}),
    },
  });
  const sessionsJson = (await sessionsRes.json()) as {
    data?: { isCurrent?: boolean }[];
  };
  check(
    "sessions 200 includes current",
    sessionsRes.status === 200 &&
      Array.isArray(sessionsJson?.data) &&
      sessionsJson?.data?.some((s) => s.isCurrent),
  );

  // 7. BLOCKED test: MFA absence (no TOTP endpoints exist -> nothing to hit)

  // Cleanup: restore original profile
  const cleanup = await api("PATCH", "/profile", token, {
    firstName: origFirst,
    lastName: origLast,
    phone: origPhone,
  });
  check("cleanup restore original profile", cleanup.status === 200);
  const final = (await api("GET", "/profile/me", token)).body?.data ?? {};
  check(
    "profile restored exactly",
    final.firstName === origFirst && final.lastName === origLast && final.phone == origPhone,
  );

  print();
  await prisma.$disconnect();
}

function print() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\nPASS ${passed}/${results.length}`);
  for (const f of failed) {
    console.log(`  ✗ ${f.name}${f.detail ? " — " + f.detail : ""}`);
  }
  for (const r of results.filter((x) => x.ok)) {
    console.log(`  ✓ ${r.name}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
