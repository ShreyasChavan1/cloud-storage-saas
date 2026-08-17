// Tiny posix-style path helpers shared across the app. The backend already
// normalizes everything server-side (see backend/src/utils/davPath.ts), so
// these just need to be "good enough" to build/parse sensible paths
// client-side — not a full path-parsing library.

export function joinPath(base: string | undefined, segment: string): string {
  if (!base || base === '/') return `/${segment}`
  return `${base}/${segment}`
}

export function dirname(path: string): string | undefined {
  const idx = path.lastIndexOf('/')
  if (idx <= 0) return undefined
  return path.slice(0, idx)
}

export function basename(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? path : path.slice(idx + 1)
}

export function splitExt(name: string): [string, string] {
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return [name, '']
  return [name.slice(0, idx), name.slice(idx)]
}

// Is `path` inside (or equal to) `dir`?
export function isUnderDir(path: string | undefined, dir: string): boolean {
  return path === dir || (path?.startsWith(`${dir}/`) ?? false)
}
