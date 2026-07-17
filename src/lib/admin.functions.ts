import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthContext = {
  supabase: {
    rpc: (
      fn: "is_admin",
      args: { _user_id: string },
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
};

async function assertAdmin(context: AuthContext) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("غير مصرح لك بهذه العملية");
}

/* ---------- Dashboard stats ---------- */
export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [investors, pendingKyc, pendingDeposits, pendingWithdrawals, lands, holdings, price] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("kyc_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAdmin
          .from("payment_requests")
          .select("id", { count: "exact", head: true })
          .eq("type", "deposit")
          .eq("status", "pending"),
        supabaseAdmin
          .from("payment_requests")
          .select("id", { count: "exact", head: true })
          .eq("type", "withdrawal")
          .eq("status", "pending"),
        supabaseAdmin.from("lands").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("holdings").select("sak_owned").eq("status", "active"),
        supabaseAdmin.rpc("current_sak_price"),
      ]);

    const totalSak = (holdings.data ?? []).reduce((s, h) => s + Number(h.sak_owned), 0);
    const sakPrice = Number(price.data ?? 0);

    return {
      investors: investors.count ?? 0,
      pendingKyc: pendingKyc.count ?? 0,
      pendingDeposits: pendingDeposits.count ?? 0,
      pendingWithdrawals: pendingWithdrawals.count ?? 0,
      lands: lands.count ?? 0,
      aumUsd: totalSak * sakPrice,
      sakPrice,
    };
  });

/* ---------- KYC ---------- */
export const adminListKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("kyc_submissions")
      .select("*")
      .eq("status", data.status)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", userIds);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, profile: pmap.get(r.user_id) ?? null }));
  });

export const adminSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bucket: z.enum(["kyc-documents", "payment-proofs"]),
        path: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 1800);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const adminReviewKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    if (!data.approve && (!data.reason || data.reason.trim().length < 5))
      throw new Error("سبب الرفض مطلوب (5 أحرف على الأقل)");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error } = await supabaseAdmin
      .from("kyc_submissions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || sub.status !== "pending") throw new Error("طلب غير صالح");

    const status = data.approve ? "approved" : "rejected";
    await supabaseAdmin
      .from("kyc_submissions")
      .update({
        status,
        rejection_reason: data.approve ? null : data.reason,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    await supabaseAdmin.from("profiles").update({ kyc_status: status }).eq("id", sub.user_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: sub.user_id,
      title: data.approve ? "تم اعتماد التحقق من الهوية" : "تم رفض طلب التحقق",
      body: data.approve ? "يمكنك الآن الإيداع والاستثمار" : `السبب: ${data.reason}`,
      category: "kyc",
    });
    return { ok: true };
  });

/* ---------- Payment requests ---------- */
export const adminListPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ type: z.enum(["deposit", "withdrawal"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("payment_requests")
      .select("*")
      .eq("type", data.type)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, profile: pmap.get(r.user_id) ?? null }));
  });

export const adminReviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("payment_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || req.status !== "pending") throw new Error("طلب غير صالح أو تمت مراجعته");

    if (data.approve) {
      const fn = req.type === "deposit" ? "fn_approve_deposit" : "fn_approve_withdrawal";
      const { error: rpcErr } = await supabaseAdmin.rpc(fn, {
        p_request: data.id,
        p_admin: context.userId,
      });
      if (rpcErr) {
        if (rpcErr.message.includes("WALLET_001"))
          throw new Error("رصيد المستثمر غير كافٍ لهذا السحب");
        throw new Error(rpcErr.message);
      }
    } else {
      if (!data.reason || data.reason.trim().length < 5) throw new Error("سبب الرفض مطلوب");
      await supabaseAdmin
        .from("payment_requests")
        .update({
          status: "rejected",
          rejection_reason: data.reason,
          reviewed_by: context.userId,
          processed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: req.user_id,
        title: req.type === "deposit" ? "تم رفض طلب الإيداع" : "تم رفض طلب السحب",
        body: `السبب: ${data.reason}`,
        category: req.type,
      });
    }
    return { ok: true };
  });

/* ---------- Investors ---------- */
export const adminListInvestors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error }, { data: wallets }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("wallets").select("user_id, sak_balance"),
    ]);
    if (error) throw new Error(error.message);
    const wmap = new Map((wallets ?? []).map((w) => [w.user_id, Number(w.sak_balance)]));
    return (profiles ?? []).map((p) => ({ ...p, sak_balance: wmap.get(p.id) ?? 0 }));
  });

/* ---------- Lands ---------- */
const landSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable(),
  title_en: z.string().min(2).max(200),
  title_ar: z.string().min(2).max(200),
  description_ar: z.string().max(4000).default(""),
  description_en: z.string().max(4000).default(""),
  asset_type: z.enum(["land", "hotel", "mall", "warehouse", "resort", "agricultural"]),
  country: z.string().min(2).max(100),
  city: z.string().max(100).default(""),
  area_m2: z.number().min(0),
  total_sak_inventory: z.number().positive(),
  available_sak: z.number().min(0),
  maturity_months: z.number().int().positive().max(120),
  expected_roi: z.number().min(0).max(100),
  risk_level: z.enum(["none", "low", "medium", "high"]),
  status: z.enum(["draft", "active", "partially_sold", "sold_out", "closed"]),
  cover_image_url: z.string().max(500).nullable(),
});

export const adminSaveLand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => landSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...fields } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("lands").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("lands")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminListLands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("lands")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });
