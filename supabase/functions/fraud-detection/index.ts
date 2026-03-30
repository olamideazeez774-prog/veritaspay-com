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

    const { saleId, affiliateId, affiliateEmail, buyerEmail, productId } = await req.json();

    // Build fraud detection data
    const fraudData: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    // Get affiliate's recent activity if affiliateId provided
    if (affiliateId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Check for rapid conversions (more than 10 sales in 1 hour)
      const { count: recentSales } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateId)
        .gte("created_at", oneHourAgo);

      // Check daily sales volume
      const { count: dailySales } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateId)
        .gte("created_at", oneDayAgo);

      // Get affiliate's historical conversion rate
      const { data: affiliateLinks } = await supabase
        .from("affiliate_links")
        .select("clicks_count, conversions_count")
        .eq("affiliate_id", affiliateId);

      const totalClicks = affiliateLinks?.reduce((sum, link) => sum + (link.clicks_count || 0), 0) || 0;
      const totalConversions = affiliateLinks?.reduce((sum, link) => sum + (link.conversions_count || 0), 0) || 0;
      const historicalRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Check for previous fraud flags
      const { count: previousFlags } = await supabase
        .from("fraud_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", affiliateId)
        .gte("created_at", oneDayAgo);

      fraudData.affiliate = {
        recent_sales_1h: recentSales || 0,
        daily_sales: dailySales || 0,
        total_historical_clicks: totalClicks,
        total_historical_conversions: totalConversions,
        historical_conversion_rate: historicalRate.toFixed(2),
        previous_fraud_flags_24h: previousFlags || 0,
        rapid_conversion_suspicious: (recentSales || 0) > 10,
        high_daily_volume: (dailySales || 0) > 50,
        has_previous_flags: (previousFlags || 0) > 0,
      };
    }

    // Check for self-referral patterns
    if (affiliateEmail && buyerEmail) {
      fraudData.self_referral = {
        same_email: affiliateEmail.toLowerCase() === buyerEmail.toLowerCase(),
        similar_email: false, // Could add fuzzy matching logic
      };
    }

    // Check IP patterns if available
    const { data: recentClicks } = await supabase
      .from("clicks")
      .select("ip_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (recentClicks && recentClicks.length > 0) {
      // Count unique IPs
      const uniqueIps = new Set(recentClicks.map(c => c.ip_hash)).size;
      const ipRepetitionRate = 100 - ((uniqueIps / recentClicks.length) * 100);

      fraudData.ip_analysis = {
        recent_clicks_analyzed: recentClicks.length,
        unique_ips: uniqueIps,
        ip_repetition_rate: ipRepetitionRate.toFixed(2),
        suspicious_ip_clustering: ipRepetitionRate > 80, // >80% repetition is suspicious
      };
    }

    // Calculate overall fraud score (0-100)
    let fraudScore = 0;
    let riskFactors: string[] = [];

    if (fraudData.affiliate) {
      if (fraudData.affiliate.rapid_conversion_suspicious) {
        fraudScore += 30;
        riskFactors.push("Rapid conversions (>10 in 1 hour)");
      }
      if (fraudData.affiliate.high_daily_volume) {
        fraudScore += 20;
        riskFactors.push("High daily sales volume (>50)");
      }
      if (fraudData.affiliate.has_previous_flags) {
        fraudScore += 25;
        riskFactors.push("Previous fraud flags in 24h");
      }
      if (fraudData.affiliate.historical_conversion_rate > 50) {
        fraudScore += 15;
        riskFactors.push("Unusually high historical conversion rate");
      }
    }

    if (fraudData.self_referral?.same_email) {
      fraudScore += 50;
      riskFactors.push("Self-referral detected");
    }

    if (fraudData.ip_analysis?.suspicious_ip_clustering) {
      fraudScore += 20;
      riskFactors.push("Suspicious IP clustering");
    }

    // Cap score at 100
    fraudScore = Math.min(fraudScore, 100);

    // Determine severity
    let severity: "low" | "medium" | "high" = "low";
    if (fraudScore >= 70) severity = "high";
    else if (fraudScore >= 40) severity = "medium";

    // Auto-flag if score is high enough
    if (fraudScore >= 50 && affiliateId) {
      await supabase.from("fraud_events").insert({
        event_type: "auto_fraud_detected",
        severity,
        user_id: affiliateId,
        related_id: saleId || productId,
        related_type: saleId ? "sale" : "product",
        description: `Automated fraud detection: Score ${fraudScore}/100. Risk factors: ${riskFactors.join(", ")}`,
        status: "flagged",
        metadata: {
          fraud_score: fraudScore,
          risk_factors: riskFactors,
          analysis_data: fraudData,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fraud_score: fraudScore,
        severity,
        risk_factors: riskFactors,
        analysis: fraudData,
        auto_flagged: fraudScore >= 50,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fraud-detection:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
