import { submitClientFormSchema, updateClientFormSchema } from '../src/validators/clientForm.validator'

const valid = {
  companyName: 'Acme Traders',
  contactPerson: 'Asha Kapoor',
  mobile: '+91 98765 43210',
  email: 'Asha@Example.com',
  services: ['Cloud Storage / Backup'],
  answers: { 'storage.currentData': '1-5 TB', 'storage.dataSource': ['Server', 'NAS'] },
  confirmed: true,
}

describe('submitClientFormSchema', () => {
  it('accepts a complete submission and normalises the email', () => {
    const parsed = submitClientFormSchema.parse({ body: valid })
    expect(parsed.body.email).toBe('asha@example.com')
  })

  it('requires at least one service', () => {
    expect(() => submitClientFormSchema.parse({ body: { ...valid, services: [] } })).toThrow()
  })

  it('requires the client confirmation', () => {
    expect(() => submitClientFormSchema.parse({ body: { ...valid, confirmed: false } })).toThrow()
    const { confirmed: _omit, ...rest } = valid
    expect(() => submitClientFormSchema.parse({ body: rest })).toThrow()
  })

  it('rejects an invalid mobile number', () => {
    expect(() => submitClientFormSchema.parse({ body: { ...valid, mobile: 'call me' } })).toThrow()
  })

  it('defaults answers to an empty object', () => {
    const { answers: _omit, ...rest } = valid
    expect(submitClientFormSchema.parse({ body: rest }).body.answers).toEqual({})
  })
})

describe('updateClientFormSchema', () => {
  const id = '3f2b8c1e-5d4a-4e0b-9a77-2d6c1f0a9b11'

  it('only accepts admin-owned fields, ignoring client answers', () => {
    const parsed = updateClientFormSchema.parse({
      params: { id },
      body: { status: 'IN_REVIEW', companyName: 'Hacked Ltd' },
    })
    expect(parsed.body).toEqual({ status: 'IN_REVIEW' })
  })

  it('validates the proposal date format', () => {
    expect(() => updateClientFormSchema.parse({ params: { id }, body: { proposalRequiredBy: '10/10/2026' } })).toThrow()
    expect(() => updateClientFormSchema.parse({ params: { id }, body: { proposalRequiredBy: '2026-10-31' } })).not.toThrow()
  })
})
