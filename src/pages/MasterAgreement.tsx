import { Link } from 'react-router-dom'
import { AlertTriangle, Printer, ArrowRight, Download, Languages } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { useSupportContact } from '@/hooks/useSupportContact'
import { masterAgreement, MASTER_AGREEMENT_VERSION, AgreementLang } from '@/data/masterAgreement'
import { masterAgreementDetails } from '@/data/masterAgreementDetails'

// The DVT Master Service Agreement + SLA (v2.0), one page per language. Both
// routes render this component with a different `lang`; the text lives in
// data/masterAgreement.ts and the blanks in data/masterAgreementDetails.ts.
export default function MasterAgreement({ lang }: { lang: AgreementLang }) {
  const doc = masterAgreement[lang]
  const other = masterAgreement[lang === 'en' ? 'mr' : 'en']
  const { contact } = useSupportContact()
  const d = masterAgreementDetails
  const ph = doc.ui.placeholder

  const fill = (text: string) =>
    text
      .replace('{{PARTY}}', d.legalNameAndAddress || doc.ui.partyPlaceholder)
      .replace('{{CORRECTION_DAYS}}', d.correctionPeriodDays || '[7/14]')

  const email = contact?.email ?? '…'
  const fields: Array<[string, string]> = [
    [doc.ui.fields.legalName, d.legalName || ph],
    [doc.ui.fields.address, d.address || ph],
    [doc.ui.fields.supportEmail, email],
    [doc.ui.fields.privacyContact, email],
    [doc.ui.fields.billingContact, email],
    [doc.ui.fields.website, d.website || ph],
    [doc.ui.fields.gstin, d.gstin || ph],
  ]

  return (
    <PublicLayout>
      <div lang={doc.htmlLang}>
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#132A4E] sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-[#0F8A99]">{doc.subtitle}</p>
          <p className="mt-1 text-sm text-[#0F8A99]">{doc.tagline}</p>
          <p className="mt-3 text-sm text-[#62645F]">
            {doc.ui.version}: {MASTER_AGREEMENT_VERSION}
            {d.effectiveDate && (
              <>
                &nbsp;|&nbsp; {doc.ui.effectiveDate}: {d.effectiveDate}
              </>
            )}
          </p>
        </div>

        {d.showDraftNotice && (
          <div role="note" className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-semibold uppercase tracking-wide">Draft — legal review required before production use.</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <Link
            to={other.path}
            lang={other.htmlLang}
            className="inline-flex items-center gap-2 rounded-md border border-[#CFC7B8] px-4 py-2 text-sm font-medium text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
          >
            <Languages className="h-4 w-4" />
            {doc.ui.otherLanguageLabel}
          </Link>
          <a
            href={doc.pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[#CFC7B8] px-4 py-2 text-sm font-medium text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
          >
            <Download className="h-4 w-4" />
            {doc.ui.downloadPdf}
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-[#CFC7B8] px-4 py-2 text-sm font-medium text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
          >
            <Printer className="h-4 w-4" />
            {doc.ui.print}
          </button>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-md bg-[#E8792B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C9631D]"
          >
            {doc.ui.signUp}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <nav aria-label={doc.ui.sections} className="mt-8 rounded-xl border border-[#DDD6C8] bg-white p-5 print:hidden">
          <h2 className="text-sm font-semibold text-[#132A4E]">{doc.ui.sections}</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1 text-sm text-[#4F535A] sm:grid-cols-2">
            {[...doc.sections.map((s) => ({ number: s.number, title: s.title })), { number: 15, title: doc.ui.contactHeading }].map((s) => (
              <li key={s.number}>
                <a href={`#section-${s.number}`} className="transition hover:text-[#D86520]">
                  {s.number}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.number} id={`section-${s.number}`} className="scroll-mt-6">
              <h2 className="text-lg font-semibold text-[#132A4E]">
                {s.number}. {s.title}
              </h2>
              <div className="mt-2 space-y-3 text-sm leading-7 text-[#3F4652]">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{fill(p)}</p>
                ))}
              </div>
            </section>
          ))}

          <section id="section-15" className="scroll-mt-6 rounded-xl border border-[#DDD6C8] bg-white p-6">
            <h2 className="text-lg font-semibold text-[#132A4E]">15. {doc.ui.contactHeading}</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm leading-7 text-[#3F4652] sm:grid-cols-[minmax(0,14rem)_1fr]">
              {fields.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="font-medium text-[#132A4E]">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
              <div className="contents">
                <dt className="font-medium text-[#132A4E]">{doc.ui.version}</dt>
                <dd>{MASTER_AGREEMENT_VERSION}</dd>
              </div>
            </dl>
          </section>
        </article>
      </div>
    </PublicLayout>
  )
}
