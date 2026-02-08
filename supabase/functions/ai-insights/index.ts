import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "fraud_scoring":
        systemPrompt = "You are a fraud detection analyst for an affiliate marketing platform. Analyze the provided data and return a fraud risk assessment.";
        userPrompt = `Analyze this activity for fraud patterns:\n${JSON.stringify(data)}\n\nProvide: risk_score (0-100), risk_level (low/medium/high/critical), flags (array of specific concerns), recommendation (hold/release/investigate).`;
        break;
      case "affiliate_coaching":
        systemPrompt = "You are a performance coach for affiliate marketers. Give actionable, specific advice based on real performance data.";
        userPrompt = `Based on this affiliate's performance data:\n${JSON.stringify(data)}\n\nProvide 3-5 specific, actionable suggestions to improve their conversion rate and earnings. Be concise and practical.`;
        break;
      case "product_matching":
        systemPrompt = "You are a product recommendation engine for an affiliate platform. Match affiliates with products they're most likely to sell well.";
        userPrompt = `Given this affiliate's performance history and available products:\n${JSON.stringify(data)}\n\nRecommend the top 3 products and explain why each is a good fit. Consider conversion rates, commission amounts, and niche alignment.`;
        break;
      case "commission_optimization":
        systemPrompt = "You are a commission strategy advisor for a digital product marketplace.";
        userPrompt = `Analyze these commission rules and sales data:\n${JSON.stringify(data)}\n\nSuggest optimizations to maximize both affiliate motivation and platform revenue. Include specific percentage recommendations.`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown insight type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
