import { prisma } from '../database/prisma'
import { userRepository } from '../repositories/user.repository'
import { webDavService, WebDavError } from './WebDavService'
import { decrypt } from '../utils/encryption'
import { sanitizeDavPath } from '../utils/davPath'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { logger } from '../config/logger'

const auth = (u: string, p: string) =>
  `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`

async function creds(userId: string) {
  const u = await userRepository.findById(userId)

  if (!u?.nextcloudUsername || !u.nextcloudWebdavPasswordEncrypted) {
    throw ApiError.serviceUnavailable('Storage account is not provisioned')
  }

  return {
    username: u.nextcloudUsername,
    password: decrypt(u.nextcloudWebdavPasswordEncrypted),
  }
}

async function ocs(
  username: string,
  password: string,
  method: string,
  path: string,
  body: URLSearchParams,
) {
  const r = await fetch(
    `${env.NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1${path}`,
    {
      method,
      headers: {
        Authorization: auth(username, password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
        ...(method === 'GET'
          ? {}
          : { 'Content-Type': 'application/x-www-form-urlencoded' }),
      },
      body: method === 'GET' ? undefined : body.toString(),
    },
  )

  const text = await r.text()

  let j: any

  try {
    j = JSON.parse(text)
  } catch {}

  if (!r.ok || j?.ocs?.meta?.status !== 'ok') {
    logger.error(
      {
        status: r.status,
        response: j,
        rawResponse: text,
        username,
        path,
      },
      'Nextcloud share API failed',
    )

    throw ApiError.serviceUnavailable(
      j?.ocs?.meta?.message || 'Could not manage the sharing link.',
    )
  }

  return j.ocs.data
}

export const shareService = {
  async create(
    userId: string,
    rawPath: string,
    password?: string,
    expireDate?: string,
  ) {
    const path = sanitizeDavPath(rawPath)

    if (path === '/') {
      throw ApiError.badRequest('The root folder cannot be shared.')
    }

    const c = await creds(userId)

    let stat

    try {
      stat = await webDavService.stat(c.username, c.password, path)
    } catch (e) {
      if (e instanceof WebDavError && e.statusCode === 404) {
        throw ApiError.notFound('File not found')
      }

      throw ApiError.serviceUnavailable(
        'Could not access the file in storage.',
      )
    }

    if (stat.type === 'directory') {
      throw ApiError.badRequest('Only files can be shared right now.')
    }

    const d = await ocs(
      c.username,
      c.password,
      'POST',
      '/shares',
      new URLSearchParams({
        path,
        shareType: '3',
        permissions: '1',
        ...(password ? { password } : {}),
        ...(expireDate ? { expireDate } : {}),
      }),
    )

    const row = await prisma.share.create({
      data: {
        userId,
        path,
        name: stat.basename,
        nextcloudShareId: Number(d.id),
        token: String(d.token),
        hasPassword: !!password,
        expireDate: expireDate
          ? new Date(`${expireDate}T23:59:59.999Z`)
          : null,
      },
    })

    return {
      ...row,
      url: `${env.CLIENT_ORIGIN.replace(/\/+$/, '')}/share/${encodeURIComponent(
        row.token,
      )}`,
    }
  },

  async list(userId: string) {
    const rows = await prisma.share.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((x) => ({
      ...x,
      url: `${env.CLIENT_ORIGIN.replace(/\/+$/, '')}/share/${encodeURIComponent(
        x.token,
      )}`,
    }))
  },

  async publicInfo(token: string) {
    const s = await prisma.share.findUnique({
      where: { token },
    })

    if (!s) {
      throw ApiError.notFound('Share link not found')
    }

    if (s.expireDate && s.expireDate.getTime() < Date.now()) {
      throw ApiError.notFound('This share link has expired.')
    }

    return {
      name: s.name,
      hasPassword: s.hasPassword,
      expireDate: s.expireDate,
    }
  },

  async revoke(userId: string, id: string) {
    const s = await prisma.share.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!s) {
      throw ApiError.notFound('Share link not found')
    }

    const c = await creds(userId)

    await ocs(
      c.username,
      c.password,
      'DELETE',
      `/shares/${s.nextcloudShareId}`,
      new URLSearchParams(),
    )

    await prisma.share.delete({
      where: { id },
    })
  },

  async downloadPublic(token: string, password?: string) {
    const s = await prisma.share.findUnique({
      where: { token },
    })

    if (!s) {
      throw ApiError.notFound('Share link not found')
    }

    if (s.expireDate && s.expireDate.getTime() < Date.now()) {
      throw ApiError.notFound('This share link has expired.')
    }

    if (s.hasPassword && !password) {
      throw ApiError.unauthorized('A share password is required.')
    }

    const headers: Record<string, string> = {}

    // Nextcloud public WebDAV uses "anonymous" as the username
    // when a public share has a password.
    if (s.hasPassword) {
      headers.Authorization = auth('anonymous', password!)
    }

    const fr = await fetch(
      `${env.NEXTCLOUD_URL}/public.php/dav/files/${encodeURIComponent(
        token,
      )}/${encodeURIComponent(s.name)}`,
      {
        headers,
      },
    )

    if (!fr.ok || !fr.body) {
      logger.warn(
        {
          status: fr.status,
          token,
          file: s.name,
          hasPassword: s.hasPassword,
        },
        'Nextcloud public share download failed',
      )

      if (fr.status === 401 || fr.status === 403) {
        throw ApiError.unauthorized(
          s.hasPassword
            ? 'Incorrect share password.'
            : 'Public share access was rejected.',
        )
      }

      if (fr.status === 404) {
        throw ApiError.notFound('Shared file not found.')
      }

      throw ApiError.serviceUnavailable(
        'Could not access the shared file.',
      )
    }

    return {
      stream: fr.body,
      contentType:
        fr.headers.get('content-type') || 'application/octet-stream',
      length: fr.headers.get('content-length'),
      name: s.name,
    }
  },
}