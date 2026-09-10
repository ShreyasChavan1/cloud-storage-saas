import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { paymentsApi, BillingPlan } from '@/api/payments'
import { loadRazorpayCheckout } from '@/lib/razorpay'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { userApi } from '@/api/user'
import { useEffect, useState } from 'react'

const marketingByName: Record<string, { description: string; features: string[]; highlighted?: boolean }> = {
  basic: {
    description: 'For individuals who live in their files.',
    features: ['100 GB storage', 'Unlimited devices', 'Password-protected links', 'Version history (30 days)', 'Priority support'],
    highlighted: true,
  },
  pro: {
    description: 'For teams sharing one source of truth.',
    features: ['500 GB pooled storage', 'Shared team folders', 'Admin controls', 'Version history (180 days)', 'SSO (coming soon)'],
  },
}

const freePlan = {
  id: 'free',
  name: 'Free',
  price: '0.00',
  currency: 'INR',
  storageLimitGb: 5,
  description: 'For getting your files off your desktop.',
  features: ['5 GB storage', '1 device sync', 'Basic sharing links', 'Community support'],
}

function formatPrice(price: string) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

export default function Pricing() {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    paymentsApi.listPlans()
      .then((items) => {
        if (!mounted) return
        setPlans(items)
        setCatalogError(false)
      })
      .catch(() => {
        if (!mounted) return
        setPlans([])
        setCatalogError(true)
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const startAutopay = async (plan: BillingPlan) => {
    if (!user) return
    setLoadingPlan(plan.id)
    try {
      const checkout = await paymentsApi.createSubscription(plan.localPlanId)
      await loadRazorpayCheckout()
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable')

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'Nimbus',
        description: `${plan.name} subscription`,
        prefill: { name: user.name, email: user.email },
        handler: async (response: Record<string, string>) => {
          try {
            await paymentsApi.verifySubscription({
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            const refreshed = await userApi.getProfile()
            setUser(refreshed)
            showToast(`${plan.name} autopay is active.`)
            window.location.href = '/dashboard'
          } catch (err) {
            showToast(getErrorMessage(err, 'Payment authorization could not be verified.'), 'error')
          }
        },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
        theme: { color: '#4f46e5' },
      })
      razorpay.open()
    } catch (err) {
      setLoadingPlan(null)
      showToast(getErrorMessage(err, 'Could not start autopay.'), 'error')
    }
  }

  const paidPlans = plans.map((plan) => ({
    ...plan,
    marketing: marketingByName[plan.name.toLowerCase()] ?? {
      description: plan.description || 'A Nimbus cloud storage plan.',
      features: [`${plan.storageLimitGb} GB storage`],
    },
  }))

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? null : <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Simple pricing, generous storage</h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-500 dark:text-ink-400">Start free. Upgrade whenever your files outgrow the plan you're on. Cancel any time.</p>

        {catalogError && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            We couldn't load the current paid plans from Razorpay. Please try again in a moment.
          </div>
        )}

        {loading ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-[430px] animate-pulse rounded-3xl border border-line bg-surface-0 dark:border-dark-border dark:bg-dark-surface" />)}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative flex flex-col rounded-3xl border border-line bg-surface-0 p-7 text-left shadow-softer dark:border-dark-border dark:bg-dark-surface">
              <h3 className="font-display text-lg font-bold">{freePlan.name}</h3>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{freePlan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹{freePlan.price.replace('.00', '')}</span>
                <span className="text-sm text-ink-400">/mo</span>
              </div>
              <p className="mt-1 text-xs text-ink-400">{freePlan.storageLimitGb}GB storage</p>
              <ul className="mt-6 flex flex-col gap-3">
                {freePlan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{feature}</li>)}
              </ul>
              <Link to={user ? '/dashboard' : '/register'} className="mt-7">
                <Button variant="secondary" className="w-full">{user ? 'Current plan' : 'Start for free'}</Button>
              </Link>
            </div>

            {paidPlans.map((plan) => {
              const marketing = plan.marketing
              return (
                <div key={plan.id} className={cn('relative flex flex-col rounded-3xl border p-7 text-left transition-transform hover:-translate-y-1', marketing.highlighted ? 'border-brand-500 bg-surface-0 shadow-lift dark:bg-dark-surface' : 'border-line bg-surface-0 shadow-softer dark:border-dark-border dark:bg-dark-surface')}>
                  {marketing.highlighted && <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
                  <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{marketing.description}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold">₹{formatPrice(plan.price)}</span>
                    <span className="text-sm text-ink-400">/{plan.interval === 1 ? 'mo' : `${plan.period}`}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">{plan.storageLimitGb}GB storage</p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {marketing.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{feature}</li>)}
                  </ul>
                  {user ? (
                    user.plan?.toLowerCase() === plan.localPlanName.toLowerCase() ? (
                      <Button className="mt-7 w-full" variant="secondary" disabled>Current plan</Button>
                    ) : (
                      <Button className="mt-7 w-full" loading={loadingPlan === plan.id} onClick={() => startAutopay(plan)}>
                        Enable autopay
                      </Button>
                    )
                  ) : (
                    <Link to="/register" className="mt-7">
                      <Button variant={marketing.highlighted ? 'primary' : 'secondary'} className="w-full">Choose {plan.name}</Button>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
