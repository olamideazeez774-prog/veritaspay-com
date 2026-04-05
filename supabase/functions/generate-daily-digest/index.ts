import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with roles
    const { data: userRoles } = await supabase.from("user_roles").select("user_id, role");
    if (!userRoles?.length) {
      return new Response(JSON.stringify({ message: "No users to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userRoleMap = new Map<string, string[]>();
    userRoles.forEach(ur => {
      const existing = userRoleMap.get(ur.user_id) || [];
      existing.push(ur.role);
      userRoleMap.set(ur.user_id, existing);
    });

    // Get user emails for notifications
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name");
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    let digestsCreated = 0;

    for (const [userId, roles] of userRoleMap) {
      const isAffiliate = roles.includes("affiliate");
      const isVendor = roles.includes("vendor");
      if (!isAffiliate && !isVendor) continue;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let summaryData: Record<string, unknown> = {};

      if (isAffiliate) {
        const [salesRes, linksRes, walletRes] = await Promise.all([
          supabase.from("sales").select("total_amount, affiliate_commission").eq("affiliate_id", userId).gte("created_at", weekAgo),
          supabase.from("affiliate_links").select("clicks_count, conversions_count").eq("affiliate_id", userId),
          supabase.from("wallets").select("total_earned, withdrawable_balance").eq("user_id", userId).single(),
        ]);

        const totalSales = salesRes.data?.length || 0;
        const totalCommission = salesRes.data?.reduce((s, r) => s + (r.affiliate_commission || 0), 0) || 0;
        const totalClicks = linksRes.data?.reduce((s, l) => s + l.clicks_count, 0) || 0;
        const totalConversions = linksRes.data?.reduce((s, l) => s + l.conversions_count, 0) || 0;

        summaryData = {
          type: "affiliate",
          weekly_sales: totalSales,
          weekly_commission: totalCommission,
          total_clicks: totalClicks,
          total_conversions: totalConversions,
          conversion_rate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) + "%" : "0%",
          withdrawable: walletRes.data?.withdrawable_balance || 0,
          total_earned: walletRes.data?.total_earned || 0,
        };
      } else if (isVendor) {
        const [salesRes, walletRes] = await Promise.all([
          supabase.from("sales").select("total_amount, vendor_earnings").eq("vendor_id", userId).gte("created_at", weekAgo),
          supabase.from("wallets").select("total_earned, withdrawable_balance").eq("user_id", userId).single(),
        ]);

        summaryData = {
          type: "vendor",
          weekly_sales: salesRes.data?.length || 0,
          weekly_revenue: salesRes.data?.reduce((s, r) => s + r.total_amount, 0) || 0,
          weekly_earnings: salesRes.data?.reduce((s, r) => s + r.vendor_earnings, 0) || 0,
          withdrawable: walletRes.data?.withdrawable_balance || 0,
        };
      }

      let digestContent: Record<string, unknown> = summaryData;

      if (LOVABLE_API_KEY) {
        try {
          const prompt = isAffiliate
            ? `Generate a brief, encouraging daily digest for an affiliate marketer. Data: ${JSON.stringify(summaryData)}. Include: performance summary, tips to improve, and motivation. Keep it under 150 words.`
            : `Generate a brief daily digest for a vendor. Data: ${JSON.stringify(summaryData)}. Include: sales summary, optimization tips, and next steps. Keep it under 150 words.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a concise performance coach for an affiliate marketing platform called PayThos. Be encouraging and actionable." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            const aiText = result.choices?.[0]?.message?.content;
            if (aiText) {
              digestContent = { ...summaryData, summary: aiText };
            }
          }
        } catch (e) {
          console.error("AI digest generation failed:", e);
        }
      }

      // Insert digest
      await supabase.from("daily_digests").insert({
        user_id: userId,
        digest_type: isAffiliate ? "affiliate" : "vendor",
        content: digestContent,
      });
      digestsCreated++;

      // Send notification email via AI gateway (lightweight approach)
      const profile = profileMap.get(userId);
      if (profile?.email && LOVABLE_API_KEY) {
        try {
          const summaryText = typeof digestContent === "object" && "summary" in digestContent
            ? String(digestContent.summary)
            : `Your weekly performance digest is ready. Check your dashboard for details.`;
          
          // Log the notification - actual email delivery requires Resend integration
          console.log(`Daily digest notification prepared for ${profile.email}: ${summaryText.slice(0, 100)}...`);
        } catch (e) {
          console.error("Notification logging failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, digests_created: digestsCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily digest error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
