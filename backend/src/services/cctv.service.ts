import { createHash, randomBytes } from 'crypto'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import { posix } from 'path'
import { userRepository } from '../repositories/user.repository'
import { cctvRepository } from '../repositories/cctv.repository'
import { webDavService } from './WebDavService'
import { encrypt, decrypt } from '../utils/encryption'
import { ApiError } from '../utils/ApiError'
import { sanitizeDavPath } from '../utils/davPath'

function hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }
function cleanFilename(name: string) {
  const base = posix.basename(name).replace(/[\r\n]/g, '_')
  if (!base || base === '.' || base === '..') throw ApiError.badRequest('Invalid CCTV filename')
  return base
}
function parseCameras(value: string | null) {
  if (!value) return []
  try { return JSON.parse(value) as Array<{ name: string; rtspUrl: string; enabled?: boolean }> } catch { return [] }
}

export const cctvService = {
  async createDevice(userId: string, name: string) {
    const enrollmentCode = `NVR-${randomBytes(6).toString('hex').toUpperCase()}`
    const enrollmentExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const device = await cctvRepository.create({
      userId,
      name: name.trim(),
      tokenPrefix: '',
      enrollmentCodeHash: hashToken(enrollmentCode),
      enrollmentExpiresAt,
    })
    return { id: device.id, name: device.name, status: device.status, enrollmentCode, enrollmentExpiresAt: enrollmentExpiresAt.toISOString() }
  },

  async listDevices(userId: string) {
    const devices = await cctvRepository.findByUser(userId)
    return devices.map(d => ({ ...d, camerasJson: undefined, camerasConfigured: parseCameras(d.camerasJson).length }))
  },

  async configureDevice(userId: string, id: string, input: { nvrHost: string; nvrUsername: string; nvrPassword: string; cameras: Array<{ name: string; rtspUrl: string; enabled?: boolean }>; segmentSeconds: number; uploadPollSeconds: number }) {
    const device = await cctvRepository.findByUser(userId).then(rows => rows.find(x => x.id === id))
    if (!device) throw ApiError.notFound('CCTV gateway not found')
    if (!input.nvrHost.trim() || !input.nvrUsername.trim() || !input.nvrPassword) throw ApiError.badRequest('NVR host, username and password are required')
    if (!input.cameras.length || input.cameras.length > 32) throw ApiError.badRequest('Add between 1 and 32 NVR channels')
    for (const camera of input.cameras) {
      if (!camera.name?.trim() || !camera.rtspUrl?.startsWith('rtsp://')) throw ApiError.badRequest('Every enabled camera needs a name and RTSP URL')
    }
    if (!Number.isInteger(input.segmentSeconds) || input.segmentSeconds < 30 || input.segmentSeconds > 3600) throw ApiError.badRequest('Segment interval must be 30-3600 seconds')
    if (!Number.isInteger(input.uploadPollSeconds) || input.uploadPollSeconds < 5 || input.uploadPollSeconds > 300) throw ApiError.badRequest('Upload polling interval must be 5-300 seconds')
    await cctvRepository.updateConfig(id, {
      nvrHost: input.nvrHost.trim(), nvrUsername: input.nvrUsername.trim(), nvrPasswordEncrypted: encrypt(input.nvrPassword),
      camerasJson: JSON.stringify(input.cameras.map(c => ({ name: c.name.trim(), rtspUrl: c.rtspUrl.trim(), enabled: c.enabled !== false }))),
      segmentSeconds: input.segmentSeconds, uploadPollSeconds: input.uploadPollSeconds,
    })
  },

  async enrollGateway(code: string, gatewayId: string) {
    const device = await cctvRepository.findByEnrollmentHash(hashToken(code.trim()))
    if (!device || !device.enrollmentExpiresAt || device.enrollmentExpiresAt < new Date()) throw ApiError.unauthorized('Invalid or expired enrollment code')
    const token = `cctv_${randomBytes(32).toString('base64url')}`
    const updated = await cctvRepository.enroll(device.id, {
      tokenHash: hashToken(token), tokenPrefix: token.slice(0, 13), enrollmentCodeHash: null, enrollmentExpiresAt: null,
      gatewayId: gatewayId.trim().slice(0, 120), status: 'ACTIVE',
    })
    return { deviceId: updated.id, deviceName: updated.name, token }
  },

  async gatewayConfig(token: string) {
    if (!token || token.length < 20) throw ApiError.unauthorized('Invalid CCTV gateway token')
    const device = await cctvRepository.findByTokenHash(hashToken(token))
    if (!device || device.status !== 'ACTIVE') throw ApiError.unauthorized('Invalid or disabled CCTV gateway')
    await cctvRepository.touchSeen(device.id)
    return {
      deviceId: device.id,
      deviceName: device.name,
      configured: Boolean(device.nvrHost && device.nvrUsername && device.nvrPasswordEncrypted && device.camerasJson),
      nvrHost: device.nvrHost,
      nvrUsername: device.nvrUsername,
      nvrPassword: device.nvrPasswordEncrypted ? decrypt(device.nvrPasswordEncrypted) : null,
      cameras: parseCameras(device.camerasJson),
      segmentSeconds: device.segmentSeconds,
      uploadPollSeconds: device.uploadPollSeconds,
    }
  },

  async deleteDevice(userId: string, id: string) {
    const result = await cctvRepository.deleteForUser(id, userId)
    if (!result.count) throw ApiError.notFound('CCTV device not found')
  },

  async uploadFromGateway(token: string, filename: string, filePath: string, size: number, recordedAt?: Date) {
    // Whole body wrapped in try/finally: multer has already written filePath
    // to disk (up to 1GB, see cctv.routes.ts) by the time this runs, so every
    // exit path — bad/missing token, unknown device, duplicate upload, a
    // provisioning error, or a WebDAV failure — must still unlink it. Any
    // early `throw`/`return` above the old inner try left the temp file
    // behind permanently, which let an unauthenticated caller fill the
    // disk with repeated bogus requests (each one a leaked file, since
    // most requests here never carry a valid token).
    try {
      if (!token || token.length < 20) throw ApiError.unauthorized('Invalid CCTV gateway token')
      const device = await cctvRepository.findByTokenHash(hashToken(token))
      if (!device || device.status !== 'ACTIVE') throw ApiError.unauthorized('Invalid or disabled CCTV gateway')
      await cctvRepository.touchSeen(device.id)
      const safeName = cleanFilename(filename)
      const existing = await cctvRepository.findUpload(device.id, safeName)
      if (existing) return { duplicate: true, path: existing.path }
      const user = await userRepository.findById(device.userId)
      if (!user || !user.nextcloudUsername || !user.nextcloudWebdavPasswordEncrypted) throw ApiError.serviceUnavailable('Storage account is not provisioned')
      const day = recordedAt ?? new Date()
      const folder = sanitizeDavPath(`/CCTV/${device.name}/${day.getUTCFullYear()}/${String(day.getUTCMonth()+1).padStart(2,'0')}/${String(day.getUTCDate()).padStart(2,'0')}`)
      const destination = sanitizeDavPath(posix.join(folder, safeName))
      const davPassword = decrypt(user.nextcloudWebdavPasswordEncrypted)
      const parts = folder.split('/').filter(Boolean)
      let current = ''
      for (const part of parts) { current += `/${part}`; await webDavService.createFolder(user.nextcloudUsername, davPassword, current).catch((err) => { const status = (err as { statusCode?: number }).statusCode; if (status !== 405 && status !== 409) throw err }) }
      await webDavService.uploadStream(user.nextcloudUsername, davPassword, destination, createReadStream(filePath))
      let row
      try { row = await cctvRepository.reserveUpload(device.id, safeName, destination, size, recordedAt) } catch (err) {
        if ((err as { code?: string }).code === 'P2002') { const duplicate = await cctvRepository.findUpload(device.id, safeName); return { duplicate: true, path: duplicate?.path ?? destination } }
        throw err
      }
      await cctvRepository.touchUploaded(device.id)
      return { duplicate: false, path: row.path }
    } finally { await unlink(filePath).catch(() => undefined) }
  },
}
