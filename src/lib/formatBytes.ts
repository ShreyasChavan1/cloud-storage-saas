// The backend reports storage in raw bytes (real WebDAV quota data) —
// these format them for display, replacing the old dummy data's
// hand-typed "12GB / 100GB" style values.
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${i === 0 ? value : value.toFixed(decimals)} ${units[i]}`
}
