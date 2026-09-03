// New accounts start here. Must match a `name` seeded in prisma/seed.ts —
// kept as one constant so registration and seeding can't drift apart.
export const DEFAULT_PLAN_NAME = 'Free'

// Placeholder billing-cycle length (Phase 11A): every plan change sets
// Subscription.renewalDate to now + this many days, including free-tier
// ones (a $0 plan still nominally "renews," it just never charges).
// There's no actual recurring billing yet — nothing re-checks or acts on
// this date once it's set. That's Phase 11B's job; this constant exists
// so this phase's writes are at least consistent with whatever that
// eventually reads.
export const SUBSCRIPTION_PERIOD_DAYS = 30

// Phase 11B — how many days before `renewalDate` a user may repurchase the
// SAME plan they're already actively on and have it treated as a renewal
// (extending renewalDate) rather than rejected by createOrder's "you are
// already on this plan" guard. Also covers repurchasing after renewalDate
// has already passed (a subscription sitting PAST_DUE, say) — there's no
// upper bound past the date, only this lower one before it.
export const RENEWAL_WINDOW_DAYS = 7

// Phase 11B — how long a subscription stays PAST_DUE (renewalDate passed,
// no renewal payment received) before reconciliation.service.ts gives up
// waiting and downgrades it to Free with status EXPIRED. A grace window
// rather than an immediate downgrade so a renewal payment made a day or
// two late still lands on an unchanged plan.
export const PAST_DUE_GRACE_DAYS = 3
