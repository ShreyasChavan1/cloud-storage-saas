import 'dotenv/config'
import { spawn, ChildProcess } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, stat, unlink, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { hostname } from 'node:os'
import axios from 'axios'
import FormData from 'form-data'

type Camera = { name: string; rtspUrl: string; enabled?: boolean }
type GatewayConfig = {
  deviceId: string; deviceName: string; configured: boolean
  nvrHost: string | null; nvrUsername: string | null; nvrPassword: string | null
  cameras: Camera[]; segmentSeconds: number; uploadPollSeconds: number
}

const apiUrl = (process.env.NIMBUS_API_URL ?? '').replace(/\/+$/, '')
const enrollmentCode = process.env.NIMBUS_ENROLLMENT_CODE ?? ''
const spool = process.env.SPOOL_DIR || '/spool'
const tokenFile = join(spool, '.gateway-token')
if (!apiUrl) throw new Error('NIMBUS_API_URL is required')

let token = process.env.NIMBUS_CCTV_TOKEN ?? ''
let config: GatewayConfig | null = null
const children = new Map<string, ChildProcess>()
const uploading = new Set<string>()

function safePart(s: string) { return s.trim().replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 80) || 'Camera' }
function cameraDir(camera: Camera) { return join(spool, safePart(camera.name)) }
async function loadToken() { if (!token) token = (await readFile(tokenFile, 'utf8').catch(() => '')).trim() }
async function saveToken(value: string) { token = value; await writeFile(tokenFile, value, { mode: 0o600 }) }

async function enroll() {
  if (!enrollmentCode) throw new Error('Gateway is not enrolled. Set NIMBUS_ENROLLMENT_CODE to the one-time code from Nimbus.')
  const gatewayId = process.env.NIMBUS_GATEWAY_ID || `${hostname()}-${randomSuffix()}`
  const { data } = await axios.post(`${apiUrl}/api/cctv/gateway/enroll`, { enrollmentCode, gatewayId }, { timeout: 30000 })
  await saveToken(data.data.gateway.token)
  console.log(`Gateway enrolled as ${data.data.gateway.deviceName} (${data.data.gateway.deviceId}).`)
}
function randomSuffix() { return Math.random().toString(36).slice(2, 10) }

async function fetchConfig(): Promise<GatewayConfig> {
  const { data } = await axios.get(`${apiUrl}/api/cctv/gateway/config`, { headers: { 'X-CCTV-TOKEN': token }, timeout: 30000 })
  return data.data.config as GatewayConfig
}

async function stopAll() {
  for (const child of children.values()) child.kill('SIGTERM')
  children.clear()
}
function startCamera(camera: Camera) {
  if (!config || camera.enabled === false || children.has(camera.name)) return
  const outDir = cameraDir(camera)
  void mkdir(outDir, { recursive: true })
  const output = join(outDir, `${safePart(camera.name)}-%Y%m%d-%H%M%S.mp4`)
  const args = ['-hide_banner', '-loglevel', 'warning', '-rtsp_transport', 'tcp', '-rw_timeout', '15000000', '-i', camera.rtspUrl, '-map', '0', '-c', 'copy', '-f', 'segment', '-segment_time', String(config.segmentSeconds), '-reset_timestamps', '1', '-strftime', '1', '-segment_format', 'mp4', output]
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  children.set(camera.name, child)
  child.stderr?.on('data', data => console.error(`[${camera.name}] ${String(data).trim()}`))
  child.on('exit', (code, signal) => {
    children.delete(camera.name)
    if (config?.cameras.some(c => c.name === camera.name && c.enabled !== false)) {
      console.error(`[${camera.name}] ffmpeg stopped code=${code ?? 'null'} signal=${signal ?? 'none'}; restarting in 5s`)
      setTimeout(() => startCamera(camera), 5000).unref()
    }
  })
  console.log(`[${camera.name}] recording started`)
}
function configFingerprint(c: GatewayConfig) { return JSON.stringify({ configured: c.configured, cameras: c.cameras, segmentSeconds: c.segmentSeconds, uploadPollSeconds: c.uploadPollSeconds }) }

function parseRecordedAt(filename: string) {
  const m = filename.match(/-(\d{8})-(\d{6})\.mp4$/i); if (!m) return undefined
  const [, d, t] = m
  const date = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
async function uploadFile(camera: Camera, file: string) {
  if (uploading.has(file)) return
  uploading.add(file)
  try {
    const form = new FormData()
    form.append('file', createReadStream(file), { filename: file.split(/[\\/]/).pop(), contentType: 'video/mp4' })
    const recordedAt = parseRecordedAt(file.split(/[\\/]/).pop() ?? '')
    if (recordedAt) form.append('recordedAt', recordedAt)
    form.append('camera', camera.name)
    await axios.post(`${apiUrl}/api/cctv/ingest`, form, { headers: { ...form.getHeaders(), 'X-CCTV-TOKEN': token }, maxBodyLength: Infinity, maxContentLength: Infinity, timeout: 10 * 60 * 1000 })
    await unlink(file)
    console.log(`[${camera.name}] uploaded ${file}`)
  } catch (err) {
    if (axios.isAxiosError(err)) console.error(`[${camera.name}] upload failed ${err.response?.status ?? ''} ${err.response?.data?.message ?? err.message}`)
    else console.error(`[${camera.name}] upload failed`, err)
  } finally { uploading.delete(file) }
}
async function pollUploads() {
  if (!config?.configured) return
  for (const camera of config.cameras) {
    const dir = cameraDir(camera)
    const files = (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter(x => x.isFile() && extname(x.name).toLowerCase() === '.mp4')
    for (const item of files) {
      const full = join(dir, item.name); const s = await stat(full).catch(() => null)
      if (!s || Date.now() - s.mtimeMs < 8000) continue
      void uploadFile(camera, full)
    }
  }
}

async function refreshConfig() {
  try {
    const next = await fetchConfig()
    const changed = !config || configFingerprint(config) !== configFingerprint(next)
    if (changed) {
      await stopAll()
      config = next
      if (!config.configured) console.log('Gateway enrolled but NVR is not configured yet. Waiting for configuration in Nimbus.')
      else { console.log(`NVR configuration received: ${config.cameras.length} channel(s), ${config.segmentSeconds}s segments.`); for (const camera of config.cameras) startCamera(camera) }
    }
    return true
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) { console.error('Gateway token rejected. Re-enrollment is required.'); process.exitCode = 1; return false }
    console.error('Could not fetch gateway configuration:', axios.isAxiosError(err) ? err.message : err)
    return false
  }
}
async function shutdown() { await stopAll(); setTimeout(() => process.exit(0), 3000).unref() }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown)

await mkdir(spool, { recursive: true })
await loadToken()
if (!token) await enroll()
await refreshConfig()
setInterval(() => void refreshConfig(), 30_000).unref()
setInterval(() => void pollUploads(), 15_000).unref()
