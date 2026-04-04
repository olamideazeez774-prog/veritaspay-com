import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      contentGenerated: 0,
      alertsCreated: 0,
      optimizationsApplied: 0,
      errors: [] as string[],
    };

    // ======== 1. AUTO-GENERATE CONTENT FOR USERS ========
    const { data: activeUsers } = await supabase
      .from("ai_optimization_settings")
      .select("*")
      .eq("auto_generate_captions", true)
      .eq("auto_schedule_posts", true);

    for (const user of activeUsers || []) {
      try {
        const { data: links } = await supabase
          .from("affiliate_links")
          .select("id, product_id")
          .eq("affiliate_id", user.user_id)
          .limit(5);

        if (!links?.length) continue;

        for (const link of links) {
          // Fetch product separately to avoid nested type issues
          const { data: product } = await supabase
            .from("products")
            .select("id, title, description, commission_percent")
            .eq("id", link.product_id)
            .single();

          if (!product) continue;

          const { count: existing } = await supabase
            .from("ai_content_calendar")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id)
            .eq("affiliate_link_id", link.id)
            .gte("scheduled_at", new Date().toISOString())
            .in("status", ["draft", "scheduled"]);

          if (existing && existing > 0) continue;

          const { data: aiResult } = await supabase.functions.invoke("ai-insights", {
            body: {
              type: "caption_generator",
              data: {
                product_name: product.title,
                description: product.description?.slice(0, 200),
                platform: user.preferred_platforms?.[0] || "instagram",
              },
            },
          });

          if (aiResult?.result) {
            const now = new Date();
            const preferredTime = user.preferred_posting_times?.[0] || "09:00";
            const [hours, minutes] = preferredTime.split(":").map(Number);
            
            const scheduledAt = new Date(now);
            scheduledAt.setDate(scheduledAt.getDate() + 1);
            scheduledAt.setHours(hours, minutes, 0, 0);

            const { error: insertError } = await supabase.from("ai_content_calendar").insert({
              user_id: user.user_id,
              content_type: "social_post",
              platform: user.preferred_platforms?.[0] || "instagram",
              title: `Promote: ${product.title}`,
              content: aiResult.result,
              affiliate_link_id: link.id,
              scheduled_at: scheduledAt.toISOString(),
              status: "scheduled",
              ai_generated: true,
            });

            if (!insertError) {
              results.contentGenerated++;
            }
          }
        }
      } catch (err) {
        results.errors.push(`Content gen for user ${user.user_id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ======== 2. LOG RESULTS ========
    await supabase.from("system_logs").insert({
      event_type: "cron_job",
      related_type: "ai_autonomous",
      description: `AI autonomous job: ${results.contentGenerated} content items, ${results.alertsCreated} alerts`,
      metadata: {
        content_generated: results.contentGenerated,
        alerts_created: results.alertsCreated,
        errors: results.errors,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "AI autonomous job completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-autonomous-scheduler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});