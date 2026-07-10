import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { pricingPlans } from '@/data/dummyData'
import { cn } from '@/lib/cn'

export default function Pricing() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Simple pricing, generous storage</h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-500 dark:text-ink-400">
          Start free. Upgrade whenever your files outgrow the plan you're on — cancel any time.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-3xl border p-7 text-left transition-transform hover:-translate-y-1',
                plan.highlighted
                  ? 'border-brand-500 bg-surface-0 shadow-lift dark:bg-dark-surface'
                  : 'border-line bg-surface-0 shadow-softer dark:border-dark-border dark:bg-dark-surface'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">${plan.price}</span>
                <span className="text-sm text-ink-400">/{plan.cadence}</span>
              </div>
              <p className="mt-1 text-xs text-ink-400">{plan.storageGB}GB storage</p>

              <ul className="mt-6 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-7">
                <Button variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
                  {plan.price === 0 ? 'Start for free' : `Choose ${plan.name}`}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
