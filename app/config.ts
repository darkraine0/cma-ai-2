// Use environment variable if available, otherwise fall back to development vs production logic
// In Next.js, API routes are served from the same origin, so we use relative paths
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default API_URL;

