import { FormEvent, ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { clientFormsApi, FormAnswers } from '@/api/clientForms'
import { getErrorMessage } from '@/lib/getErrorMessage'
import {
  detailFields,
  DetailField,
  FormField,
  formSections,
  groupIsVisible,
  OTHER_SERVICE_KEY,
  sectionIsVisible,
  SERVICES,
  serviceOptions,
} from '@/data/clientForm'

type DetailKey = DetailField['key']
type Errors = Record<string, string>

const MOBILE_RE = /^\+?[0-9][0-9\s-]{6,18}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-md border border-[#CFC7B8] bg-white px-3.5 py-2.5 text-sm text-[#17233A] placeholder:text-[#9A9A94] outline-none transition focus:border-[#E8792B] focus:ring-2 focus:ring-[#E8792B]/20'

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#DDD6C8] bg-white">
      <div className="bg-[#0B3558] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-white/75">{hint}</p>}
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        selected
          ? 'border-[#E8792B] bg-[#E8792B] font-medium text-white'
          : 'border-[#CFC7B8] bg-white text-[#3F4652] hover:border-[#E8792B] hover:text-[#D86520]'
      }`}
    >
      {children}
    </button>
  )
}

function FieldLabel({ id, children, required }: { id: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={id} id={`${id}-label`} className="mb-1.5 block text-sm font-medium text-[#132A4E]">
      {children}
      {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
    </label>
  )
}

export default function ClientRequirementForm() {
  const [details, setDetails] = useState<Record<DetailKey, string>>({
    companyName: '', contactPerson: '', designation: '', mobile: '', email: '', industry: '', city: '', website: '',
  })
  const [services, setServices] = useState<string[]>([])
  const [answers, setAnswers] = useState<FormAnswers>({})
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [doneId, setDoneId] = useState<string | null>(null)

  const today = useMemo(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), [])
  const visibleSections = formSections.filter((s) => sectionIsVisible(s, services))

  const setAnswer = (key: string, value: string | string[]) => setAnswers((a) => ({ ...a, [key]: value }))

  const toggleService = (service: string) => {
    setServices((cur) => (cur.includes(service) ? cur.filter((s) => s !== service) : [...cur, service]))
    setErrors((e) => ({ ...e, services: '' }))
  }

  const selectSingle = (field: FormField, option: string) => {
    // Clicking the selected option again clears it — these are all optional.
    setAnswer(field.key, answers[field.key] === option ? '' : option)
  }

  const toggleMulti = (field: FormField, option: string) => {
    const current = Array.isArray(answers[field.key]) ? (answers[field.key] as string[]) : []
    if (current.includes(option)) {
      setAnswer(field.key, current.filter((o) => o !== option))
    } else if (field.exclusive?.includes(option)) {
      setAnswer(field.key, [option])
    } else {
      setAnswer(field.key, [...current.filter((o) => !field.exclusive?.includes(o)), option])
    }
  }

  const validate = (): Errors => {
    const next: Errors = {}
    for (const f of detailFields) {
      const value = details[f.key].trim()
      if (f.required && !value) next[f.key] = `${f.label} is required.`
    }
    if (!next.email && !EMAIL_RE.test(details.email.trim())) next.email = 'Enter a valid email address.'
    if (!next.mobile && !MOBILE_RE.test(details.mobile.trim())) next.mobile = 'Enter a valid mobile number.'
    if (services.length === 0) next.services = 'Select at least one service.'
    if (!confirmed) next.confirmed = 'Please confirm the details before submitting.'
    return next
  }

  // Only send answers for sections/groups that are actually on screen, and
  // drop blanks — otherwise switching a service off after filling its section
  // would still submit the hidden answers.
  const buildAnswers = (): FormAnswers => {
    const out: FormAnswers = {}
    for (const section of visibleSections) {
      for (const group of section.groups) {
        if (!groupIsVisible(group, services)) continue
        for (const field of group.fields) {
          const v = answers[field.key]
          if (typeof v === 'string' && v.trim()) out[field.key] = v.trim()
          else if (Array.isArray(v) && v.length > 0) out[field.key] = v
        }
      }
    }
    const other = (answers[OTHER_SERVICE_KEY] as string | undefined)?.trim()
    if (services.includes(SERVICES.other) && other) out[OTHER_SERVICE_KEY] = other
    return out
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setSubmitError('')
    const firstKey = Object.keys(found)[0]
    if (firstKey) {
      const el = document.getElementById(`field-${firstKey}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      const result = await clientFormsApi.submit({
        companyName: details.companyName.trim(),
        contactPerson: details.contactPerson.trim(),
        designation: details.designation.trim() || undefined,
        mobile: details.mobile.trim(),
        email: details.email.trim(),
        industry: details.industry.trim() || undefined,
        city: details.city.trim() || undefined,
        website: details.website.trim() || undefined,
        services,
        answers: buildAnswers(),
        confirmed: true,
      })
      setDoneId(result.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Could not submit the form. Please check your details and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (doneId) {
    return (
      <PublicLayout>
        <div className="rounded-xl border border-[#DDD6C8] bg-white p-8 text-center sm:p-12" role="status">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-semibold text-[#132A4E]">Thank you — we’ve received your requirement</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#3F4652]">
            DVT will review the above requirement and prepare a suitable Technical &amp; Commercial Proposal. Final scope,
            technology, pricing, timeline and support terms will be confirmed separately.
          </p>
          <p className="mt-4 text-xs text-[#6C6A63]">Reference: {doneId.slice(0, 8).toUpperCase()}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/" className="inline-flex items-center justify-center rounded-md bg-[#E8792B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9631D]">
              Back to home
            </Link>
            <Link to="/company-profile" className="inline-flex items-center justify-center rounded-md border border-[#CFC7B8] px-6 py-3 text-sm font-semibold text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]">
              Read our company profile
            </Link>
          </div>
        </div>
      </PublicLayout>
    )
  }

  const renderField = (field: FormField) => {
    const id = `field-${field.key}`
    const value = answers[field.key]
    if (field.type === 'text') {
      return (
        <div key={field.key}>
          <FieldLabel id={id}>{field.label}</FieldLabel>
          <input id={id} className={inputClass} value={(value as string) ?? ''} onChange={(e) => setAnswer(field.key, e.target.value)} maxLength={200} />
        </div>
      )
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          <FieldLabel id={id}>{field.label}</FieldLabel>
          <textarea id={id} rows={3} className={inputClass} value={(value as string) ?? ''} onChange={(e) => setAnswer(field.key, e.target.value)} maxLength={2000} />
        </div>
      )
    }
    const isMulti = field.type === 'multi'
    const selected = isMulti ? (Array.isArray(value) ? value : []) : value
    return (
      <div key={field.key}>
        <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium text-[#132A4E]">{field.label}</span>
        <div role={isMulti ? 'group' : 'radiogroup'} aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
          {field.options!.map((option) => (
            <Chip
              key={option}
              selected={isMulti ? (selected as string[]).includes(option) : selected === option}
              onClick={() => (isMulti ? toggleMulti(field, option) : selectSingle(field, option))}
            >
              {option}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  return (
    <PublicLayout>
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[#132A4E] sm:text-4xl">Client Requirement &amp; Discovery Form</h1>
        <p className="mt-2 text-[#0F8A99]">Cloud Storage • Data Protection • Managed Digital Services</p>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#62645F]">
          Tell us what you need and we’ll prepare a suitable proposal. Fields marked <span className="text-red-600">*</span> are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
        <Card title="1. Client Details">
          <div className="grid gap-4 sm:grid-cols-2">
            {detailFields.map((f) => (
              <div key={f.key}>
                <FieldLabel id={`field-${f.key}`} required={f.required}>{f.label}</FieldLabel>
                <input
                  id={`field-${f.key}`}
                  type={f.type}
                  className={`${inputClass} ${errors[f.key] ? 'border-red-500' : ''}`}
                  placeholder={f.placeholder}
                  value={details[f.key]}
                  maxLength={200}
                  aria-invalid={!!errors[f.key]}
                  aria-describedby={errors[f.key] ? `field-${f.key}-error` : undefined}
                  onChange={(e) => {
                    setDetails((d) => ({ ...d, [f.key]: e.target.value }))
                    if (errors[f.key]) setErrors((er) => ({ ...er, [f.key]: '' }))
                  }}
                />
                {errors[f.key] && <p id={`field-${f.key}-error`} className="mt-1 text-xs text-red-600">{errors[f.key]}</p>}
              </div>
            ))}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-[#132A4E]">Date</span>
              <p className="rounded-md bg-[#F1F4F8] px-3.5 py-2.5 text-sm text-[#3F4652]">{today}</p>
            </div>
          </div>
        </Card>

        <Card title="2. Services Required" hint="Tick all that apply.">
          <div id="field-services" role="group" aria-label="Services required" className="flex flex-wrap gap-2">
            {serviceOptions.map((s) => (
              <Chip key={s} selected={services.includes(s)} onClick={() => toggleService(s)}>
                {s}
              </Chip>
            ))}
          </div>
          {services.includes(SERVICES.other) && (
            <div>
              <FieldLabel id={`field-${OTHER_SERVICE_KEY}`}>Please describe the other service</FieldLabel>
              <input
                id={`field-${OTHER_SERVICE_KEY}`}
                className={inputClass}
                maxLength={200}
                value={(answers[OTHER_SERVICE_KEY] as string) ?? ''}
                onChange={(e) => setAnswer(OTHER_SERVICE_KEY, e.target.value)}
              />
            </div>
          )}
          {errors.services && <p className="text-xs text-red-600" role="alert">{errors.services}</p>}
          {services.length > 0 && visibleSections.length === 1 && (
            <p className="text-xs text-[#6C6A63]">Only the sections relevant to your selection are shown below.</p>
          )}
        </Card>

        {visibleSections.map((section) => (
          <Card key={section.id} title={section.title} hint={section.hint}>
            {section.groups
              .filter((g) => groupIsVisible(g, services))
              .map((group, i) => (
                <div key={group.title ?? i} className="space-y-5">
                  {group.title && (
                    <h3 className="border-b border-[#DDD6C8] pb-1.5 text-sm font-bold uppercase tracking-wide text-[#0F8A99]">{group.title}</h3>
                  )}
                  {group.fields.map(renderField)}
                </div>
              ))}
          </Card>
        ))}

        <Card title="8. Next Step">
          <p className="text-sm leading-7 text-[#3F4652]">
            DVT will review the above requirement and prepare a suitable Technical &amp; Commercial Proposal. Final scope, technology,
            pricing, timeline and support terms will be confirmed separately.
          </p>
          <label id="field-confirmed" className="flex cursor-pointer items-start gap-3 text-sm text-[#132A4E]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked)
                if (e.target.checked) setErrors((er) => ({ ...er, confirmed: '' }))
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#E8792B]"
              aria-describedby={errors.confirmed ? 'confirmed-error' : undefined}
            />
            <span>I confirm that the information above is correct and that DVT may contact me about this requirement.</span>
          </label>
          {errors.confirmed && <p id="confirmed-error" role="alert" className="text-xs text-red-600">{errors.confirmed}</p>}
        </Card>

        {submitError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#E8792B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#C9631D] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit requirement
        </button>
      </form>
    </PublicLayout>
  )
}
