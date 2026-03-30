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
      .select(`
        *,
        profiles!inner(full_name)
      `)
      .eq("auto_generate_captions", true)
      .eq("auto_schedule_posts", true);

    for (const user of activeUsers || []) {
      try {
        // Get user's affiliate links
        const { data: links } = await supabase
          .from("affiliate_links")
          .select("id, products(id, title, description, commission_percent)")
          .eq("affiliate_id", user.user_id)
          .limit(5);

        if (!links?.length) continue;

        // Generate content for each active link
        for (const link of links) {
          const product = link.products;
          if (!product) continue;

          // Check if we already have scheduled content for this product
          const { count: existing } = await supabase
            .from("ai_content_calendar")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id)
            .eq("affiliate_link_id", link.id)
            .gte("scheduled_at", new Date().toISOString())
            .in("status", ["draft", "scheduled"]);

          if (existing && existing > 0) continue; // Skip if already has upcoming content

          // Call AI to generate caption
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
            // Schedule for next preferred time
            const now = new Date();
            const preferredTime = user.preferred_posting_times?.[0] || "09:00";
            const [hours, minutes] = preferredTime.split(":").map(Number);
            
            const scheduledAt = new Date(now);
            scheduledAt.setDate(scheduledAt.getDate() + 1); // Tomorrow
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
              ai_prompt: `Generate caption for ${product.title}`,
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

    // ======== 2. GENERATE SMART ALERTS ========
    // Find trending products (high conversion rate in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: trendingProducts } = await supabase.rpc("get_trending_products", {
      since_date: sevenDaysAgo,
    });

    if (trendingProducts?.length) {
      for (const product of trendingProducts.slice(0, 5)) {
        try {
          // Create platform-wide alert for high-performing product
          const { error: alertError } = await supabase.from("ai_smart_alerts").insert({
            user_id: null, // Platform-wide
            alert_type: "opportunity",
            severity: "medium",
            title: `Trending: ${product.title}`,
            description: `This product has ${product.conversion_rate}% conversion rate in the last 7 days. Great opportunity for promotion!`,
            related_product_id: product.id,
            action_url: `/product/${product.id}`,
            action_text: "View Product",
            ai_analysis: {
              conversion_rate: product.conversion_rate,
              sales_count: product.sales_count,
              trend_direction: "up",
            },
          });

          if (!alertError) {
            results.alertsCreated++;
          }
        } catch (err) {
          results.errors.push(`Alert creation: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // ======== 3. OPTIMIZATION ALERTS ========
    // Find affiliates with declining performance
    const { data: decliningAffiliates } = await supabase.rpc("get_declining_affiliates", {
      days: 14,
    });

    if (decliningAffiliates?.length) {
      for (const affiliate of decliningAffiliates) {
        try {
          const { error: alertError } = await supabase.from("ai_smart_alerts").insert({
            user_id: affiliate.user_id,
            alert_type: "optimization",
            severity: "low",
            title: "Performance Optimization Suggested",
            description: `Your conversion rate has dropped ${affiliate.percent_change}% compared to last month. Consider refreshing your promotional strategy or trying new products.`,
            action_url: "/dashboard/toolkit",
            action_text: "Get AI Suggestions",
          });

          if (!alertError) {
            results.alertsCreated++;
          }
        } catch (err) {
          results.errors.push(`Optimization alert: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // ======== 4. LOG RESULTS ========
    await supabase.from("system_logs").insert({
      event_type: "cron_job",
      severity: results.errors.length > 0 ? "warning" : "info",
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
