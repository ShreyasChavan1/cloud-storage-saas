import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge, PriorityBadge, statusLabels } from '@/components/admin/clientFormBadges'
import { useAdminClientForm, useUpdateClientForm } from '@/hooks/useAdminClientForms'
import { ClientForm, ClientFormPriority, ClientFormStatus } from '@/api/clientForms'
import { detailFields, formSections, labelForKey, OTHER_SERVICE_KEY } from '@/data/clientForm'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

type Tri = '' | 'yes' | 'no'
const toTri = (v: boolean | null): Tri => (v === null ? '' : v ? 'yes' : 'no')
const fromTri = (v: Tri): boolean | null => (v === '' ? null : v === 'yes')

const selectClass =
  'h-11 w-full rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white'
const textareaClass =
  'w-full rounded-xl border border-line bg-surface-0 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm sm:col-span-2">{children}</dd>
    </div>
  )
}

function SubmissionView({ form }: { form: ClientForm }) {
  const known = new Set<string>([OTHER_SERVICE_KEY])
  formSections.forEach((s) => s.groups.forEach((g) => g.fields.forEach((f) => known.add(f.key))))
  const unknownKeys = Object.keys(form.answers).filter((k) => !known.has(k))
  const otherService = form.answers[OTHER_SERVICE_KEY]

  return (
    <>
      <Card className="p-6">
        <h2 className="text-sm font-medium">1. Client details</h2>
        <dl className="mt-3 divide-y divide-line dark:divide-dark-border">
          {detailFields.map((f) => (
            <Row key={f.key} label={f.label}>{form[f.key] || <span className="text-ink-400">—</span>}</Row>
          ))}
          <Row label="Submitted">{new Date(form.createdAt).toLocaleString()}</Row>
        </dl>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-sm font-medium">2. Services required</h2>
        <p className="mt-3 text-sm">{form.services.join(' · ')}</p>
        {typeof otherService === 'string' && otherService && (
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Other: {otherService}</p>
        )}
      </Card>

      {formSections.map((section) =>
        section.groups.map((group, gi) => {
          const rows = group.fields.filter((f) => {
            const v = form.answers[f.key]
            return Array.isArray(v) ? v.length > 0 : !!v
          })
          if (rows.length === 0) return null
          return (
            <Card key={`${section.id}-${gi}`} className="mt-5 p-6">
              <h2 className="text-sm font-medium">{section.title}{group.title ? ` — ${group.title}` : ''}</h2>
              <dl className="mt-3 divide-y divide-line dark:divide-dark-border">
                {rows.map((f) => {
                  const v = form.answers[f.key]
                  return <Row key={f.key} label={f.label}>{Array.isArray(v) ? v.join(', ') : v}</Row>
                })}
              </dl>
            </Card>
          )
        })
      )}

      {unknownKeys.length > 0 && (
        <Card className="mt-5 p-6">
          <h2 className="text-sm font-medium">Other answers</h2>
          <dl className="mt-3 divide-y divide-line dark:divide-dark-border">
            {unknownKeys.map((k) => {
              const v = form.answers[k]
              return <Row key={k} label={labelForKey(k)}>{Array.isArray(v) ? v.join(', ') : v}</Row>
            })}
          </dl>
        </Card>
      )}
    </>
  )
}

