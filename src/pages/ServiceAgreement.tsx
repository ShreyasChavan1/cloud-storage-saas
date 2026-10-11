import { Link } from 'react-router-dom'
import { AlertTriangle, Printer, ArrowRight } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import {
  AGREEMENT_VERSION,
  SHOW_TEMPLATE_BANNER,
  agreementSections,
  slaSummary,
} from '@/data/serviceAgreement'

const DOCUMENT_DATE = '10 October 2026'
const SUPPORT_EMAIL = 'dvtechnologies2026@gmail.com'
const CONTACT_PHONE = '9665579916'
const WEBSITE = 'www.dv-technologies.in'


function normalizeAgreementParagraph(text: string): string {
  return text
    .replace(/\[INSERT DATE\]/gi, DOCUMENT_DATE)
    .replace(
      /provided under the DVT brand (“DVT”, “we”, “us” or “our”)/i,
      'provided by the proprietor operating under the DVT Technologies brand (“DVT”, “we”, “us” or “our”)'
    )
    .replace(
      /scheduled or automatic backup/gi,
      'scheduled backup or other backup services where expressly included in the applicable plan or order'
    )
    .replace(
      /automatic backup/gi,
      'automated backup options where expressly included in the applicable plan or order'
    )
}

export default function ServiceAgreement() {
  return (
    <PublicLayout>
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[#132A4E] sm:text-4xl">
          DVT Storage Service Agreement (MSA + SLA)
        </h1>
        <p className="mt-2 text-[#0F8A99]">Website / Login Acceptance Version</p>
        <p className="mt-3 text-sm text-[#62645F]">
          Version: {AGREEMENT_VERSION} &nbsp;|&nbsp; Effective Date: {DOCUMENT_DATE} &nbsp;|&nbsp; Last Updated:{' '}
          {DOCUMENT_DATE}
        </p>
      </div>

      {SHOW_TEMPLATE_BANNER && (
        <div role="note" className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold uppercase tracking-wide">General template — legal review required before production use. DVT is currently operated under the DVT Technologies brand by its proprietor; no registered company name is represented here.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border border-[#CFC7B8] px-4 py-2 text-sm font-medium text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
        >
          <Printer className="h-4 w-4" />
          Print / save as PDF
        </button>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-md bg-[#E8792B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C9631D]"
        >
          Continue to sign up
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <nav aria-label="Agreement sections" className="mt-8 rounded-xl border border-[#DDD6C8] bg-white p-5 print:hidden">
        <h2 className="text-sm font-semibold text-[#132A4E]">Sections</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1 text-sm text-[#4F535A] sm:grid-cols-2">
          {agreementSections.map((s) => (
            <li key={s.number}>
              <a href={`#section-${s.number}`} className="transition hover:text-[#D86520]">
                {s.number}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="mt-10 space-y-8">
        {agreementSections.map((s) => (
          <section key={s.number} id={`section-${s.number}`} className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-[#132A4E]">
              {s.number}. {s.title}
            </h2>
            <div className="mt-2 space-y-3 text-sm leading-7 text-[#3F4652]">
              {s.paragraphs.map((p, i) => (
                <p key={i}>{normalizeAgreementParagraph(p)}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border border-[#DDD6C8] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#132A4E]">SLA Summary</h2>
          <p className="mt-2 text-sm leading-7 text-[#3F4652]">{normalizeAgreementParagraph(slaSummary)}</p>
        </section>

        <section className="rounded-xl border border-[#DDD6C8] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#132A4E]">Service Provider Contact</h2>
          <p className="mt-2 text-sm leading-7 text-[#3F4652]">
            DVT Technologies, operated by its proprietor.
          </p>
          <p className="text-sm leading-7 text-[#3F4652]">
            Email: <a className="font-medium text-[#0F8A99] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p className="text-sm leading-7 text-[#3F4652]">Phone: {CONTACT_PHONE}</p>
          <p className="text-sm leading-7 text-[#3F4652]">
            Website: <a className="font-medium text-[#0F8A99] hover:underline" href={`https://${WEBSITE}`}>{WEBSITE}</a>
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6C6A63]">
            Support, privacy, grievance and billing contact: {SUPPORT_EMAIL}
          </p>
        </section>
      </article>
    </PublicLayout>
  )
}
