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
