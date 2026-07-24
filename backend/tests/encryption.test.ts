import { encrypt, decrypt } from '../src/utils/encryption'

describe('encrypt/decrypt', () => {
  it('round-trips a plaintext value', () => {
    const plaintext = 'kFrH9-TXk4s-gUoOQ-KOVH8'
    const ciphertext = encrypt(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const a = encrypt('same-value')
    const b = encrypt('same-value')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('same-value')
    expect(decrypt(b)).toBe('same-value')
  })

  it('rejects tampered ciphertext rather than silently returning garbage', () => {
    const ciphertext = encrypt('a-real-secret-long-enough-to-have-a-safe-middle-byte')
    const [iv, authTag, data] = ciphertext.split('.')
    // Flip a character in the MIDDLE of the base64 data — flipping the
    // last character can land on padding bits that decode to the same
    // underlying byte, which would make this test pass for the wrong
    // reason (no real tampering actually occurred).
    const mid = Math.floor(data.length / 2)
    const tamperedChar = data[mid] === 'A' ? 'B' : 'A'
    const tamperedData = data.slice(0, mid) + tamperedChar + data.slice(mid + 1)
    const tampered = [iv, authTag, tamperedData].join('.')

    expect(() => decrypt(tampered)).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => decrypt('not-even-close-to-valid')).toThrow()
    expect(() => decrypt('only.two')).toThrow()
  })
})
