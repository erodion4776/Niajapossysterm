
/**
 * PWA Update Management Utility
 * Manually triggers a check for new Service Worker versions.
 */
export async function forceUpdateCheck(): Promise<boolean> {
  if (!navigator.onLine) {
    throw new Error("Oga, you need a small amount of data to check for updates.");
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error("Software updates are not supported on this browser.");
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error("No update channel found. Please refresh and try again.");
    }

    // 1. Force the Service Worker to check the server for a new sw.js
    await registration.update();

    // 2. If a new version was found and is already waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }

    // 3. If no immediate update found, return false (user is likely on latest version)
    return false;
  } catch (err: any) {
    console.error("Manual update check failed:", err);
    throw err;
  }
}
