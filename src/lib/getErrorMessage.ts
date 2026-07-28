import { AxiosError } from 'axios'

// Consistent error-message extraction from our backend's
// { success: false, error: { message } } envelope, used anywhere a
// mutation needs to show a real server message instead of a generic one.
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.error?.message
    if (typeof message === 'string') return message
  }
  return fallback
}
