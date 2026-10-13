import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123', role: 'USER' } }),
}))

import DesktopApp from './DesktopApp'
import MobileApp from './MobileApp'
import { NEXTCLOUD_SERVER_URL } from '@/components/app/NextcloudConnect'

const wrap = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Desktop App page', () => {
  it('offers Windows, macOS and Linux downloads that open safely in a new tab', () => {
    wrap(<DesktopApp />)
    for (const label of [/^windows$/i, /^macos$/i, /linux/i]) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('href')).toMatch(/^https:\/\//)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    }
  })

  it('shows the same connection details as the mobile page', () => {
    wrap(<DesktopApp />)
    expect(screen.getByText(NEXTCLOUD_SERVER_URL)).toBeTruthy()
    expect(screen.getByText('user-123')).toBeTruthy()
    expect(screen.getByText(/regular DVT account password/i)).toBeTruthy()
  })
})

describe('Mobile App page (unchanged behaviour after sharing components)', () => {
  it('still shows store links and the same connection details', () => {
    wrap(<MobileApp />)
    expect(screen.getByRole('link', { name: /ios/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /google play/i })).toBeTruthy()
    expect(screen.getByText(NEXTCLOUD_SERVER_URL)).toBeTruthy()
    expect(screen.getByText('user-123')).toBeTruthy()
  })
})
