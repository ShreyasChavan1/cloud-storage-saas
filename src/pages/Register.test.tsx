import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { MASTER_AGREEMENT_VERSION } from '@/data/masterAgreement'
import Register from './Register'

const mockRegister = vi.fn()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}))

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </ThemeProvider>
  )
}

function fillValidDetails() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Kapoor' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@example.com' } })
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+919876543210' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPassword123!' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRegister.mockResolvedValue({ user: {}, verificationRequired: true })
})

describe('Register — master service agreement', () => {
  it('starts unticked and links to both language versions, plus the storage schedule, in new tabs', () => {
    renderPage()
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    const expected: Array<[RegExp, string]> = [
      [/^English$/, '/master-agreement/en'],
      [/^मराठी$/, '/master-agreement/mr'],
      [/Storage Service Agreement/i, '/service-agreement'],
    ]
    for (const [name, href] of expected) {
      const link = screen.getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(href)
      expect(link.getAttribute('target')).toBe('_blank')
    }
  })

  it('warns and does not register when the agreement is not accepted', async () => {
    renderPage()
    fillValidDetails()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Please accept the Master Service Agreement to continue.')).toBeTruthy()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('registers with the agreement version once the box is ticked', async () => {
    renderPage()
    fillValidDetails()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1))
    expect(mockRegister).toHaveBeenCalledWith('Asha Kapoor', 'asha@example.com', '+919876543210', 'TestPassword123!', MASTER_AGREEMENT_VERSION)
    expect(MASTER_AGREEMENT_VERSION).toBe('2.0')
  })
})
