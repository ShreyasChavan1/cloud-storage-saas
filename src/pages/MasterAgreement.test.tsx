import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useSupportContact', () => ({
  useSupportContact: () => ({ contact: { email: 'help@dvt.example', phone: '123' }, isLoading: false }),
}))

import MasterAgreement from './MasterAgreement'

const page = (lang: 'en' | 'mr') =>
  render(
    <MemoryRouter>
      <MasterAgreement lang={lang} />
    </MemoryRouter>
  )

describe('MasterAgreement page', () => {
  it('shows the English agreement with a link to the Marathi page and its PDF', () => {
    page('en')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('DVT Master Service Agreement + SLA')
    expect(screen.getByRole('heading', { name: /1\. Parties, Acceptance and Priority/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'मराठीत वाचा' }).getAttribute('href')).toBe('/master-agreement/mr')
    const pdf = screen.getByRole('link', { name: /Download PDF/ })
    expect(pdf.getAttribute('href')).toBe('/legal/DVT_Master_Service_Agreement_English.pdf')
    expect(pdf.getAttribute('target')).toBe('_blank')
  })

  it('shows the Marathi agreement with a link back to English', () => {
    page('mr')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('मास्टर सेवा करार')
    expect(screen.getByRole('heading', { name: /1\. पक्षकार, स्वीकृती आणि प्राधान्यक्रम/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read in English' }).getAttribute('href')).toBe('/master-agreement/en')
    expect(screen.getByRole('link', { name: /PDF डाउनलोड करा/ }).getAttribute('href')).toBe('/legal/DVT_Master_Service_Agreement_Marathi.pdf')
  })

  it('lists all 15 sections in the contents', () => {
    page('en')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(nav.querySelectorAll('li')).toHaveLength(15)
  })

  it('keeps the original bracketed placeholders until the details are filled in', () => {
    page('en')
    expect(screen.getByText(/\[LEGAL ENTITY \/ PROPRIETOR NAME, ADDRESS\]/)).toBeTruthy()
    expect(screen.getAllByText('[INSERT]').length).toBeGreaterThan(0)
  })

  it('shows the admin-edited contact email in the contact section', () => {
    page('en')
    expect(screen.getAllByText('help@dvt.example')).toHaveLength(3)
  })

  it('never leaks a raw {{placeholder}} onto the page', () => {
    for (const lang of ['en', 'mr'] as const) {
      const { container, unmount } = page(lang)
      expect(container.textContent).not.toContain('{{')
      unmount()
    }
  })
})
