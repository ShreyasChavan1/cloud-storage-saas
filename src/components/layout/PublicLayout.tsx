import { ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Shell for the public, logged-out document pages (Service Agreement,
// Company Profile, Client Requirement Form). Uses the same fixed navy/orange
// palette as Home.tsx so they read as part of the marketing site rather than
// the themed in-app UI.
export const publicLinks = [
  { to: '/company-profile', label: 'Company Profile' },
  { to: '/client-requirement-form', label: 'Client Requirement Form' },
  { to: '/service-agreement', label: 'Service Agreement' },
]

// These pages are designed on a fixed light background. The app's dark mode
// turns every unstyled heading/label white via the `dark` class on <html>,
// which leaves them invisible here — so keep that class off while a public
// page is mounted, and put it back (if it was on) when leaving. A
// MutationObserver is needed because ThemeProvider re-applies the class in
// its own effect, which runs after this one on first load.
function useForceLightMode() {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    const strip = () => root.classList.remove('dark')
    strip()
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) strip()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => {
      observer.disconnect()
      if (wasDark) root.classList.add('dark')
    }
  }, [])
}

export function PublicLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  useForceLightMode()
  return (
    <div className="public-page min-h-screen bg-[#F8F5EF] text-[#17233A]">
      <header className="border-b border-[#DDD6C8] bg-[#FFFDF9]">
        <div className="mx-auto flex h-[76px] max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/dalvi-vaultgrid-logo.png" alt="DV Technologies" className="h-14 w-auto object-contain" />
            <span className="hidden font-semibold tracking-tight text-[#132A4E] sm:block">DV Technologies</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F535A] transition hover:text-[#D86520]">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className={`mx-auto px-6 py-10 sm:py-14 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>{children}</main>

      <footer className="border-t border-[#DDD6C8] bg-[#132A4E]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-[#BFC9D7] sm:flex-row">
          <span>© {new Date().getFullYear()} DV Technologies. All rights reserved.</span>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {publicLinks.map((l) => (
              <Link key={l.to} to={l.to} className="transition hover:text-[#F29A58]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
