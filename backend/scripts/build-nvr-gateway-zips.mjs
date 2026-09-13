// Regenerates public/nvr-gateway/nimbus-nvr-gateway-{windows,linux}.zip from
// the nvr-gateway/ source folder. Runs automatically before every build (see
// the "prebuild" script in package.json) so the zips served by the
// Settings > CCTV download buttons can never drift out of sync with the
// actual installer source again — that drift (a fixed install.ps1 in
// nvr-gateway/ while the shipped zip still had the old broken one) is
// exactly what caused gateway installs to silently fail before this script
// existed.
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const gatewaySrc = join(repoRoot, 'nvr-gateway')
const outDir = join(repoRoot, 'public', 'nvr-gateway')

// Files common to both platform packages. Deliberately excludes
// Dockerfile/docker-compose.yml (that path is for self-hosters comfortable
// with Docker, not the one-click customer installer) and package-lock.json
// (kept out of the original zips too — npm install resolves fresh).
const SHARED_FILES = ['README.md', '.gitignore', 'package.json', '.env.example', 'tsconfig.json']

const TARGETS = [
  { name: 'nimbus-nvr-gateway-windows.zip', extra: ['install.ps1', 'uninstall.ps1', 'install.bat'] },
  { name: 'nimbus-nvr-gateway-linux.zip', extra: ['install.sh', 'uninstall.sh'] },
]

function buildZip({ name, extra }) {
  return new Promise((resolve, reject) => {
    const outPath = join(outDir, name)
    const output = createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve(outPath))
    archive.on('warning', (err) => { if (err.code !== 'ENOENT') reject(err) })
    archive.on('error', reject)
    archive.pipe(output)

    const base = 'nimbus-nvr-gateway/'
    for (const file of [...SHARED_FILES, ...extra]) {
      const filePath = join(gatewaySrc, file)
      // install.bat only exists for the Windows target — skip quietly for
      // any file a given platform doesn't ship, rather than failing the
      // whole build over an optional file.
      if (!existsSync(filePath)) continue
      archive.file(filePath, { name: base + file })
    }
    archive.directory(join(gatewaySrc, 'src'), base + 'src')
    archive.finalize()
  })
}

if (!existsSync(gatewaySrc)) {
  console.error(`nvr-gateway source folder not found at ${gatewaySrc} — skipping gateway zip build.`)
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })

for (const target of TARGETS) {
  const outPath = await buildZip(target)
  console.log(`Built ${outPath}`)
}
