
const SECRET_SALT = "NaijaPOS_2025_Secret_v1";

/**
 * Generates a short hash from a string using SHA-256.
 * Returns a hexadecimal representation.
 */
async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets or creates a unique Device ID (Request Code).
 */
export async function getRequestCode(): Promise<string> {
  let uuid = localStorage.getItem('device_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_uuid', uuid);
  }

  const rawString = `${navigator.userAgent}-${window.screen.width}-${uuid}`;
  const hash = await sha256(rawString);
  
  // Format as NY-XXXX-XXXX
  const part1 = hash.substring(0, 4).toUpperCase();
  const part2 = hash.substring(4, 8).toUpperCase();
  return `NS-${part1}-${part2}`;
}

/**
 * Verifies if an entered activation key is valid for a given request code.
 */
export async function verifyActivationKey(requestCode: string, enteredKey: string): Promise<boolean> {
  if (!enteredKey || enteredKey.length < 10) return false;
  
  const target = requestCode.trim() + SECRET_SALT;
  const hash = await sha256(target);
  
  // Key is valid if it matches the first 10 characters of the secret hash (case insensitive)
  const validKeyPrefix = hash.substring(0, 10).toUpperCase();
  return enteredKey.trim().toUpperCase() === validKeyPrefix;
}
