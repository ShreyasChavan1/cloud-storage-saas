import { env } from '../config/env'

/**
 * Thin client around Nextcloud's OCS Provisioning API. This is the ONLY
 * place `NEXTCLOUD_ADMIN_USER` / `NEXTCLOUD_ADMIN_PASSWORD` are read — they
 * never leave this module, are never logged, and are never returned in any
 * response. Callers only ever see NextcloudApiError (sanitized) or the
 * typed data below.
 *
 * Docs: https://docs.nextcloud.com/server/latest/admin_manual/configuration_user/instruction_set_for_users.html
 */

// Thrown for any failure talking to Nextcloud — network error, non-2xx
// HTTP status, or an OCS-level error embedded in a 200 response body.
// Deliberately NOT an ApiError: this module has no knowledge of the HTTP
// layer above it, so callers (services) translate this into whatever
// client-facing error makes sense for the operation they were doing.
export class NextcloudApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'NextcloudApiError'
  }
}

interface OcsEnvelope<T> {
  ocs: {
    meta: {
      status: string
      statuscode: number
      message: string
    }
    data: T
  }
}

export interface NextcloudQuota {
  free: number
  used: number
  total: number
  relative: number
  // The configured ceiling: a byte count, or the strings "none" / "default".
  quota: number | string
}

interface NextcloudUserDetails {
  id: string
  quota: NextcloudQuota
  email: string | null
  enabled: boolean
}

function authHeader(): string {
  const credentials = `${env.NEXTCLOUD_ADMIN_USER}:${env.NEXTCLOUD_ADMIN_PASSWORD}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

// Human-readable quota strings Nextcloud accepts, e.g. "5 GB". Storage
// limits are tracked in GB throughout this backend (see prisma schema).
function gbToQuotaString(gb: number): string {
  return `${gb} GB`
}

async function ocsRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, string>
): Promise<T> {
  const url = `${env.NEXTCLOUD_URL}/ocs/v1.php${path}?format=json`

  const headers: Record<string, string> = {
    'OCS-APIRequest': 'true',
    Accept: 'application/json',
    Authorization: authHeader(),
  }

  let requestBody: string | undefined
  if (body) {
    requestBody = new URLSearchParams(body).toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  let res: Response
  try {
    res = await fetch(url, { method, headers, body: requestBody })
  } catch {
    // Network failure (Nextcloud unreachable, DNS, timeout, TLS, ...).
    // Never include the URL/credentials in what bubbles up.
    throw new NextcloudApiError('Could not reach the Nextcloud server')
  }

  let json: OcsEnvelope<T> | undefined
  try {
    json = (await res.json()) as OcsEnvelope<T>
  } catch {
    // Fall through — some OCS error responses aren't JSON.
  }

  const ocsStatusCode = json?.ocs?.meta?.statuscode
  const ocsMessage = json?.ocs?.meta?.message

  if (!res.ok || (ocsStatusCode && ocsStatusCode >= 300)) {
    // Only the OCS-provided message is surfaced — never headers, never
    // the request body (which may have contained a password).
    throw new NextcloudApiError(
      ocsMessage || `Nextcloud request failed (HTTP ${res.status})`,
      ocsStatusCode ?? res.status
    )
  }

  return json!.ocs.data
}

export const nextcloudService = {
  /**
   * Provisions a Nextcloud account. `quotaGb` is optional — omit it to
   * leave the account on Nextcloud's server-wide default quota.
   */
  async createUser(userid: string, password: string, quotaGb?: number): Promise<void> {
    await ocsRequest<{ id: string }>('POST', '/cloud/users', {
      userid,
      password,
      ...(quotaGb !== undefined ? { quota: gbToQuotaString(quotaGb) } : {}),
    })
  },

  async deleteUser(userid: string): Promise<void> {
    await ocsRequest<void>('DELETE', `/cloud/users/${encodeURIComponent(userid)}`)
  },

  async changePassword(userid: string, newPassword: string): Promise<void> {
    await ocsRequest<void>('PUT', `/cloud/users/${encodeURIComponent(userid)}`, {
      key: 'password',
      value: newPassword,
    })
  },

  async setQuota(userid: string, quotaGb: number): Promise<void> {
    await ocsRequest<void>('PUT', `/cloud/users/${encodeURIComponent(userid)}`, {
      key: 'quota',
      value: gbToQuotaString(quotaGb),
    })
  },

  async getQuota(userid: string): Promise<NextcloudQuota> {
    const data = await ocsRequest<NextcloudUserDetails>('GET', `/cloud/users/${encodeURIComponent(userid)}`)
    return data.quota
  },
}
