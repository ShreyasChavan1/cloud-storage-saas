import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackForm } from './FeedbackForm'

const mockSubmit = vi.fn()
vi.mock('@/api/feedback', () => ({
  feedbackApi: { submit: (...args: unknown[]) => mockSubmit(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSubmit.mockResolvedValue({ id: 'f1' })
})

const submit = () => fireEvent.click(screen.getByRole('button', { name: /send feedback/i }))
const write = (text: string) =>
  fireEvent.change(screen.getByLabelText(/your feedback/i), { target: { value: text } })

describe('FeedbackForm', () => {
  it('asks for a rating and a description instead of sending an empty form', () => {
    render(<FeedbackForm />)
    submit()
    expect(screen.getByText('Please choose a star rating.')).toBeTruthy()
    expect(screen.getByText('Please tell us a little more.')).toBeTruthy()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('sends the rating and description and leaves the blank email out', async () => {
    render(<FeedbackForm />)
    fireEvent.click(screen.getByLabelText('4 stars'))
    write('  Great service  ')
    submit()
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1))
    expect(mockSubmit).toHaveBeenCalledWith({ rating: 4, description: 'Great service' })
    expect(await screen.findByText('Thank you for your feedback!')).toBeTruthy()
  })

  it('includes the email when one is given', async () => {
    render(<FeedbackForm />)
    fireEvent.click(screen.getByLabelText('5 stars'))
    write('Loved it')
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'asha@example.com' } })
    submit()
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    expect(mockSubmit).toHaveBeenCalledWith({ rating: 5, description: 'Loved it', email: 'asha@example.com' })
  })

  it('blocks a malformed email', () => {
    render(<FeedbackForm />)
    fireEvent.click(screen.getByLabelText('3 stars'))
    write('Fine')
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'nope' } })
    submit()
    expect(screen.getByText(/valid email address/i)).toBeTruthy()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows an error and keeps what was typed when sending fails', async () => {
    mockSubmit.mockRejectedValue(new Error('boom'))
    render(<FeedbackForm />)
    fireEvent.click(screen.getByLabelText('2 stars'))
    write('Needs work')
    submit()
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect((screen.getByLabelText(/your feedback/i) as HTMLTextAreaElement).value).toBe('Needs work')
  })
})
