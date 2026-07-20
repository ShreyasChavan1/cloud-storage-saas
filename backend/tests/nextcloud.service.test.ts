import { nextcloudService } from '../src/services/NextcloudService'

// Unit tests only — no live agent/Nextcloud needed. global.fetch is
// replaced with a plain jest.fn() (rather than jest.spyOn, whose typing
// against fetch's overloaded signature is unreliable) and cast to jest.Mock
// at each use site.

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function fetchMock(): jest.Mock {
  return global.fetch as unknown as jest.Mock
}

describe('NextcloudService (agent HTTP client)', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it('createUser POSTs to /internal/users with a bearer token', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse(201, { success: true }))

    await nextcloudService.createUser('abc-123', 'a-strong-password', 5)

    expect(fetchMock()).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toContain('/internal/users')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toMatch(/^Bearer /)
    expect(JSON.parse(options.body)).toEqual({
      userid: 'abc-123',
      password: 'a-strong-password',
      quotaGb: 5,
    })
  })

  it('deleteUser sends a DELETE to the encoded userid path', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse(200, { success: true }))
    await nextcloudService.deleteUser('abc-123')
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toContain('/internal/users/abc-123')
    expect(options.method).toBe('DELETE')
  })

  it('getQuota returns the parsed quota object', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse(200, { quota: '5 GB' }))
    const result = await nextcloudService.getQuota('abc-123')
    expect(result).toEqual({ quota: '5 GB' })
  })

  it('throws NextcloudApiError with the agent-provided message on failure', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse(502, { error: 'User already exists' }))
    await expect(nextcloudService.createUser('dup', 'pw')).rejects.toMatchObject({
      name: 'NextcloudApiError',
      message: 'User already exists',
      statusCode: 502,
    })
  })

  it('throws NextcloudApiError on a network failure', async () => {
    fetchMock().mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(nextcloudService.deleteUser('abc-123')).rejects.toMatchObject({
      name: 'NextcloudApiError',
      message: 'Could not reach the Nextcloud provisioning agent',
    })
  })
})
