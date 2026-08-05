/**
 * Shared text-search/filter utility for client-side filtering.
 *
 * Normalizes the query and each field to lowercase + trimmed, so search
 * is case-insensitive and whitespace-tolerant across all pages.
 */

/**
 * Returns true if any of the provided fields contain the query string
 * (case-insensitive, trimmed).
 *
 * @param query  The user's search input
 * @param fields  Array of strings to search against
 * @returns boolean
 */
export function matchesSearch(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true
  const q = query.trim().toLowerCase()
  return fields.some(field => {
    if (!field) return false
    return field.toLowerCase().includes(q)
  })
}

/**
 * Returns true if the item matches the active filter value.
 * If filterValue is empty/falsy, returns true (no filter active).
 */
export function matchesFilter<T>(item: T, filterValue: string | undefined, getter: (item: T) => string): boolean {
  if (!filterValue || filterValue === 'All' || filterValue === 'all') return true
  return getter(item) === filterValue
}