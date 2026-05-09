# AI Budget Abuse Protection

## Problem

PatternDeck already has per-user limits for central AI usage and a global monthly failsafe. That protects against a single account spending too much and prevents unlimited total loss.

There is still a theoretical abuse path: an attacker can create many accounts and spend each account's allowance, draining the central AI budget until the global failsafe disables server-funded generation for everyone.

## Goal

Reduce the chance that one person can multiply their AI allowance by creating many accounts, while keeping the normal onboarding path smooth for legitimate learners.

## Recommended First Pass

1. Require stronger trust before meaningful central-key usage.
   - Let users create accounts freely.
   - Do not allow meaningful server-funded AI usage until the account has a verified email or trusted OAuth identity.
   - Apple/Google sign-in can be treated as stronger than raw email/password signup.

2. Give new accounts a tiny trial allowance.
   - New or low-trust accounts should receive only a very small central-key budget.
   - Example: enough to try one small feature, not enough to drain meaningful spend.
   - Users can unlock more by verifying email, using OAuth, aging normally, or adding their own API key.

3. Add IP-based and origin-based throttles.
   - Limit registrations per IP per hour/day.
   - Limit AI requests per IP across all accounts.
   - Limit central AI spend per IP or subnet per rolling window.
   - This specifically targets the many-accounts-from-one-origin attack.

4. Add rolling spend velocity limits.
   - Monthly limits are useful, but abuse can happen quickly.
   - Add global central-key limits per minute/hour/day.
   - Add per-user and per-IP spend limits per hour/day.
   - Add a special cap for accounts created in the last 24 hours.

## Later Hardening

- Add a user trust tier separate from admin/user role.
  - Signals could include verified email, OAuth provider, account age, normal study activity, no abuse flags, and own API key use.
  - This should integrate with the existing `user-tier.service.ts` / `getUserBudget(tier)` path.

- Require BYO API key after the free central trial for low-trust accounts.
  - The app already supports user-provided API keys, so this is a natural fallback.

- Degrade expensive AI actions for low-trust accounts.
  - Lower max tokens.
  - Use cheaper models where possible.
  - Cap generated card counts.
  - Restrict long streaming chat or explanation generation.
  - Queue background jobs more conservatively.

- Add basic abuse/risk tracking.
  - Track signals such as shared IPs, high account creation velocity, rapid generation after signup, repeated prompts, and abnormal spend velocity.
  - Start with simple rule-based scoring before considering anything more complex.

- Consider invite-code or waitlist mode if public abuse becomes likely.
  - This is heavy-handed, but effective for small-budget or beta deployments.

## Possible Data Model

Potential future tables or fields:

- `User.emailVerifiedAt`
- `User.trustTier` or `User.riskLevel`
- `User.createdIpHash`
- `UsageLedger.ipHash`
- `AbuseSignal`
- `AccountVerificationToken`

Avoid storing raw IP addresses unless there is a clear operational need. Prefer short-retention logs or salted hashes where practical.

## Implementation Notes

- Put account-level trust decisions close to the existing usage budget path, likely near `usage.service.ts`, `user-tier.service.ts`, and `global-config.service.ts`.
- Put signup/register throttles in the auth route layer.
- Put cross-account AI throttles in the server AI proxy path, before making Anthropic requests.
- Keep error messages generic enough that they do not reveal exact abuse thresholds.
- Capture analytics events for denied central-key usage so false positives can be reviewed.

## Suggested Order

1. Email verification gate for central-key usage.
2. Low default budget for brand-new accounts.
3. Registration and AI usage throttles by IP/subnet.
4. Rolling global/per-IP/per-new-account spend windows.
5. Trust tiers and admin controls.
