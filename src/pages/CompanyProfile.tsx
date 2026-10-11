import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import {
  profileHero,
  introLetter,
  atAGlance,
  cloudServices,
  managedServices,
  clientBenefits,
  howWeWork,
  technologySecurity,
  capability,
  whyWorkWithUs,
  TitledItem,
} from '@/data/companyProfile'

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-[#132A4E]">{title}</h2>
      {subtitle && <p className="mt-1 text-[#0F8A99]">{subtitle}</p>}
    </div>
  )
}

function ItemGrid({ items, cols = 'sm:grid-cols-2' }: { items: TitledItem[]; cols?: string }) {
  return (
    <div className={`mt-5 grid gap-4 ${cols}`}>
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-[#DDD6C8] bg-white p-5">
          <h3 className="font-semibold text-[#132A4E]">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-[#4F535A]">{normalizeCompanyProfileText(item.text)}</p>
        </div>
      ))}
    </div>
  )
}

function normalizeCompanyProfileText(text: string): string {
  return text
    .replace(/^Automatic Backup$/i, 'Automated Storage & Backup Options')
    .replace(
      /^Scheduled backup helps reduce dependence on manual copying\.$/i,
      'Scheduled backup options may be available depending on the selected service or engagement.'
    )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#3F4652]">
          <Check className="mt-1 h-4 w-4 shrink-0 text-[#E8792B]" />
          <span>{normalizeCompanyProfileText(item)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function CompanyProfile() {
  return (
    <PublicLayout wide>
      {/* Cover */}
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[#132A4E] sm:text-5xl">{profileHero.title}</h1>
        <p className="mt-3 text-lg text-[#0F8A99]">{profileHero.tagline}</p>
        <p className="mt-1 font-semibold text-[#E8792B]">{profileHero.motto}</p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-px overflow-hidden rounded-xl bg-[#DDD6C8] sm:grid-cols-2">
          {profileHero.pillars.map((p) => (
            <div key={p.title} className="bg-[#F1F4F8] px-5 py-4">
              <div className="text-sm font-bold uppercase tracking-wide text-[#132A4E]">{p.title}</div>
              <div className="mt-1 text-sm text-[#3F4652]">{p.text}</div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-[#3F4652]">{profileHero.summary}</p>
        <p className="mt-6 text-xs text-[#6C6A63]">{profileHero.initiative}</p>
        <p className="text-xl italic text-[#132A4E]">{profileHero.founder}</p>
      </section>

      {/* Intro letter */}
      <section className="mt-16 rounded-2xl border border-[#DDD6C8] bg-white p-7 sm:p-10">
        <SectionHeading title={introLetter.heading} subtitle={introLetter.subheading} />
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#3F4652]">
          <p>{introLetter.salutation}</p>
          <p>{introLetter.greeting}</p>
          {introLetter.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="pt-2">
            <p>{introLetter.closing}</p>
            <p className="mt-2 font-semibold text-[#132A4E]">{introLetter.signatory}</p>
            <p>{introLetter.signatoryOrg}</p>
            <p className="text-[#6C6A63]">{introLetter.signatoryTagline}</p>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="mt-16">
        <SectionHeading title={atAGlance.heading} subtitle={atAGlance.subheading} />
        <p className="mt-4 text-sm leading-7 text-[#3F4652]">{atAGlance.intro}</p>
        <ItemGrid items={atAGlance.cards} />
        <h3 className="mt-8 font-semibold text-[#132A4E]">{atAGlance.whatWeDoHeading}</h3>
        <CheckList items={atAGlance.whatWeDo} />
      </section>

      {/* Cloud */}
      <section className="mt-16">
        <SectionHeading title={cloudServices.heading} subtitle={cloudServices.subheading} />
        <ItemGrid items={cloudServices.items} cols="sm:grid-cols-2 lg:grid-cols-3" />
        <p className="mt-5 font-medium italic text-[#132A4E]">{cloudServices.footnote}</p>
      </section>

      {/* Managed */}
      <section className="mt-16">
        <SectionHeading title={managedServices.heading} subtitle={managedServices.subheading} />
        <p className="mt-4 text-sm leading-7 text-[#3F4652]">{managedServices.intro}</p>
        <ItemGrid items={managedServices.items} cols="sm:grid-cols-2 lg:grid-cols-3" />
        <div className="mt-6 rounded-xl bg-[#F1F4F8] p-5">
          <h3 className="font-semibold text-[#132A4E]">{managedServices.managedHeading}</h3>
          <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{managedServices.managedText}</p>
        </div>
      </section>

      {/* Benefits */}
      <section className="mt-16">
        <SectionHeading title={clientBenefits.heading} subtitle={clientBenefits.subheading} />
        <ItemGrid items={clientBenefits.items} />
        <div className="mt-6 rounded-xl bg-[#F1F4F8] p-5">
          <h3 className="font-semibold text-[#132A4E]">{clientBenefits.whoHeading}</h3>
          <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{clientBenefits.whoText}</p>
        </div>
      </section>

      {/* How we work */}
      <section className="mt-16">
        <SectionHeading title={howWeWork.heading} subtitle={howWeWork.subheading} />
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {howWeWork.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-[#DDD6C8] bg-white p-5">
              <span className="text-sm font-bold text-[#E8792B]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 font-semibold text-[#132A4E]">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[#4F535A]">{step.text}</p>
            </li>
          ))}
        </ol>
        <h3 className="mt-8 font-semibold text-[#132A4E]">{howWeWork.engagementHeading}</h3>
        <CheckList items={howWeWork.engagement} />
      </section>

      {/* Tech, security, privacy */}
      <section className="mt-16">
        <SectionHeading title={technologySecurity.heading} subtitle={technologySecurity.subheading} />
        <h3 className="mt-5 font-semibold text-[#132A4E]">{technologySecurity.technologyHeading}</h3>
        <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{technologySecurity.technologyText}</p>
        <h3 className="mt-6 font-semibold text-[#132A4E]">{technologySecurity.securityHeading}</h3>
        <CheckList items={technologySecurity.security} />
        <h3 className="mt-6 font-semibold text-[#132A4E]">{technologySecurity.privacyHeading}</h3>
        <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{technologySecurity.privacyText}</p>
        <h3 className="mt-6 font-semibold text-[#132A4E]">{technologySecurity.continuityHeading}</h3>
        <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{technologySecurity.continuityText}</p>
      </section>

      {/* Capability */}
      <section className="mt-16">
        <SectionHeading title={capability.heading} subtitle={capability.subheading} />
        <p className="mt-4 text-sm leading-7 text-[#3F4652]">{capability.intro}</p>
        <h3 className="mt-6 font-semibold text-[#132A4E]">{capability.bringHeading}</h3>
        <CheckList items={capability.bring} />
        <h3 className="mt-6 font-semibold text-[#132A4E]">{capability.whyHeading}</h3>
        <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{capability.whyText}</p>
        <div className="mt-6 text-center font-semibold text-[#132A4E]">
          {capability.closingLines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="mt-16 overflow-hidden rounded-2xl border border-[#DDD6C8] bg-white">
        <div className="bg-[#0B3558] px-7 py-6 text-white">
          <h2 className="text-2xl font-semibold">{whyWorkWithUs.heading}</h2>
          <p className="mt-1 text-sm text-white/80">{whyWorkWithUs.subheading}</p>
        </div>
        <div className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {whyWorkWithUs.items.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-[#132A4E]">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#4F535A]">{item.text}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-lg font-semibold text-[#132A4E]">{whyWorkWithUs.commitmentHeading}</h3>
          <p className="mt-1.5 text-sm leading-7 text-[#3F4652]">{whyWorkWithUs.commitmentText}</p>
          <p className="mt-6 text-center text-[#132A4E]">{whyWorkWithUs.thanks}</p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-[#DDD6C8] bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-[#132A4E]">DVT Contact</h2>
        <p className="mt-2 text-sm text-[#3F4652]">DVT Technologies, operated by the proprietor</p>
        <p className="mt-1 text-sm text-[#3F4652]">
          Email: <a className="font-medium text-[#0F8A99] hover:underline" href="mailto:dvtechnologies2026@gmail.com">dvtechnologies2026@gmail.com</a>
        </p>
        <p className="mt-1 text-sm text-[#3F4652]">Phone: 9665579916</p>
        <p className="mt-1 text-sm text-[#3F4652]">
          Website: <a className="font-medium text-[#0F8A99] hover:underline" href="https://www.dv-technologies.in">www.dv-technologies.in</a>
        </p>
      </section>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/client-requirement-form"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#E8792B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9631D]"
        >
          Share your requirement
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/pricing"
          className="inline-flex items-center justify-center rounded-md border border-[#CFC7B8] px-6 py-3 text-sm font-semibold text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
        >
          View pricing
        </Link>
      </div>
    </PublicLayout>
  )
}
