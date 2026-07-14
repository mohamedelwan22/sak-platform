import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Buy SAK units in a land (BR-001..BR-009, BR-015). Atomic DB function. */
export const buySak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ landId: z.string().uuid(), sak: z.number().positive().max(100_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: holdingId, error } = await supabaseAdmin.rpc("fn_buy_sak", {
      p_user: context.userId,
      p_land: data.landId,
      p_sak: data.sak,
    });
    if (error) {
      const code = error.message;
      const messages: Record<string, string> = {
        KYC_001: "يجب اعتماد التحقق من الهوية (KYC) قبل الاستثمار",
        WALLET_001: "رصيد SAK غير كافٍ — قم بالإيداع أولاً",
        INV_001: "المخزون المتاح غير كافٍ لهذه الكمية",
        LAND_UNAVAILABLE: "هذا الأصل غير متاح للشراء حالياً",
      };
      const friendly = Object.keys(messages).find((k) => code.includes(k));
      throw new Error(friendly ? messages[friendly] : "تعذّر إتمام العملية، حاول مجدداً");
    }
    return { holdingId };
  });

/** Submit KYC documents. Marks profile as pending review. */
export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentType: z.enum(["national_id", "passport", "driver_license"]),
        frontPath: z.string().min(1).max(500),
        backPath: z.string().max(500).nullable(),
        selfiePath: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Prevent duplicate pending submission
    const { data: existing } = await supabaseAdmin
      .from("kyc_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);
    if (existing && existing.length > 0) throw new Error("لديك طلب تحقق قيد المراجعة بالفعل");

    // Paths must belong to the user
    for (const p of [data.frontPath, data.backPath, data.selfiePath]) {
      if (p && !p.startsWith(`${userId}/`)) throw new Error("مسار ملف غير صالح");
    }

    const { error: insErr } = await supabaseAdmin.from("kyc_submissions").insert({
      user_id: userId,
      document_type: data.documentType,
      front_image_path: data.frontPath,
      back_image_path: data.backPath,
      selfie_image_path: data.selfiePath,
    });
    if (insErr) throw new Error(insErr.message);

    const { error: profErr } = await supabaseAdmin.from("profiles").update({ kyc_status: "pending" }).eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "تم استلام طلب التحقق",
      body: "مستنداتك قيد المراجعة، سنعلمك بالنتيجة قريباً",
      category: "kyc",
    });

    return { ok: true };
  });
