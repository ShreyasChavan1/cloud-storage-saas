import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'

export function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-lift">
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Nimbus Team
        </span>
        <h3 className="mt-3 font-display text-xl font-bold">Running out of room?</h3>
        <p className="mt-1.5 max-w-xs text-sm text-brand-100">
          Move to Team for 500GB of pooled storage and shared folders for everyone.
        </p>
        <Link
          to="/pricing"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-transform hover:-translate-y-0.5"
        >
          See plans
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
