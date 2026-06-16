// Smile ID — create a hosted verification session
// Docs: https://docs.usesmileid.com/integration-options/hosted-web-integration
//
// Generates a Smile ID hosted-link URL the user can be redirected to.
// On completion, Smile ID POSTs results to the smile-id-webhook function.
//
// Required secrets (add via Lovable Cloud secrets):
//   SMILE_PARTNER_ID   — numeric partner ID from Smile ID portal
//   SMILE_API_KEY      — API key from Smile ID portal
//   SMILE_ENVIRONMENT  — "sandbox" or "production" (defaults to sandbox)
//   SMILE_CALLBACK_URL — optional override; defaults to this project's webhook URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMILE_BASE = {
  sandbox: "https://testapi.smileidentity.com/v1",
  production: "https://api.smileidentity.com/v1",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PARTNER_ID = Deno.env.get("SMILE_PARTNER_ID");
    const API_KEY = Deno.env.get("SMILE_API_KEY");
    const ENV = (Deno.env.get("SMILE_ENVIRONMENT") || "sandbox") as "sandbox" | "production";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!PARTNER_ID || !API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Smile ID not configured",
          message: "Add SMILE_PARTNER_ID and SMILE_API_KEY secrets to enable identity verification.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: identify the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callbackUrl =
      Deno.env.get("SMILE_CALLBACK_URL") || `${SUPABASE_URL}/functions/v1/smile-id-webhook`;

    // Create hosted web session
    // NOTE: Real Smile ID hosted-link API requires generating a signature with API_KEY.
    //       For sandbox we use the simpler /token endpoint pattern. This is the scaffold —
    //       once real keys are added, verify the request shape against the latest docs.
    const sessionRes = await fetch(`${SMILE_BASE[ENV]}/smile_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: PARTNER_ID,
        name: "Navex Market KYC",
        company_name: "Navex Market",
        id_types: [
          { country: "GH", id_type: "GHANA_CARD", verification_method: "biometric_kyc" },
          { country: "GH", id_type: "PASSPORT", verification_method: "biometric_kyc" },
          { country: "GH", id_type: "DRIVERS_LICENSE", verification_method: "biometric_kyc" },
        ],
        callback_url: callbackUrl,
        partner_params: { user_id: user.id },
        data_privacy_policy_url: `${new URL(req.url).origin}/privacy`,
      }),
    });

    const sessionData = await sessionRes.json();
    if (!sessionRes.ok) {
      console.error("Smile ID session error:", sessionData);
      return new Response(
        JSON.stringify({ error: "Smile ID session failed", details: sessionData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Track the job on the profile
    await supabase
      .from("profiles")
      .update({
        smile_job_id: sessionData.ref_id || sessionData.id || null,
        smile_job_status: "pending",
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ link: sessionData.link, ref_id: sessionData.ref_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("smile-id-create-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
