import { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const highlights = [
  'Bank-grade encryption on every file, always on.',
  'Sync across every device in real time.',
  'Share links that expire exactly when you want.',
]

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-20">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm animate-fade-up py-12">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-ink-500 dark:text-ink-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="text-center text-xs text-ink-400">© 2026 Nimbus Storage, Inc.</p>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-brand-600 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12), transparent 45%)',
          }}
        />
        <div className="relative z-10 max-w-md">
          <p className="font-display text-2xl font-semibold leading-snug text-white">
            "Every file we own now lives in one calm, findable place."
          </p>
          <p className="mt-3 text-sm text-brand-100">Meera Iyer, Studio Alcove</p>

          <div className="mt-12 flex flex-col gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
                <span className="text-sm text-brand-50">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating file card decoration */}
        <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-3xl bg-white/5 backdrop-blur-sm" />
        <div className="absolute -top-16 right-24 h-40 w-40 rounded-3xl bg-white/5 backdrop-blur-sm" />
      </div>
    </div>
  )
}
