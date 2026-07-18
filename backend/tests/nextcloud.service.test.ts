import { nextcloudService, NextcloudApiError } from '../src/services/NextcloudService'

// Unit tests only — no live Nextcloud server required. global.fetch is
// mocked so these run in CI without any external dependency.

function mockOcsResponse(statuscode: number, message: string, data: unknown = {}) {
  return {
    ok: statuscode < 300,
    status: statuscode,
    json: async () => ({ ocs: { meta: { status: 'ok', statuscode, message }, data } }),
  } as Response
}

describe('NextcloudService', () => {
  const fetchSpy = jest.spyOn(global, 'fetch' as never)

  afterEach(() => {
    fetchSpy.mockReset()
  })

  it('createUser sends a form-encoded POST with userid/password/quota', async () => {
    fetchSpy.mockResolvedValueOnce(mockOcsResponse(100, 'OK', { id: 'abc-123' }))

    await nextcloudService.createUser('abc-123', 'a-strong-password', 5)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/ocs/v1.php/cloud/users')
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({ 'OCS-APIRequest': 'true' })
    // Credentials go out as a Basic auth header, never in the body/query.
    expect((options.headers as Record<string, string>).Authorization).toMatch(/^Basic /)
    expect(options.body).toContain('userid=abc-123')
    expect(options.body).toContain('quota=5+GB')
  })

  it('getQuota returns the parsed quota object', async () => {
    const quota = { free: 100, used: 5, total: 105, relative: 4.7, quota: 5368709120 }
    fetchSpy.mockResolvedValueOnce(mockOcsResponse(100, 'OK', { id: 'abc-123', quota, email: null, enabled: true }))

    const result = await nextcloudService.getQuota('abc-123')
    expect(result).toEqual(quota)
  })

  it('throws NextcloudApiError on an OCS-level failure without leaking internals', async () => {
    fetchSpy.mockResolvedValueOnce(mockOcsResponse(996, 'User already exists'))

    await expect(nextcloudService.createUser('dup', 'pw')).rejects.toThrow(NextcloudApiError)
    await expect(nextcloudService.createUser('dup', 'pw')).rejects.toThrow('User already exists')
  })

  it('throws NextcloudApiError on a network failure', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(nextcloudService.deleteUser('abc-123')).rejects.toThrow(NextcloudApiError)
    await expect(nextcloudService.deleteUser('abc-123')).rejects.toThrow('Could not reach the Nextcloud server')
  })
})
