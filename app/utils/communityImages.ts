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

type CommunityImageInput = string | { name?: string; _id?: string; hasImage?: boolean; imagePath?: string | null; bannerPath?: string | null } | any;

function resolveNameBasedImage(communityName: CommunityImageInput): string {
  let name: string;
  if (typeof communityName === 'string') {
    name = communityName;
  } else if (communityName && typeof communityName === 'object' && communityName.name) {
    name = communityName.name;
  } else {
    name = String(communityName || '');
  }
  const normalized = normalizeCommunityName(name);
  let imageFile = communityImageMap[normalized];
  if (!imageFile) {
    const matchingKey = Object.keys(communityImageMap).find(key =>
      key.startsWith(normalized) || normalized.startsWith(key)
    );
    if (matchingKey) imageFile = communityImageMap[matchingKey];
  }
  if (imageFile) return `/communities/${imageFile}`;
  return '/communities/elevon.webp';
}

/**
 * Get the image path for the community card/thumbnail (listing page).
 * Prefers imagePath (card image), then bannerPath, then legacy hasImage, then name-based default.
 */
export const getCommunityCardImage = (communityName: CommunityImageInput): string => {
  if (communityName && typeof communityName === 'object') {
    if (communityName.imagePath) return communityName.imagePath;
    if (communityName.bannerPath) return communityName.bannerPath;
    if (communityName._id && communityName.hasImage) return `/api/communities/${communityName._id}/image`;
  }
  return resolveNameBasedImage(communityName);
};

/**
 * Get the image path for a community banner/header (detail & chart pages).
 * Prefers bannerPath, then imagePath, then legacy hasImage, then name-based default.
 */
export const getCommunityImage = (communityName: CommunityImageInput): string => {
  if (communityName && typeof communityName === 'object') {
    if (communityName.bannerPath) return communityName.bannerPath;
    if (communityName.imagePath) return communityName.imagePath;
    if (communityName._id && communityName.hasImage) return `/api/communities/${communityName._id}/image`;
  }
  return resolveNameBasedImage(communityName);
};

