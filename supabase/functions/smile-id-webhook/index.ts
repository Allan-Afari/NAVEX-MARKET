// Smile ID webhook — receives verification results
// Docs: https://docs.usesmileid.com/further-reading/callbacks
//
// Smile ID POSTs JSON when a job completes. We update the user's
// profile + create a verification_requests row so admins see the trail.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-smile-signature, x-smileid-signature",
};

const SMILE_API_KEY = Deno.env.get("SMILE_API_KEY");

const signatureHeaders = ["x-smile-signature", "x-smileid-signature", "x-signature"];

async function computeHmac(rawBody: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function getSignatureHeader(req: Request) {
  for (const header of signatureHeaders) {
    const value = req.headers.get(header);
    if (value) return value;
  }
  return null;
}

async function verifySignature(rawBody: string, signature: string) {
  const digest = await computeHmac(rawBody, SMILE_API_KEY!);
  const hex = bufferToHex(digest);
  const base64 = bufferToBase64(digest);

  return signature === hex || signature === base64;
}

// Smile ID result codes — full list: https://docs.usesmileid.com/further-reading/result-codes
const APPROVED_CODES = new Set(["0810", "1020", "1022"]); // verified
const REJECTED_CODES = new Set(["0811", "0812", "0911", "0912", "0921", "0922", "1023"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const rawBody = await req.text();
    const signature = SMILE_API_KEY ? getSignatureHeader(req) : null;
    if (SMILE_API_KEY) {
      if (!signature) {
        return new Response(JSON.stringify({ ok: false, error: "Missing signature header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const valid = await verifySignature(rawBody, signature);
      if (!valid) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Smile ID webhook payload:", JSON.stringify(payload));

    if (!userId) {
      console.warn("Webhook missing user_id in partner_params");
      return new Response(JSON.stringify({ ok: false, error: "missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newStatus: "verified" | "rejected" | "pending" = "pending";
    if (APPROVED_CODES.has(resultCode)) newStatus = "verified";
    else if (REJECTED_CODES.has(resultCode)) newStatus = "rejected";

    const updates: Record<string, unknown> = {
      smile_job_id: refId || null,
      smile_job_status: newStatus,
    };
    if (newStatus === "verified") {
      updates.verification_status = "verified";
      updates.smile_verified_at = new Date().toISOString();
    } else if (newStatus === "rejected") {
      updates.verification_status = "rejected";
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (updErr) console.error("profile update error:", updErr);

    // Audit row for admins
    await supabase.from("verification_requests").insert({
      user_id: userId,
      document_type: "smile_id_kyc",
      document_url: `smile_id://${refId || "unknown"}`,
      status: newStatus === "verified" ? "approved" : newStatus === "rejected" ? "rejected" : "pending",
      admin_notes: `Smile ID auto-verification — result code ${resultCode}`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smile-id-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
