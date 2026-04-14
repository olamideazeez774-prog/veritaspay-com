export function buildCorsHeaders(req?: Request) {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req ? req.headers.get("origin") : null;

  let allowOrigin = "*";
  if (allowed.length > 0) {
    if (origin && allowed.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = allowed[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  } as Record<string, string>;
}
