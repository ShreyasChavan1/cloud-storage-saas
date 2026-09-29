#!/usr/bin/env node
'use strict'

// Runs once, interactively, during install.ps1 -- BEFORE the user is asked
// for a Nimbus enrollment code. Its only job is answering "what IP address
// is my camera/NVR at, and what's its RTSP URL", so a non-technical person
// never has to open their NVR's dashboard or guess a URL format themselves.
//
// Two techniques, combined, neither needing anything beyond what
// `npm install` already pulled in:
//
//   1. Real ONVIF (WS-Discovery + GetProfiles + GetStreamUri) via the
//      `onvif` npm package. This gives an exact, ready-to-use RTSP URL --
//      no guessing "Channels" vs "Channel", no guessing the stream number.
//      Most NVRs/cameras from the last ~10 years support this.
//   2. A raw TCP + RTSP-OPTIONS probe across the local /24 (same idea as
//      an nmap-style scan), for older/cheaper devices that don't speak
//      ONVIF. This can only confirm "something RTSP-shaped is listening
//      here", not the exact stream path -- so those get reported as
//      "possible" devices, not ready-to-use URLs.
//
// Exit code 0 = found at least one device (confirmed or possible).
// Exit code 1 = found nothing; install.ps1 stops and tells the user to
// check their NVR's own dashboard instead.

const os = require('os')
const net = require('net')
const readline = require('readline')

// Defense in depth beyond the specific Hikvision-firmware fix in
// discoverOnvifBroadcast() below: camera/NVR firmware in the wild is
// wildly inconsistent, and this script exists specifically so a
// non-technical person never has to see a raw Node stack trace. If
// anything unforeseen still slips through as a truly uncaught exception,
// fail this one scan gracefully -- same outcome as "found nothing" --
// rather than crashing the whole installer.
process.on('uncaughtException', (err) => {
  console.error('')
  console.error('Discovery hit an unexpected error and had to stop:', err && err.message ? err.message : err)
  process.exit(1)
})

const RTSP_PORTS = [554, 8554, 10554]
const OTHER_CCTV_PORTS = [80, 443, 8000, 8080, 8899]
const TCP_TIMEOUT_MS = 400
const RTSP_TIMEOUT_MS = 1500
const SCAN_CONCURRENCY = 64
const ONVIF_TIMEOUT_MS = 6000

// A single, long-lived readline interface with one persistent 'line'
// listener, rather than the more obvious `readline.question()`-per-prompt
// pattern. That more obvious pattern has a real race: if two answers ever
// arrive in the same input chunk (e.g. someone pastes "username\npassword"
// as one clipboard block instead of typing each and pressing Enter), the
// second 'line' event can fire before the next question() has attached its
// listener, and gets silently dropped -- the script would then hang
// waiting for input that already arrived. Queuing every line as it comes
// in, and handing it to whichever ask() is currently waiting (or holding
// it for the next one), is safe regardless of how the input arrives.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const pendingLines = []
const waitingResolvers = []
rl.on('line', (line) => {
  if (waitingResolvers.length) waitingResolvers.shift()(line)
  else pendingLines.push(line)
})

function ask(promptText) {
  process.stdout.write(promptText)
  return new Promise((resolve) => {
    if (pendingLines.length) resolve(pendingLines.shift().trim())
    else waitingResolvers.push((line) => resolve(line.trim()))
  })
}

function getLocalIPv4() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return null
}

// Simplifying assumption: treat the local network as a /24, same as most
// home/small-office setups (192.168.x.x, 10.x.x.x with a /24 mask). Good
// enough for a best-effort discovery helper; anything unusual just falls
// through to "ask the NVR dashboard" like a non-discoverable device would.
function subnetHosts(localIp) {
  const [a, b, c] = localIp.split('.').map(Number)
  const hosts = []
  for (let d = 1; d <= 254; d++) hosts.push(`${a}.${b}.${c}.${d}`)
  return hosts
}

function checkPortOpen(ip, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const finish = (result) => { if (!settled) { settled = true; socket.destroy(); resolve(result) } }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, ip)
  })
}

function checkRtspOptions(ip, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let buffer = ''
    let settled = false
    const finish = (result) => { if (!settled) { settled = true; socket.destroy(); resolve(result) } }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      socket.write('OPTIONS * RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: Nimbus-NVR-Discovery/1.0\r\n\r\n')
    })
    socket.on('data', (chunk) => {
      buffer += chunk.toString('latin1')
      const firstLine = buffer.split('\r\n')[0]
      const match = /^RTSP\/\d+\.\d+\s+(\d+)/.exec(firstLine)
      if (match) finish(true)
    })
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, ip)
  })
}

