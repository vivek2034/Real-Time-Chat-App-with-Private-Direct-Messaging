/**
 * Utility to generate and manage dynamic 3-slug randomized URLs.
 * Example: /x8b4pa/m9d2ke/c7v10w
 */

const ADJECTIVES = [
  "crimson", "silent", "astral", "quantum", "solaris", "shadow", "aurora", "vortex",
  "zenith", "hyper", "radiant", "drift", "pulse", "cosmic", "flux", "quartz", "arcane",
  "ember", "spectral", "nexus", "echo", "frost", "mystic", "lunar", "strata"
];

const NOUNS = [
  "haven", "beacon", "harbor", "matrix", "vector", "sanctum", "cluster", "orbit",
  "prism", "voyage", "canyon", "sphere", "summit", "signal", "node", "relay",
  "portal", "chasm", "valley", "falcon", "tempest", "mirage", "horizon", "cipher"
];

/**
 * Generates a random alphanumeric token
 */
export function generateRandomToken(length = 6): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates 3 random slugs.
 * Produces clean 3-part slug arrays, e.g. ["x7k2fa", "m9p4cd", "w3b89e"]
 * or blended with words for great visual balance.
 */
export function generateThreeSlugs(type: "alphanumeric" | "blended" = "alphanumeric"): [string, string, string] {
  if (type === "blended") {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const token = generateRandomToken(5);
    return [adj, noun, token];
  }

  return [
    generateRandomToken(6),
    generateRandomToken(6),
    generateRandomToken(6),
  ];
}

/**
 * Returns current 3-slug path or generates a new one.
 */
export function getOrCreateThreeSlugPath(): string {
  if (typeof window === "undefined") return "/";

  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);

  // If already exactly 3 valid slugs, return current
  if (segments.length === 3 && segments.every((s) => s.length >= 2 && /^[a-zA-Z0-9_-]+$/.test(s))) {
    return `/${segments[0]}/${segments[1]}/${segments[2]}`;
  }

  // Otherwise generate 3 new random slugs
  const [s1, s2, s3] = generateThreeSlugs("alphanumeric");
  return `/${s1}/${s2}/${s3}`;
}

/**
 * Replaces the browser URL in the address bar with 3 new random slugs
 * without reloading the page or breaking WebSockets/connections.
 */
export function rotateThreeSlugUrl(type: "alphanumeric" | "blended" = "alphanumeric"): string {
  if (typeof window === "undefined") return "/";

  const [s1, s2, s3] = generateThreeSlugs(type);
  const newPath = `/${s1}/${s2}/${s3}`;
  
  // Preserve any existing search params or hash if present
  const fullUrl = `${newPath}${window.location.search}${window.location.hash}`;
  window.history.replaceState({ slugs: [s1, s2, s3] }, "", fullUrl);
  return newPath;
}
