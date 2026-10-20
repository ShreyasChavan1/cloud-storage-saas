import { submitFeedbackSchema, listFeedbackSchema } from '../src/validators/feedback.validator'

const valid = { rating: 5, description: 'Fast uploads and the CCTV backup just works.' }

describe('submitFeedbackSchema', () => {
  it('accepts a rating and a description', () => {
    const parsed = submitFeedbackSchema.parse({ body: valid })
    expect(parsed.body).toEqual(valid)
  })

  it('ignores an email if one is sent — the account supplies the identity', () => {
    const parsed = submitFeedbackSchema.parse({ body: { ...valid, email: 'someone@else.com' } })
    expect(parsed.body).not.toHaveProperty('email')
  })

  it('accepts 1 to 5 stars only, as whole numbers', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(() => submitFeedbackSchema.parse({ body: { ...valid, rating } })).not.toThrow()
    }
    for (const rating of [0, 6, -1, 3.5, '4', null]) {
      expect(() => submitFeedbackSchema.parse({ body: { ...valid, rating } })).toThrow()
    }
  })

  it('requires a rating', () => {
    const { rating: _omit, ...rest } = valid
    expect(() => submitFeedbackSchema.parse({ body: rest })).toThrow()
  })

  it('requires a description and limits its length', () => {
    expect(() => submitFeedbackSchema.parse({ body: { ...valid, description: '  ' } })).toThrow()
    expect(() => submitFeedbackSchema.parse({ body: { ...valid, description: 'ok' } })).toThrow()
    expect(() => submitFeedbackSchema.parse({ body: { ...valid, description: 'x'.repeat(2001) } })).toThrow()
    expect(() => submitFeedbackSchema.parse({ body: { ...valid, description: 'x'.repeat(2000) } })).not.toThrow()
  })
})

describe('listFeedbackSchema', () => {
  it('applies paging defaults and coerces query strings', () => {
    const q = listFeedbackSchema.parse({ query: { rating: '4' } }).query
    expect(q).toMatchObject({ page: 1, limit: 20, rating: 4 })
  })

  it('rejects an out-of-range rating filter', () => {
    expect(() => listFeedbackSchema.parse({ query: { rating: '9' } })).toThrow()
  })
})
