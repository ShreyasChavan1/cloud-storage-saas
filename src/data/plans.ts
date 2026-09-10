// Marketing copy for the three seeded Nimbus tiers. Pricing.tsx overlays
// the live price/storage values returned by GET /payments/plans so the
// checkout cannot drift from the backend's actual billing configuration.
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
    id: 'free',
    name: 'Free',
    price: 0,
    cadence: 'mo',
    storageGB: 5,
    description: 'For getting your files off your desktop.',
    features: ['5 GB storage', '1 device sync', 'Basic sharing links', 'Community support'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    cadence: 'mo',
    storageGB: 100,
    description: 'For individuals who live in their files.',
    features: ['100 GB storage', 'Unlimited devices', 'Password-protected links', 'Version history (30 days)', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 24.99,
    cadence: 'mo',
    storageGB: 500,
    description: 'For teams sharing one source of truth.',
    features: ['500 GB pooled storage', 'Shared team folders', 'Admin controls', 'Version history (180 days)', 'SSO (coming soon)'],
  },
]
