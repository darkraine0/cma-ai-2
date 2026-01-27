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
