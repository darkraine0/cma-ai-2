// Utility function to get the appropriate image path for a community
// Maps community names to their corresponding image files in /public/communities/

// Normalize community name for image matching
const normalizeCommunityName = (communityName: string): string => {
  return communityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
};

// Map of normalized community names to image filenames
const communityImageMap: Record<string, string> = {
  'brookville': 'brookville.jpg',
  'cambridgecrossing': 'cambridgecrossing.webp',
  'creekside': 'creekside.jpg',
  'echopark': 'echopark.jpg',
  'edgewater': 'edgewater.jpg',
  'elevon': 'elevon.webp',
  'lakebreeze': 'lakebreeze.jpg',
  'maddox': 'maddox.jpg',
  'milrany': 'milrany.jpg',
  'myrtlecreek': 'myrtlecreek.webp',
  'pickens': 'pickens.jpg',
  'reunion': 'reunion.jpg',
  'walden': 'walden.jpg',
  'wildflower': 'wildflower.jpg',
};

/**
 * Get the image path for a community
 * @param communityName - The name of the community (can be full name or slug/first word)
 * @returns The path to the community image, or a default placeholder if not found
 */
export const getCommunityImage = (communityName: string | { name?: string } | any): string => {
  // Handle different input types
  let name: string;
  if (typeof communityName === 'string') {
    name = communityName;
  } else if (communityName && typeof communityName === 'object' && communityName.name) {
    name = communityName.name;
  } else {
    name = String(communityName || '');
  }

  const normalized = normalizeCommunityName(name);
  
  // First, try exact match
  let imageFile = communityImageMap[normalized];
  
  // If no exact match, try to find a community image that starts with the normalized name
  // This handles cases where the slug (first word) is used instead of full name
  // e.g., "cambridge" should match "cambridgecrossing"
  if (!imageFile) {
    const matchingKey = Object.keys(communityImageMap).find(key => 
      key.startsWith(normalized) || normalized.startsWith(key)
    );
    if (matchingKey) {
      imageFile = communityImageMap[matchingKey];
    }
  }

  if (imageFile) {
    return `/communities/${imageFile}`;
  }

  // Fallback to a default placeholder or the first available image
  // You can customize this fallback behavior
  return '/communities/elevon.webp'; // Default fallback image
};

