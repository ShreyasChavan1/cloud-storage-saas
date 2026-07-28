// Static marketing/pricing content — intentionally NOT fetched from the
// backend. The `plans` Postgres table (seeded in Phase 3: Free/Basic/Pro)
// has no GET endpoint exposing it, so there's nothing to fetch even if
// this page wanted to; these are the same three tiers, just not wired to
// a live API since none exists.
export interface PricingPlan {
  id: string
  name: string
  price: number
  cadence: 'mo'
  storageGB: number
  description: string
  features: string[]
  highlighted?: boolean
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    cadence: 'mo',
    storageGB: 5,
    description: 'For getting your files off your desktop.',
    features: ['5 GB storage', '1 device sync', 'Basic sharing links', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    cadence: 'mo',
    storageGB: 100,
    description: 'For individuals who live in their files.',
    features: ['100 GB storage', 'Unlimited devices', 'Password-protected links', 'Version history (30 days)', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 28,
    cadence: 'mo',
    storageGB: 500,
    description: 'For teams sharing one source of truth.',
    features: ['500 GB pooled storage', 'Shared team folders', 'Admin controls', 'Version history (180 days)', 'SSO (coming soon)'],
  },
]
