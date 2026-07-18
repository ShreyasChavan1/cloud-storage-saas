// Avatar initials are derived on the fly rather than stored — the users
// table doesn't carry a redundant column for it, so this runs anywhere
// a name needs to become "AK"-style initials (registration, profile update,
// DTO mapping).
export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
