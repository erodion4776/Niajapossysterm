
/**
 * Security Utility for NaijaShop POS
 * Handles device fingerprinting and offline activation verification with YYYYMMDD format.
 */

const MASTER_SALT = "NaijaPOS_2025_Sec" + "ret_Keep_Safe_99";

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
 * Format: SIGNATURE-YYYYMMDD
 * SIGNATURE = First 10 chars of HASH(RequestCode + DatePart + MASTER_SALT)
 */
export async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<{isValid: boolean, expiryDate?: string, signature?: string}> {
  if (!enteredKey || !enteredKey.includes('-')) return { isValid: false };
  
  const [keyPart, datePart] = enteredKey.trim().toUpperCase().split('-');
  
  if (!keyPart || !datePart || datePart.length !== 8) return { isValid: false };
  
  const combo = requestCode.trim().toUpperCase() + datePart + MASTER_SALT;
  const secretHash = await hashString(combo);
  const validSignature = secretHash.substring(0, 10).toUpperCase();
  
  if (keyPart === validSignature) {
    return { 
      isValid: true, 
      expiryDate: datePart,
      signature: keyPart
    };
  }
  
  return { isValid: false };
}

/**
 * Verifies a PIN Reset Key.
 * Formula: SHA256(RequestCode + "RESET_PIN" + MASTER_SALT).substring(0, 8)
 */
export async function verifyResetKey(requestCode: string, enteredKey: string): Promise<boolean> {
  if (!enteredKey || enteredKey.length !== 8) return false;
  
  const combo = requestCode.trim().toUpperCase() + "RESET_PIN" + MASTER_SALT;
  const secretHash = await hashString(combo);
  const validKey = secretHash.substring(0, 8).toUpperCase();
  
  return enteredKey.trim().toUpperCase() === validKey;
}

/**
 * Validates integrity of stored license values.
 */
export async function validateLicenseIntegrity(requestCode: string, savedKey: string, savedExpiry: string): Promise<boolean> {
  if (!savedKey || !savedExpiry) return false;
  const result = await verifyActivationKey(requestCode, `${savedKey}-${savedExpiry}`);
  return result.isValid && result.expiryDate === savedExpiry && result.signature === savedKey;
}