// Raw fallback scan -- ports this repo's own camera.py / nimbus_discover.py
// prototypes did, just in Node so it ships with the installer instead of
// needing a separate Python install.
async function scanForRtspPorts(hosts) {
  const results = []
  let cursor = 0
  async function worker() {
    while (cursor < hosts.length) {
      const ip = hosts[cursor++]
      const openRtsp = []
      for (const port of RTSP_PORTS) {
        if (await checkPortOpen(ip, port, TCP_TIMEOUT_MS)) openRtsp.push(port)
      }
      const openOther = []
      for (const port of OTHER_CCTV_PORTS) {
        if (await checkPortOpen(ip, port, TCP_TIMEOUT_MS)) openOther.push(port)
      }
      if (!openRtsp.length && !openOther.length) continue
      const confirmedRtsp = []
      for (const port of openRtsp) {
        if (await checkRtspOptions(ip, port, RTSP_TIMEOUT_MS)) confirmedRtsp.push(port)
      }
      if (confirmedRtsp.length || openOther.length) results.push({ ip, rtspPorts: confirmedRtsp, otherPorts: openOther })
    }
  }
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker))
  return results
}

// Pulls channel/RTSP-URL info out of an already-constructed (but not yet
// connected) Cam instance. Shared by both discovery paths below: the
// WS-Discovery broadcast path (which hands us pre-built Cam instances) and
// the direct-connect fallback (which builds one itself from a known
// IP/port). Returns null if this device didn't yield anything usable --
// wrong credentials, connection refused, not actually ONVIF, etc. Any of
// those are just "not confirmable this way", not fatal to the overall scan.
async function extractOnvifDevice(cam) {
  try {
    await cam.connect()
    const info = await cam.getDeviceInformation().catch(() => null)
    const profiles = await cam.getProfiles().catch(() => [])
    const channels = []
    for (const profile of profiles || []) {
      const token = profile && profile.$ && profile.$.token
      if (!token) continue
      try {
        const stream = await cam.getStreamUri({ protocol: 'RTSP', profileToken: token })
        if (stream && stream.uri) {
          channels.push({ name: profile.name || `Channel ${channels.length + 1}`, rtspUrl: stream.uri })
        }
      } catch (err) {
        // This one profile didn't yield a stream URI -- skip it, keep the rest.
      }
    }
    if (!channels.length) return null
    return { ip: cam.hostname, manufacturer: info && info.manufacturer, model: info && info.model, channels }
  } catch (err) {
    return null
  }
}

// Real ONVIF path via WS-Discovery's UDP multicast broadcast -- finds
// devices without needing to already know their IP. In practice this
// often finds nothing even on a network where ONVIF itself works fine:
// many NVRs ship with WS-Discovery disabled by default, and some routers
// drop multicast traffic entirely. That's not treated as a failure here --
// discoverOnvifDirect() below is the fallback for exactly this case.
async function discoverOnvifBroadcast(username, password) {
  const found = []
  let onvifPromises
  try {
    onvifPromises = require('onvif/promises')
  } catch (err) {
    console.error('ONVIF module not available (was `npm install` run in this folder?) -- skipping ONVIF discovery.')
    return found
  }
  const { Discovery } = onvifPromises

  // `Discovery` is a shared singleton EventEmitter inside the onvif
  // package, and it emits 'error' whenever any device's WS-Discovery
  // reply fails to parse -- notably, Hikvision-family firmware (like the
  // NVR this was tested against) pads its discovery replies with extra
  // whitespace to hit a minimum packet size, which the package's XML
  // parser chokes on. Node treats an 'error' event with zero listeners as
  // fatal and crashes the whole process; the try/catch below only guards
  // the Promise rejection path, not this separate event-based one, so
  // without this listener a single malformed reply from anywhere on the
  // network takes the entire installer down. A single malformed reply
  // also makes Discovery.probe() reject entirely (see its source -- any
  // parse error is collected and rejected even if OTHER devices were
  // found successfully), which is why discoverOnvifDirect() below exists
  // as a fallback that doesn't depend on broadcast discovery at all.
  Discovery.on('error', () => {})

  let cams = []
  try {
    cams = await Discovery.probe({ timeout: ONVIF_TIMEOUT_MS })
  } catch (err) {
    return found
  }

  for (const cam of cams) {
    cam.username = username
    cam.password = password
    const device = await extractOnvifDevice(cam)
    if (device) found.push(device)
  }
  return found
}

