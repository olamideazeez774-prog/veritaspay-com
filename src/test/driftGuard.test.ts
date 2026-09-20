/**
 * Drift guard: keeps client and server money rules, edge-function auth
 * posture, and migration grants in lockstep. If this test fails, someone
 * changed a money rule or auth surface in one place only — reconcile the
 * other side before shipping.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { AFFILIATE_REGISTRATION_FEE, PRODUCT_LISTING_FEE_STANDARD, WITHDRAWAL_FEE_TIERS, MIN_WITHDRAWAL_AMOUNT } from "@/lib/constants";
import { getWithdrawalFee as clientWithdrawalFee } from "@/lib/withdrawalFees";
import { estimatePaystackFee as clientPaystackFee } from "@/lib/paymentProcessingFee";
import { getWithdrawalFee as serverWithdrawalFee } from "../../supabase/functions/_shared/withdrawal-fees.ts";
import { estimatePaystackFeeKobo as serverPaystackFeeKobo } from "../../supabase/functions/_shared/payment-fees.ts";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const FUNCTIONS_DIR = resolve(ROOT, "supabase/functions");
const MIGRATIONS_DIR = resolve(ROOT, "supabase/migrations");

const read = (p: string) => readFileSync(p, "utf8");
const functionIndex = (name: string) =>
  read(resolve(FUNCTIONS_DIR, name, "index.ts"));

// ---------------------------------------------------------------------------
// 1. Money rules: canonical purpose amounts (server-owned)
// ---------------------------------------------------------------------------
describe("canonical purpose amounts", () => {
  const initSource = functionIndex("initialize-payment");
  const amountsBlock = initSource.match(
    /CANONICAL_PURPOSE_AMOUNTS[^=]*=\s*\{([\s\S]*?)\}/,
  );
  const serverAmounts: Record<string, number> = {};
  if (amountsBlock) {
    for (const m of amountsBlock[1].matchAll(/(\w+):\s*(\d+)/g)) {
      serverAmounts[m[1]] = Number(m[2]);
    }
  }

  it("are present for every paid non-sale purpose", () => {
    expect(Object.keys(serverAmounts).sort()).toEqual(
      ["affiliate_membership", "listing_fee", "premium_upgrade", "subscription", "verification"].sort(),
    );
  });

  it("match the client-facing constants exactly", () => {
    // The client constants are what users see; the server must charge the same.
    expect(serverAmounts.affiliate_membership).toBe(AFFILIATE_REGISTRATION_FEE);
    expect(serverAmounts.listing_fee).toBe(PRODUCT_LISTING_FEE_STANDARD);
  });

  it("reject client-supplied amounts in PaymentCallback queued intents", () => {
    const cb = read(resolve(ROOT, "src/pages/PaymentCallback.tsx"));
    const queueInit = cb.match(/initialize-payment",\s*\{\s*body:\s*\{([^}]*)\}/);
    expect(queueInit).toBeTruthy();
    expect(queueInit![1]).not.toMatch(/\bamount\b/);
  });
});

// ---------------------------------------------------------------------------
// 2. Money rules: withdrawal fee parity (client vs server)
// ---------------------------------------------------------------------------
describe("withdrawal fee parity", () => {
  const sweep: number[] = [];
  for (let n = 0; n <= 1_500_000; n += 25_000) sweep.push(n);
  sweep.push(MIN_WITHDRAWAL_AMOUNT, MIN_WITHDRAWAL_AMOUNT - 1, 9_999, 10_000, 20_000, 20_001);

  it("computes identical fees on client and server", () => {
    for (const n of sweep) {
      expect(clientWithdrawalFee(n)).toBe(serverWithdrawalFee(n));
    }
  });

  it("uses the same tier table as the client constants", () => {
    const tierBlock = read(
      resolve(FUNCTIONS_DIR, "_shared/withdrawal-fees.ts"),
    ).match(/TIERS\s*=\s*\[([\s\S]*?)\]/);
    expect(tierBlock).toBeTruthy();
    const serverTiers = Array.from(tierBlock![1].matchAll(/\{[^}]*\}/g)).map((t) =>
      Object.fromEntries(
        Array.from(t[0].matchAll(/(\w+):\s*([^,}]+)/g)).map((m) => [
          m[1],
          /POSITIVE_INFINITY/.test(m[2]) ? Number.POSITIVE_INFINITY : Number(m[2]),
        ]),
      ),
    );
    expect(serverTiers.length).toBe(WITHDRAWAL_FEE_TIERS.length);
    serverTiers.forEach((t, i) => {
      expect(t.min).toBe(WITHDRAWAL_FEE_TIERS[i].min);
      expect(t.max).toBe(WITHDRAWAL_FEE_TIERS[i].max);
      expect(t.fee).toBe(WITHDRAWAL_FEE_TIERS[i].fee);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Money rules: Paystack fee estimate parity
// ---------------------------------------------------------------------------
describe("paystack fee estimate parity", () => {
  const sweepNaira = [0, 100, 999, 2_500, 5_000, 12_000, 100_000, 2_499.99, 2_500, 500_000, 1_000_000];

  it("computes identical estimates (kobo) on client and server", () => {
    for (const naira of sweepNaira) {
      expect(Math.round(clientPaystackFee(naira) * 100)).toBe(
        serverPaystackFeeKobo(Math.round(naira * 100)),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Edge-function auth posture
// ---------------------------------------------------------------------------
describe("edge function auth coverage", () => {
  // Public by design: Paystack signature verification IS the auth; clicks are
  // anonymous by product; delivery is bearer-token gated; cleanup is cron-only.
  const PUBLIC_BY_DESIGN = new Set([
    "paystack-webhook",
    "paystack-callback",
    "track-click",
    "get-delivery",
    "cleanup-stale-payments",
  ]);

  const AUTH_PATTERNS = [
    /verifyAuth/,
    /requireAuth/,
    /authorizeAdmin/,
    /_shared\/auth/,
    /_shared\/verify-payment/,
    /getUser\(/,
    /is_admin\(\)/,
    /x-cron-secret|CRON_SECRET/,
  ];

  it("declares verify_jwt for every deployed function in config.toml", () => {
    const config = read(resolve(ROOT, "supabase/config.toml"));
    const fns = readdirSync(FUNCTIONS_DIR).filter((d) =>
      existsSync(resolve(FUNCTIONS_DIR, d, "index.ts")),
    );
    for (const fn of fns) {
      expect(config, `config.toml missing [functions.${fn}]`).toMatch(
        new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt`),
      );
    }
  });

  it("requires an explicit auth check in every non-public function", () => {
    const fns = readdirSync(FUNCTIONS_DIR).filter((d) =>
      existsSync(resolve(FUNCTIONS_DIR, d, "index.ts")),
    );
    for (const fn of fns) {
      if (PUBLIC_BY_DESIGN.has(fn)) continue;
      const src = functionIndex(fn);
      expect(
        AUTH_PATTERNS.some((p) => p.test(src)),
        `${fn} uses the service-role key but performs no auth check`,
      ).toBe(true);
    }
  });

  it("verifies Paystack signatures in money-bearing Paystack endpoints", () => {
    expect(functionIndex("paystack-webhook")).toMatch(/x-paystack-signature/i);
    // The callback path delegates verification to the shared HMAC verifier.
    expect(functionIndex("paystack-callback")).toMatch(/verify-payment|x-paystack-signature/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Migration grants: every RPC the app calls must end on a GRANT
// ---------------------------------------------------------------------------
describe("migration grant drift", () => {
  type Event = { fn: string; type: "revoke" | "grant"; file: string; line: number };
  const events: Event[] = [];

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // timestamp prefixes make lexical order = execution order

  for (const file of migrations) {
    const lines = read(resolve(MIGRATIONS_DIR, file)).split(/\r?\n/);
    lines.forEach((line, i) => {
      const grant = line.match(/GRANT (?:EXECUTE|ALL) ON FUNCTION (public\.\w+)/);
      if (grant) events.push({ fn: grant[1], type: "grant", file, line: i + 1 });
      const revoke = line.match(/REVOKE (?:ALL|EXECUTE) ON FUNCTION (public\.\w+)/);
      if (revoke) events.push({ fn: revoke[1], type: "revoke", file, line: i + 1 });
    });
  }

  const lastEventByFn = new Map<string, Event>();
  for (const e of events) lastEventByFn.set(e.fn, e);

  const rpcCalls = new Set<string>();
  const scanDirs = [
    ...readdirSync(FUNCTIONS_DIR)
      .filter((d) => existsSync(resolve(FUNCTIONS_DIR, d, "index.ts")))
      .map((d) => resolve(FUNCTIONS_DIR, d)),
    resolve(ROOT, "src"),
  ];
  for (const dirAbs of scanDirs)
    for (const file of readdirSync(dirAbs, { recursive: true })) {
      if (!/\.tsx?$/.test(String(file))) continue;
      const p = resolve(dirAbs, file as string);
      if (!existsSync(p)) continue;
      for (const m of read(p).matchAll(/\.rpc\(\s*"(\w+)"/g)) rpcCalls.add(m[1]);
    }

  it("re-grants every app-called RPC that was ever revoked", () => {
    const broken = [...lastEventByFn.entries()]
      .filter(([fn, e]) => e.type === "revoke" && rpcCalls.has(fn.replace("public.", "")))
      .map(([fn, e]) => `${fn} (last event: REVOKE at ${e.file}:${e.line})`);
    expect(broken, broken.join("; ")).toEqual([]);
  });

  it("explicitly grants create_verified_sale to service_role (P0 regression guard)", () => {
    const grantExists = migrations.some((f) =>
      read(resolve(MIGRATIONS_DIR, f)).match(
        /GRANT EXECUTE ON FUNCTION public\.create_verified_sale[\s\S]{0,400}?TO\s+service_role/,
      ),
    );
    expect(grantExists).toBe(true);
  });

  it("grants every app-called edge-function RPC to a caller that can reach it", () => {
    const missing: string[] = [];
    for (const fn of rpcCalls) {
      if (!lastEventByFn.has(`public.${fn}`)) continue; // never touched by migrations: default PUBLIC grant applies
      const last = lastEventByFn.get(`public.${fn}`)!;
      if (last.type === "revoke") {
        missing.push(`${fn} ends on REVOKE (${last.file}:${last.line})`);
      }
    }
    expect(missing, missing.join("; ")).toEqual([]);
  });
});
