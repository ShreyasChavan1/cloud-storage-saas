import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

// Shown instead of the form to visitors who are not signed in: feedback is for
// account holders only.
export function FeedbackSignInCard() {
  return (
    <div className="rounded-2xl border border-[#D8D0C1] bg-white p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8792B]/10 text-[#D86520]">
        <Star className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[#132A4E]">Sign in to share your feedback</h3>
      <p className="mt-2 text-sm leading-6 text-[#62645F]">
        Feedback can be left by DVT Solutions account holders. Sign in, or create an account, to rate your experience.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md bg-[#E8792B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9631D]"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center justify-center rounded-md border border-[#CFC7B8] px-6 py-3 text-sm font-semibold text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}
