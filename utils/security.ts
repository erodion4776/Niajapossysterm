
/**
 * Security Utility for NaijaShop POS
 * Handles device fingerprinting and offline activation verification.
 */

// Fix: Replaced import.meta.env with process.env to resolve TypeScript error and maintain environmental variable access consistency.
const APP_SALT = process.env.VITE_APP_SALT;

/**
 * Generates a SHA-256 hash of a string.
 */
async function hashString(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a unique 8-character ID for this device.
 * Format: NG-XX-XXX (e.g., NG-88-XYZ)
 */
export async function generateRequestCode(): Promise<string> {
  let uuid = localStorage.getItem('device_fingerprint');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_fingerprint', uuid);
  }

  // Combine factors to ensure uniqueness per device/browser fingerprint
  const fingerprintSource = `${navigator.userAgent}-${window.screen.width}x${window.screen.height}-${uuid}`;
  const hash = await hashString(fingerprintSource);
  
  // Format as NG-XX-XXX
  const part1 = hash.substring(0, 2).toUpperCase();
  const part2 = hash.substring(2, 5).toUpperCase();
  return `NG-${part1}-${part2}`;
}

/**
 * Alias for getRequestCode to match component usage
 */
export const getRequestCode = generateRequestCode;

/**
 * Offline verification logic (unlockApp).
 * Hashes Request Code + Secret Salt and checks if it matches the enteredKey.
 */
export async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<boolean> {
  if (!enteredKey || enteredKey.length < 10) return false;
  
  // Check if SALT exists to prevent hashing undefined
  if (!APP_SALT) {
    console.error("Critical: VITE_APP_SALT is not defined in the environment.");
    return false;
  }
  
  const combo = requestCode.trim() + APP_SALT;
  const secretHash = await hashString(combo);
  
  // The activation key must match the first 10 characters of the secret hash
  const validKey = secretHash.substring(0, 10).toUpperCase();
  return enteredKey.trim().toUpperCase() === validKey;
}

/**
 * Main unlock function as requested
 */
export const unlockApp = async (enteredKey: string): Promise<boolean> => {
  const code = await generateRequestCode();
  return verifyActivationKey(code, enteredKey);
};
