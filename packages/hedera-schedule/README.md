# `@bookerbob/hedera-schedule`

Deferred hotel settlement on **Hedera testnet** via Scheduled Transactions.

## Who pays

| Role | Does |
|---|---|
| **Agent** | Asks for terms, locks a rate (`book_hash`), triggers schedule create |
| **Guest (human)** | Carries payment risk — deposit / pay-later / pay-at-checkout |
| **Gateway operator** (demo) | Signs the schedule on testnet so HashScan shows a real financial op |

Product rule: same room price; credential + **Graph context bands** (consented `address`) change *when* money moves, not *how much*.

## Flow

1. Underwriting says `rate_lock_pay_later` or `pay_at_checkout` (`earnsRateLock`).
2. `createSettlementSchedule` → `ScheduleCreate` wrapping an HBAR transfer → HashScan schedule URL.
3. At checkout, `executeSchedule` completes settlement → HashScan transaction URL.

## Env

```bash
LISBON2026_HEDERA_ACCOUNT_ID=0.0.x
LISBON2026_HEDERA_PRIVATE_KEY=...   # portal ECDSA hex ok (0x…)
# optional merchant/payee; default 0.0.98 (avoid self-transfer)
LISBON2026_HEDERA_PAYEE_ACCOUNT_ID=
```

## Graph stitch (gateway owns this)

This package never calls The Graph. The gateway does:

`GET /offers?address=` → `lookupContext` (context-bands MCP) → `decide()` →
if `earnsRateLock(terms)` → `scheduleForHold` → here.

Keep Graph/context changes in `apps/gateway/src/context.ts` + `terms.ts`; only
pass `partnerOrderId` into `createSettlementSchedule`.

## Scripts

```bash
npm run smoke -w @bookerbob/hedera-schedule   # account balance
npm run demo -w @bookerbob/hedera-schedule    # create + execute + print HashScan links
```
