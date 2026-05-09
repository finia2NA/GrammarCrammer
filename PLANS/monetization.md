# Monetization: Cost-based Usage Allowance

## Tiers

| Tier | Monthly AI Budget | Price |
|------|------------------|-------|
| Free | $1.00 | — |
| Pro  | $5.00 | $5.00/month |

Users spend their budget however they want — studying, generating explanations, using the AI editor, etc. No per-action credit tracking needed.

## Revenue model

Profit comes from users who don't exhaust their full $5 allowance in a given month, which is typical for subscription models.

## Implementation

Most of the infrastructure already exists:
- `UsageLedger` records the cost of every AI call
- `MonthlyUsageSummary` aggregates monthly cost per user
- `canUseCentralKey` already checks usage against dollar limits

Remaining work:
- Subscription status on the user (free vs paid)
- Pre-call check comparing `MonthlyUsageSummary.totalCost` against tier limit ($1 or $5)
- Subscription management via App Store / Google Play IAP
