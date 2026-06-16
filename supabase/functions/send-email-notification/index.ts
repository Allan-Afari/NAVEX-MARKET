import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://navexmarket.com";
const FROM_ADDRESS = "noreply@navexmarket.com";

const emailTemplates: Record<string, (data: any) => { subject: string; html: string }> = {
  deal_interest: (data) => ({
    subject: `New Interest in "${data.deal_title}"`,
    html: `<h2>New Interest in "${data.deal_title}"</h2><p>An investor has expressed interest in your deal.</p><p><strong>Message:</strong> ${data.message || "No message provided"}</p><p><a href="${APP_URL}/deals/${data.deal_id}">View Deal</a></p>`,
  }),
  message: (data) => ({
    subject: `New message from ${data.sender_name}`,
    html: `<h2>New Message from ${data.sender_name}</h2><p>"${data.message_preview}"</p><p><a href="${APP_URL}/messages">Reply</a></p>`,
  }),
  milestone: (data) => ({
    subject: `Milestone Update: ${data.milestone_title}`,
    html: `<h2>Milestone Update</h2><p><strong>${data.milestone_title}</strong> on <strong>${data.deal_title}</strong></p><p>Status: ${data.status}</p><p><a href="${APP_URL}/deals/${data.deal_id}">View Deal</a></p>`,
  }),
  agreement: (data) => ({
    subject: "Agreement Ready for Signature",
    html: `<h2>Agreement Ready for Signature</h2><p><strong>${data.agreement_title}</strong></p><p><a href="${APP_URL}/agreements">Sign Agreement</a></p>`,
  }),
  verification: (data) => ({
    subject: `Verification ${data.status === "approved" ? "Approved" : "Status Update"}`,
    html: `<h2>Verification ${data.status === "approved" ? "Approved!" : "Status Update"}</h2><p>${data.reason || "Thank you for using Navex Market."}</p>`,
  }),
  welcome: (data) => ({
    subject: "Welcome to Navex Market",
    html: `<h1>Welcome to Navex Market, ${data.name}!</h1><p>Thank you for joining. Get started by exploring deals and connecting with other professionals.</p><p><a href="${APP_URL}/dashboard">Go to Dashboard</a></p>`,
  }),
  password_reset: (data) => ({
    subject: "Password Reset Request",
    html: `<h1>Password Reset</h1><p>Click the link below to reset your password:</p><p><a href="${data.reset_link}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
  }),
};

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — email not sent");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return false;
  }
  return true;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    let to: string;
    let subject: string;
    let html: string;
    const type: string = body.type || "direct";
    const related_id: string | undefined = body.related_id;

    if (body.to && body.subject && body.html) {
      // Direct send: { to, subject, html }
      to = body.to;
      subject = body.subject;
      html = body.html;
    } else if (body.type && body.to_email) {
      // Template-based: { type, to_email, ...templateData }
      const templateFn = emailTemplates[body.type];
      if (!templateFn) {
        return new Response(JSON.stringify({ error: `Unknown template type: ${body.type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rendered = templateFn(body);
      to = body.to_email;
      subject = rendered.subject;
      html = rendered.html;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid payload: provide {to,subject,html} or {type,to_email,...}" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sent = await sendViaResend(to, subject, html);

    // Audit trail
    await supabase.from("email_queue").insert({
      to_email: to,
      subject,
      body_html: html,
      notification_type: type,
      related_id: related_id || null,
      status: sent ? "sent" : "pending",
    }).then(({ error }) => {
      if (error) console.error("email_queue insert error:", error.message);
    });

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email-notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
