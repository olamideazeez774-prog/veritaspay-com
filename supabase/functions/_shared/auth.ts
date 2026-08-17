import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

function constantTimeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

export function isTrustedInternalRequest(req: Request): boolean {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bearerToken = getBearerToken(req);
  if (serviceRoleKey && bearerToken && constantTimeEqual(bearerToken, serviceRoleKey)) {
    return true;
  }

  const configuredSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("CRON_SECRET") || "";
  const suppliedSecret = req.headers.get("x-internal-function-secret") || req.headers.get("x-cron-secret") || "";
  return Boolean(configuredSecret && suppliedSecret && constantTimeEqual(suppliedSecret, configuredSecret));
}

export async function getAuthenticatedUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function authFailureResponse(
  headers: Record<string, string>,
  message = "Unauthorized",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function forbiddenResponse(
  headers: Record<string, string>,
  message = "Forbidden",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
