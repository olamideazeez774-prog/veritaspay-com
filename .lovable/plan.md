# Fix authentication and reconnect loose ends

## What's actually wrong right now

The backend itself is not answering requests. Every call to the database, auth, and data API from this session times out at the edge (HTTP 522), while the platform-level health check reports the instance as up. That is why sign-in, sign-up, and anything that loads data appear broken in the preview — the app code never gets a response. Nothing in the login page or auth logic can be verified as fixed until that is restored, so recovery comes first.

Two code-level issues are confirmed independently of the outage:

- The sale-processing function fails its type check: it reads a `received_amount_kobo` field from a pending-payment record that its own query never selects. This is in the build log today and blocks a clean deploy of that function.
- Sign-in refuses any account whose email is not confirmed, but confirmation email delivery is not configured. Per your choice, signups will be auto-confirmed for now so people can sign in immediately after registering.

## Plan

### 1. Restore the backend
- Re-check Cloud status, then restart the backend instance (needs your approval when the prompt appears).
- Poll until database and auth respond, then confirm with a live query that core tables (`profiles`, `user_roles`) and the signup trigger are present and readable.

### 2. Make authentication work end to end
- Turn on auto-confirm for email signups so a new account can sign in right away.
- Remove the client-side "verify your email first" block that would otherwise reject every account, keeping the ban and suspension checks intact.
- Keep the resend-verification path available but stop it from gating access.
- Confirm the signup trigger creates a profile and default role for a brand-new user; repair it if it does not.
- Confirm password reset works: `/forgot-password` sends a recovery link and `/reset-password` accepts a new password.
- Verify sign-out clears session state and protected routes redirect correctly.

### 3. Verify with a real browser run
Drive the running app headlessly: register a fresh account, sign in, land on the dashboard, pick a role, open wallet/marketplace/certificates, sign out, sign back in. Capture console and network errors and fix whatever surfaces.

### 4. Fix and redeploy the backend functions
- Correct the pending-payment query in the sale function so the amount field it uses is actually selected.
- Re-run the function type check until clean, then redeploy all edge functions so live code matches the repository.
- Re-check scheduled jobs (payout processing, earnings clearing, stale-payment cleanup) are still active after the restart.

### 5. Reconnect anything left dangling
- Sweep the app for reads/writes pointing at columns or tables that no longer exist after the referral removal, and for UI that renders data no query supplies.
- Re-check the admin verification-request list, wallet balances, payouts, leaderboard, and certificate claims against the live schema, fixing any mismatch found.
- Re-run the security linter and address whatever it flags on the routines touched.

### 6. Close out
Typecheck, build, confirm the build log is clean, and report what was fixed plus anything still outstanding (transactional email stays inactive until an email-sending key is added).

## Notes
- Email/password stays the only sign-in method; no Google button.
- Email verification is being deferred, not deleted — once email sending is live it can be switched back on in one step.
