import { FormEvent, useState } from 'react'
import { Star, Check, Loader2 } from 'lucide-react'
import { feedbackApi, FeedbackSubmission } from '@/api/feedback'
import { getErrorMessage } from '@/lib/getErrorMessage'

const inputClass =
  'w-full rounded-md border border-[#CFC7B8] bg-white px-3.5 py-2.5 text-sm text-[#17233A] placeholder:text-[#9A9A94] outline-none transition focus:border-[#E8792B] focus:ring-2 focus:ring-[#E8792B]/20'

const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']
const MAX_DESCRIPTION = 2000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  rating?: string
  description?: string
  email?: string
}

// Public home-page feedback form: 1-5 star rating, a description and an
// optional email. No account needed — the backend route is public and
// rate-limited; submissions are read from the admin dashboard.
export function FeedbackForm() {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const shownRating = hover || rating

  const reset = () => {
    setRating(0)
    setHover(0)
    setDescription('')
    setEmail('')
    setErrors({})
    setServerError(null)
    setDone(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next: FieldErrors = {}
    if (rating < 1) next.rating = 'Please choose a star rating.'
    if (description.trim().length < 3) next.description = 'Please tell us a little more.'
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address, or leave it blank.'
    setErrors(next)
    setServerError(null)
    if (Object.keys(next).length > 0) return

    const payload: FeedbackSubmission = { rating, description: description.trim() }
    if (email.trim()) payload.email = email.trim()

    setSubmitting(true)
    try {
      await feedbackApi.submit(payload)
      setDone(true)
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not send your feedback. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#D8D0C1] bg-white p-8 text-center sm:p-10" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8792B]/10 text-[#D86520]">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-[#132A4E]">Thank you for your feedback!</h3>
        <p className="mt-2 text-sm leading-6 text-[#62645F]">It has been sent to the DVT team.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-sm font-semibold text-[#D86520] transition hover:text-[#C9631D]"
        >
          Send another response
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-[#D8D0C1] bg-white p-6 sm:p-8">
      <fieldset>
        <legend className="text-sm font-medium text-[#253653]">Your rating</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              onMouseEnter={() => setHover(value)}
              className="cursor-pointer rounded p-0.5 focus-within:ring-2 focus-within:ring-[#E8792B]/40"
            >
              <input
                type="radio"
                name="feedback-rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                className="sr-only"
              />
              <Star
                className={`h-8 w-8 transition ${value <= shownRating ? 'fill-[#E8792B] text-[#E8792B]' : 'text-[#CFC7B8]'}`}
              />
            </label>
          ))}
          <span className="ml-3 text-sm text-[#62645F]">{shownRating ? ratingLabels[shownRating - 1] : 'Select a rating'}</span>
        </div>
        {errors.rating && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-5">
        <label htmlFor="feedback-description" className="text-sm font-medium text-[#253653]">
          Your feedback
        </label>
        <textarea
          id="feedback-description"
          rows={4}
          maxLength={MAX_DESCRIPTION}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is working well, and what could be better?"
          className={`mt-1.5 ${inputClass} ${errors.description ? 'border-red-500' : ''}`}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          {errors.description ? (
            <p role="alert" className="text-xs text-red-600">
              {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-[#85847E]">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="feedback-email" className="text-sm font-medium text-[#253653]">
          Email <span className="font-normal text-[#85847E]">(optional)</span>
        </label>
        <input
          id="feedback-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`mt-1.5 ${inputClass} ${errors.email ? 'border-red-500' : ''}`}
        />
        {errors.email ? (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.email}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[#85847E]">Only add it if you would like us to reply.</p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#E8792B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9631D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}
