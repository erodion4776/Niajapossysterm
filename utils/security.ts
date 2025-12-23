
/**
 * Security Utility for NaijaShop POS
 * Handles device fingerprinting and offline activation verification.
 */

// Access environment variables using Vite's standard import.meta.env
// We use type casting to avoid TypeScript errors in environments without d.ts files
const getSalt = (): string => {
  const env = (import.meta as any).env;
  const proc = (typeof process !== 'undefined') ? (process as any).env : {};
  
  return env?.VITE_APP_SALT || proc?.VITE_APP_SALT || '';
};

const APP_SALT = getSalt();

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
 * Generates a unique ID for this device.
 * Format: NG-XX-XXX
 */
export async function generateRequestCode(): Promise<string> {
  let uuid = localStorage.getItem('device_fingerprint');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_fingerprint', uuid);
  }

  // Consistent fingerprint source
  const fingerprintSource = `${navigator.userAgent}-${window.screen.width}x${window.screen.height}-${uuid}`;
  const hash = await hashString(fingerprintSource);
  
  // Format as NG-XX-XXX
  const part1 = hash.substring(0, 2).toUpperCase();
  const part2 = hash.substring(2, 5).toUpperCase();
  return `NG-${part1}-${part2}`;
}

export const getRequestCode = generateRequestCode;

/**
 * Offline verification logic.
 * Concatenates Request Code and Secret Salt, then hashes.
 */
export async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<boolean> {
  if (!enteredKey || enteredKey.length < 5) return false;
  
  const salt = getSalt();
  
  if (!salt) {
    console.warn("SECURITY WARNING: VITE_APP_SALT is not defined in environment variables. Key verification will fail.");
    return false;
  }
  
  // Logic must match keygen.html exactly: RequestCode + Salt
  const combo = requestCode.trim().toUpperCase() + salt.trim();
  const secretHash = await hashString(combo);
  
  // Activation key is the first 10 characters of the secret hash
  const validKey = secretHash.substring(0, 10).toUpperCase();
  
  return enteredKey.trim().toUpperCase() === validKey;
}

/**
 * Main unlock function
 */
export const unlockApp = async (enteredKey: string): Promise<boolean> => {
  const code = await generateRequestCode();
  return verifyActivationKey(code, enteredKey);
};