// Fallback for devices the broadcast above didn't find: connect directly
// to each IP the raw port scan already turned up, on each of its open
// HTTP-ish ports (ONVIF's SOAP service commonly lives on 80, 8000 or
// 8080 -- there's no reliable way to know which without just trying).
// This is what actually found the RTSP URL in the case that prompted this
// fallback to be added: the broadcast found nothing, but a direct
// connection to the NVR's already-known IP on port 80 worked fine.
async function discoverOnvifDirect(candidates, username, password) {
  let onvifPromises
  try {
    onvifPromises = require('onvif/promises')
  } catch (err) {
    return []
  }
  const { Cam } = onvifPromises

  const found = []
  for (const { ip, ports } of candidates) {
    for (const port of ports) {
      let cam
      try {
        cam = new Cam({ hostname: ip, port, username, password })
      } catch (err) {
        continue
      }
      const device = await extractOnvifDevice(cam)
      if (device) {
        found.push(device)
        break // this IP is accounted for -- no need to try its other ports
      }
    }
  }
  return found
}

async function main() {
  console.log('')
  console.log('='.repeat(64))
  console.log('  NIMBUS CAMERA / NVR DISCOVERY')
  console.log('='.repeat(64))

  const localIp = getLocalIPv4()
  if (!localIp) {
    console.error('Could not determine this computer\'s network address.')
    process.exitCode = 1
    rl.close()
    return
  }
  console.log('')
  console.log(`This computer is at ${localIp}. Scanning the local network for cameras/NVRs...`)
  console.log('This can take up to a minute.')
  console.log('')

  const username = await ask('NVR / camera admin username (used only locally, not sent to Nimbus): ')
  const password = await ask('NVR / camera admin password (used only locally, not sent to Nimbus): ')
  console.log('')
  console.log('Scanning...')

  const [broadcastResults, rawResults] = await Promise.all([
    discoverOnvifBroadcast(username, password),
    scanForRtspPorts(subnetHosts(localIp)),
  ])

  // Anything the broadcast already confirmed doesn't need a second,
  // slower, direct-connect attempt.
  const broadcastIps = new Set(broadcastResults.map((d) => d.ip))
  const directCandidates = rawResults
    .filter((d) => !broadcastIps.has(d.ip) && d.otherPorts.length)
    .map((d) => ({ ip: d.ip, ports: d.otherPorts }))
  const directResults = directCandidates.length
    ? await discoverOnvifDirect(directCandidates, username, password)
    : []

  const onvifResults = [...broadcastResults, ...directResults]
  const onvifIps = new Set(onvifResults.map((d) => d.ip))
  const possible = rawResults.filter((d) => !onvifIps.has(d.ip))

  console.log('')
  console.log('='.repeat(64))
  console.log('RESULTS')
  console.log('='.repeat(64))

  if (onvifResults.length) {
    console.log('')
    console.log('Confirmed cameras/NVRs (ready to use):')
    for (const device of onvifResults) {
      const label = device.manufacturer ? `  (${device.manufacturer}${device.model ? ' ' + device.model : ''})` : ''
      console.log('')
      console.log(`  ${device.ip}${label}`)
      for (const channel of device.channels) console.log(`    ${channel.name}: ${channel.rtspUrl}`)
    }
  }

  if (possible.length) {
    console.log('')
    console.log('Other devices with an RTSP-capable port open (exact URL not confirmed):')
    for (const device of possible) {
      console.log(`  ${device.ip}  (ports: ${[...device.rtspPorts, ...device.otherPorts].join(', ') || 'none'})`)
    }
    console.log('')
    console.log('  These did not respond to ONVIF, so the exact stream path could not be')
    console.log('  determined automatically. Open http://<ip> in a browser for that device\'s')
    console.log('  own dashboard/manual to find its RTSP URL format.')
  }

  console.log('')
  if (!onvifResults.length && !possible.length) {
    console.log('No cameras or NVRs were found automatically on this network.')
    process.exitCode = 1
    rl.close()
    return
  }

  console.log('Note down the RTSP URL(s) above -- you\'ll enter them in Nimbus after this gateway enrolls.')
  console.log('')
  await ask('Press Enter to continue with setup...')
  process.exitCode = 0
  rl.close()
}

main().catch((err) => {
  console.error('Discovery failed:', err && err.message ? err.message : err)
  process.exitCode = 1
  rl.close()
})
