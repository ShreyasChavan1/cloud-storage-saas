import { describe, it, expect } from 'vitest'
import { masterAgreement, MASTER_AGREEMENT_VERSION } from './masterAgreement'

const langs = ['en', 'mr'] as const

describe('master agreement data', () => {
  it('is version 2.0', () => {
    expect(MASTER_AGREEMENT_VERSION).toBe('2.0')
  })

  it.each(langs)('%s has sections 1-14 in order, each with text', (lang) => {
    const { sections } = masterAgreement[lang]
    expect(sections.map((s) => s.number)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1))
    for (const s of sections) {
      expect(s.title.length).toBeGreaterThan(3)
      expect(s.paragraphs.join(' ').length).toBeGreaterThan(80)
    }
  })

  it('uses only the two known placeholders, and the same ones in both languages', () => {
    const tokens = (lang: (typeof langs)[number]) =>
      masterAgreement[lang].sections.flatMap((s) => s.paragraphs.join(' ').match(/\{\{[A-Z_]+\}\}/g) ?? []).sort()
    expect(tokens('en')).toEqual(['{{CORRECTION_DAYS}}', '{{PARTY}}'])
    expect(tokens('mr')).toEqual(tokens('en'))
  })

  it('has no leftover bracketed drafting placeholders in the body text', () => {
    for (const lang of langs) {
      const body = masterAgreement[lang].sections.map((s) => s.paragraphs.join(' ')).join(' ')
      expect(body).not.toMatch(/\[[^\]]*\]/)
      expect(body).not.toMatch(/Legal review|कायदेशीर तपासणी आवश्यक/)
    }
  })

  it('has clean Marathi: no spaces before punctuation and no broken-word artefacts', () => {
    const body = masterAgreement.mr.sections.map((s) => s.title + ' ' + s.paragraphs.join(' ')).join(' ')
    expect(body).not.toMatch(/ [.,;:]/)
    for (const broken of ['से वा', 'स्वीकृ ती', 'स्टोरे ज', 'किं वा', 'के ल्यास', 'खरे दी', 'अंस', 'अंट']) {
      expect(body).not.toContain(broken)
    }
    // spot-check a few correct words made it through
    for (const word of ['स्वीकृती', 'स्टोरेज', 'किंवा', 'केल्यास', 'खरेदी', 'असतील', 'अटी']) {
      expect(body).toContain(word)
    }
  })

  it('points each language at its own page and PDF', () => {
    expect(masterAgreement.en.path).toBe('/master-agreement/en')
    expect(masterAgreement.mr.path).toBe('/master-agreement/mr')
    expect(masterAgreement.en.pdfPath).toMatch(/English\.pdf$/)
    expect(masterAgreement.mr.pdfPath).toMatch(/Marathi\.pdf$/)
  })
})
