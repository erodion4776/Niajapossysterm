
/**
 * Security Utility for NaijaShop POS
 * Handles device fingerprinting and offline activation verification with Expiry.
 */

const getSalt = (): string => {
  const env = (import.meta as any).env;
  const proc = (typeof process !== 'undefined') ? (process as any).env : {};
  return env?.VITE_APP_SALT || proc?.VITE_APP_SALT || 'NAIJA_SECURE_2025';
};

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
 */
export async function generateRequestCode(): Promise<string> {
  let uuid = localStorage.getItem('device_fingerprint');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_fingerprint', uuid);
  }
  const fingerprintSource = `${navigator.userAgent}-${window.screen.width}x${window.screen.height}-${uuid}`;
  const hash = await hashString(fingerprintSource);
  const part1 = hash.substring(0, 2).toUpperCase();
  const part2 = hash.substring(2, 5).toUpperCase();
  return `NG-${part1}-${part2}`;
}

export const getRequestCode = generateRequestCode;

/**
 * Offline verification logic for Subscriptions.
 * Format expected: SIGNATURE-EXPIRY_HEX
 * SIGNATURE = First 10 chars of HASH(RequestCode + ExpiryHex + Salt)
 */
export async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<{isValid: boolean, expiry?: number}> {
  if (!enteredKey || !enteredKey.includes('-')) return { isValid: false };
  
  const [signature, expiryHex] = enteredKey.trim().toUpperCase().split('-');
  const salt = getSalt();
  
  if (!signature || !expiryHex) return { isValid: false };
  
  const combo = requestCode.trim().toUpperCase() + expiryHex + salt.trim();
  const secretHash = await hashString(combo);
  const validSignature = secretHash.substring(0, 10).toUpperCase();
  
  if (signature === validSignature) {
    // Decode expiry timestamp from Hex
    const expiryTimestamp = parseInt(expiryHex, 16);
    return { 
      isValid: true, 
      expiry: expiryTimestamp 
    };
  }
  
  return { isValid: false };
}

/**
 * Validates integrity of stored license values.
 * Used for Wipe Protection and Device-ID mismatch detection.
 */
export async function validateLicenseIntegrity(requestCode: string, savedKey: string, savedExpiry: number): Promise<boolean> {
  if (!savedKey || !savedExpiry) return false;
  const result = await verifyActivationKey(requestCode, savedKey);
  // Key must match current device ID AND the stored expiry must match the signed expiry inside the key
  return result.isValid && result.expiry === savedExpiry;
}
