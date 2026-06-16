import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Amounts are in pesewas (1 GHS = 100 pesewas). Currency: GHS.
const TIERS: Record<string, { amount: number; plan_code?: string }> = {
  pro: { amount: 15000 },      // GH₵150
  premium: { amount: 45000 },  // GH₵450
};
const CURRENCY = "GHS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "subscribe") {
      const { tier } = body;
      if (!tier || !TIERS[tier]) {
        return new Response(JSON.stringify({ error: "Invalid tier" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { amount } = TIERS[tier];

      // Initialize Paystack transaction
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount,
          currency: CURRENCY,
          metadata: {
            user_id: user.id,
            tier,
            type: "subscription",
          },
          callback_url: body.callback_url || undefined,
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        return new Response(JSON.stringify({ error: "Paystack error", details: paystackData.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record pending subscription
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        tier,
        status: "pending",
        amount: amount / 100,
        paystack_reference: paystackData.data.reference,
      });

      return new Response(JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { reference } = body;
      if (!reference) {
        return new Response(JSON.stringify({ error: "Reference required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const verifyData = await verifyRes.json();

      if (verifyData.data?.status === "success") {
        const meta = verifyData.data.metadata;
        
        if (meta?.type === "subscription") {
          // Activate subscription
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq("paystack_reference", reference);

          return new Response(JSON.stringify({ verified: true, tier: meta.tier }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (meta?.type === "featured_listing") {
          // Activate featured listing
          await supabase
            .from("featured_listing_payments")
            .update({ status: "paid" })
            .eq("paystack_reference", reference);

          await supabase
            .from("deals")
            .update({ is_featured: true })
            .eq("id", meta.deal_id);

          return new Response(JSON.stringify({ verified: true, deal_id: meta.deal_id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ verified: false, status: verifyData.data?.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "feature_deal") {
      const { deal_id } = body;
      if (!deal_id) {
        return new Response(JSON.stringify({ error: "deal_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const featureAmount = 5000; // GH₵50 in pesewas

      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: featureAmount,
          currency: CURRENCY,
          metadata: {
            user_id: user.id,
            deal_id,
            type: "featured_listing",
          },
          callback_url: body.callback_url || undefined,
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        return new Response(JSON.stringify({ error: "Paystack error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("featured_listing_payments").insert({
        deal_id,
        user_id: user.id,
        amount: featureAmount / 100,
        paystack_reference: paystackData.data.reference,
        status: "pending",
      });

      return new Response(JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Paystack checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
