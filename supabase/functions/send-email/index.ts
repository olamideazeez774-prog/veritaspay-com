import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SECURITY: this function must only be called from other edge functions (service role)
// or by authenticated admins. Reject any unauthenticated public callers.
async function isAuthorized(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<{ ok: boolean; viaAdmin?: string }> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false };

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  // Service-role calls (from other edge functions) are always allowed.
  // Anon-key calls are rejected even if the key is present.
  if (serviceKey && token === serviceKey) return { ok: true };

  // Authenticated admin fallback so admins can trigger notifications manually.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false };
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (role) return { ok: true, viaAdmin: data.user.id };
  return { ok: false };
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Senders this platform actually owns. Anything else is a spoofing attempt.
const ALLOWED_FROM = new Set([
  "noreply@mirvyn.com",
  "Mirvyn <noreply@mirvyn.com>",
  "support@mirvyn.com",
  "Mirvyn <support@mirvyn.com>",
  "hello@mirvyn.com",
  "Mirvyn <hello@mirvyn.com>",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authz = await isAuthorized(req, supabaseAdmin);
    if (!authz.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const { to, subject, html, from }: EmailRequest = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedFrom = (from || "").trim();
    if (requestedFrom && !ALLOWED_FROM.has(requestedFrom)) {
      return new Response(JSON.stringify({ error: "Unauthorized sender address" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sender = requestedFrom || "Mirvyn <noreply@mirvyn.com>";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ error: resendData.message || "Email send failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
