/**
 * DB-backed sliding-window rate limiting for edge functions.
 *
 * Deliberately simple and soft: a race between concurrent requests can let a
 * couple of extra requests through. That is the correct trade-off here — these
 * limits stop abuse and runaway loops, not exact quotas.
 */

/** Hash the caller IP the same way everywhere (salted with the UTC day). */
export async function clientIpHash(req: Request): Promise<string> {
  const clientIp =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const encoder = new TextEncoder();
  const data = encoder.encode(clientIp + new Date().toDateString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns true when the caller has hit the limit for this bucket within the
 * window; otherwise records one hit and returns false. Fail-open on logging
 * errors: rate limiting must not take down the endpoint it protects.
 */
export async function isRateLimited(
  supabase: { from: (table: string) => any },
  bucketKey: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  try {
    const { count, error } = await supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", bucketKey)
      .gte("created_at", windowStart);
    if (error) {
      console.warn("rate limit check failed (fail-open)", error?.message);
      return false;
    }
    if ((count ?? 0) >= max) return true;
    const { error: insertError } = await supabase
      .from("rate_limit_events")
      .insert({ bucket_key: bucketKey });
    if (insertError) {
      console.warn("rate limit insert failed (fail-open)", insertError?.message);
    }
    return false;
  } catch (err) {
    console.warn("rate limit unavailable (fail-open)", err);
    return false;
  }
}
