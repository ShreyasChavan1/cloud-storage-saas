import { env } from '../config/env'

/**
 * Nextcloud user provisioning via the standalone agent (../nextcloud-agent)
 * running on the Nextcloud server itself — NOT the OCS HTTP API, and NOT
 * SSH from this machine.
 *
 * Why not the OCS API: Nextcloud has a long-standing, currently open bug
 * (nextcloud/server#51637) where sensitive OCS endpoints (create/delete
 * user, change password) reject even fully valid app-password Basic-Auth
 * requests with "Password confirmation is required" (HTTP 403) — confirmed
 * directly against a real instance: fresh app password, no 2FA, a full
 * session logout, and raising password_confirm_timeout all made no
 * difference. Read-only OCS calls work fine; only the write endpoints are
 * affected.
 *
 * Why not SSH: an SSH key grants full shell access on the Nextcloud server.
 * The agent's bearer token only grants access to five specific operations —
 * a much smaller blast radius if it ever leaks, and there's no private key
 * to protect on this machine at all.
 *
 * This is the only module that reads NEXTCLOUD_AGENT_TOKEN — it's sent as a
 * Bearer header, never logged, never returned in any response.
 */

export class NextcloudApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'NextcloudApiError'
  }
}

// The agent can only report the CONFIGURED quota (occ has no equivalent of
// the OCS API's live usage stats) — see nextcloud-agent's README.
export interface NextcloudQuota {
  quota: string
}

async function agentRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${env.NEXTCLOUD_AGENT_URL}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${env.NEXTCLOUD_AGENT_TOKEN}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network failure — agent unreachable, DNS, firewall, timeout, etc.
    throw new NextcloudApiError('Could not reach the Nextcloud provisioning agent')
  }

  if (!res.ok) {
    let message = `Nextcloud agent request failed (HTTP ${res.status})`
    try {
      const errBody = (await res.json()) as { error?: string }
      if (errBody?.error) message = errBody.error
    } catch {
      // Response wasn't JSON — fall back to the generic message above.
    }
    throw new NextcloudApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const nextcloudService = {
  /**
   * Provisions a Nextcloud account. `quotaGb` is optional — omit it to
   * leave the account on Nextcloud's server-wide default quota.
   */
  async createUser(userid: string, password: string, quotaGb?: number): Promise<void> {
    await agentRequest<{ success: true }>('POST', '/internal/users', { userid, password, quotaGb })
  },

  async deleteUser(userid: string): Promise<void> {
    await agentRequest<{ success: true }>('DELETE', `/internal/users/${encodeURIComponent(userid)}`)
  },

  async changePassword(userid: string, newPassword: string): Promise<void> {
    await agentRequest<{ success: true }>('PUT', `/internal/users/${encodeURIComponent(userid)}/password`, {
      password: newPassword,
    })
  },

  async setQuota(userid: string, quotaGb: number): Promise<void> {
    await agentRequest<{ success: true }>('PUT', `/internal/users/${encodeURIComponent(userid)}/quota`, {
      quotaGb,
    })
  },

  async getQuota(userid: string): Promise<NextcloudQuota> {
    return agentRequest<NextcloudQuota>('GET', `/internal/users/${encodeURIComponent(userid)}/quota`)
  },
}
