/**
 * Formats a community slug into a readable name
 * Example: "del-webb" -> "Del Webb"
 */
export function formatCommunitySlug(slug: string): string {
  if (!slug) return '';
  
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts a community display name to a URL slug
 * Example: "Elevon at Lavon" -> "elevon-at-lavon"
 */
export function communityNameToSlug(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