// Section 7 of the paper form ("DVT Internal Assessment"), plus the
// workflow status. Never shown to the client.
function AssessmentForm({ form }: { form: ClientForm }) {
  const { showToast } = useToast()
  const update = useUpdateClientForm(form.id)

  const [status, setStatus] = useState<ClientFormStatus>(form.status)
  const [priority, setPriority] = useState<ClientFormPriority>(form.priority)
  const [recommendedService, setRecommendedService] = useState(form.recommendedService ?? '')
  const [estimatedScope, setEstimatedScope] = useState(form.estimatedScope ?? '')
  const [suggestedArchitecture, setSuggestedArchitecture] = useState(form.suggestedArchitecture ?? '')
  const [thirdPartyServices, setThirdPartyServices] = useState(form.thirdPartyServices ?? '')
  const [migrationSetup, setMigrationSetup] = useState<Tri>(toTri(form.migrationSetup))
  const [customDevelopment, setCustomDevelopment] = useState<Tri>(toTri(form.customDevelopment))
  const [proposalRequiredBy, setProposalRequiredBy] = useState(form.proposalRequiredBy ?? '')
  const [technicalNotes, setTechnicalNotes] = useState(form.technicalNotes ?? '')

  // Re-sync if the server copy changes underneath us (e.g. after a save).
  useEffect(() => {
    setStatus(form.status)
    setPriority(form.priority)
    setRecommendedService(form.recommendedService ?? '')
    setEstimatedScope(form.estimatedScope ?? '')
    setSuggestedArchitecture(form.suggestedArchitecture ?? '')
    setThirdPartyServices(form.thirdPartyServices ?? '')
    setMigrationSetup(toTri(form.migrationSetup))
    setCustomDevelopment(toTri(form.customDevelopment))
    setProposalRequiredBy(form.proposalRequiredBy ?? '')
    setTechnicalNotes(form.technicalNotes ?? '')
  }, [form])

  const handleSave = () => {
    update.mutate(
      {
        status,
        priority,
        recommendedService: recommendedService.trim(),
        estimatedScope: estimatedScope.trim(),
        suggestedArchitecture: suggestedArchitecture.trim(),
        thirdPartyServices: thirdPartyServices.trim(),
        migrationSetup: fromTri(migrationSetup),
        customDevelopment: fromTri(customDevelopment),
        proposalRequiredBy: proposalRequiredBy || null,
        technicalNotes: technicalNotes.trim(),
      },
      {
        onSuccess: () => showToast('Assessment saved.'),
        onError: (err) => showToast(getErrorMessage(err, 'Could not save the assessment.'), 'error'),
      }
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-sm font-medium">7. DVT internal assessment</h2>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Staff only — clients never see this.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          Status
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as ClientFormStatus)}>
            {(Object.keys(statusLabels) as ClientFormStatus[]).map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          Priority
          <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as ClientFormPriority)}>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
        <Input label="Recommended service" value={recommendedService} onChange={(e) => setRecommendedService(e.target.value)} maxLength={200} />
        <Input label="Estimated storage / scope" value={estimatedScope} onChange={(e) => setEstimatedScope(e.target.value)} maxLength={500} />
        <Input label="Suggested architecture" value={suggestedArchitecture} onChange={(e) => setSuggestedArchitecture(e.target.value)} maxLength={1000} />
        <Input label="Third-party services" value={thirdPartyServices} onChange={(e) => setThirdPartyServices(e.target.value)} maxLength={500} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          Migration / setup
          <select className={selectClass} value={migrationSetup} onChange={(e) => setMigrationSetup(e.target.value as Tri)}>
            <option value="">Not decided</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          Custom development
          <select className={selectClass} value={customDevelopment} onChange={(e) => setCustomDevelopment(e.target.value as Tri)}>
            <option value="">Not decided</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <Input label="Proposal required by" type="date" value={proposalRequiredBy} onChange={(e) => setProposalRequiredBy(e.target.value)} />
      </div>

      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
        Key technical notes / risks / dependencies
        <textarea rows={4} className={textareaClass} value={technicalNotes} onChange={(e) => setTechnicalNotes(e.target.value)} maxLength={5000} />
      </label>

      <Button className="mt-5" onClick={handleSave} loading={update.isPending}>Save assessment</Button>
    </Card>
  )
}

export default function AdminClientFormDetail() {
  const { formId } = useParams<{ formId: string }>()
  const { data: form, isLoading, isError } = useAdminClientForm(formId)

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to admin
      </Link>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-400" /></div>
      ) : isError || !form ? (
        <p className="mt-10 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          Couldn't load this form.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{form.companyName}</h1>
            <StatusBadge status={form.status} />
            <PriorityBadge priority={form.priority} />
          </div>
          <p className="mt-1 text-ink-500 dark:text-ink-400">Client requirement &amp; discovery form</p>

          <div className="mt-6 space-y-5">
            <AssessmentForm form={form} />
            <div>
              <SubmissionView form={form} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
