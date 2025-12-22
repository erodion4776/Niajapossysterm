/**
 * Security Utility for NaijaShop POS
 * Handles device fingerprinting, licensing, and offline activation.
 */

// This pulls the secret from your Netlify Environment Variables
const APP_SALT = import.meta.env.VITE_APP_SALT || "NaijaPOS_Ultra_Secret_2025_v1";

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
 * Generates a unique 8-character ID for this specific phone/device.
 * Format: NG-XXXX-XXXX
 */
export async function generateRequestCode(): Promise<string> {
  let uuid = localStorage.getItem('device_fingerprint');
  
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_fingerprint', uuid);
  }

  // Create a fingerprint based on the device and the UUID
  const fingerprintSource = `${navigator.userAgent}-${window.screen.width}x${window.screen.height}-${uuid}`;
  const hash = await hashString(fingerprintSource);
  
  // Format as NG-XXXX-XXXX
  const part1 = hash.substring(0, 4).toUpperCase();
  const part2 = hash.substring(4, 8).toUpperCase();
  
  return `NG-${part1}-${part2}`;
}

/**
 * Verifies if the entered key matches the Request Code + Secret Salt.
 */
async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<boolean> {
  if (!enteredKey || enteredKey.length < 8) return false;

  // This must match the logic in your keygen.html exactly
  const combo = requestCode.trim().toUpperCase() + APP_SALT;
  const secretHash = await hashString(combo);
  
  // We compare the first 10 characters of the hash
  const validKey = secretHash.substring(0, 10).toUpperCase();
  
  return enteredKey.trim().toUpperCase() === validKey;
}

/**
 * The main function called by the LockScreen to unlock the app.
 */
export const unlockApp = async (enteredKey: string): Promise<boolean> => {
  const code = await generateRequestCode();
  const isValid = await verifyActivationKey(code, enteredKey);
  
  if (isValid) {
    localStorage.setItem('is_activated', 'true');
    // Also save to IndexedDB if your db.ts logic supports it
    return true;
  }
  
  return false;
};

/**
 * Domain Protection: Prevents the app from running on unauthorized websites.
 */
export const isDomainAuthorized = (): boolean => {
  const authorizedDomain = "naijashop-pos.netlify.app"; // Update this to your real Netlify URL
  const currentDomain = window.location.hostname;
  
  // Allow localhost for testing, but block other domains
  if (currentDomain === "localhost" || currentDomain === "127.0.0.1") return true;
  
  return currentDomain === authorizedDomain;
};
