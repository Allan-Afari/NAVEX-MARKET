/**
 * Global Offline Mode Handler
 * Intercepts all fetch calls and logs them when offline mode is enabled.
 * This should only be active during development or with an explicit feature flag.
 */

const originalFetch = typeof window !== "undefined" ? window.fetch : undefined;

export function enableOfflineMode() {
  if (typeof window === "undefined" || !originalFetch) {
    return;
  }

  console.log("🔵 OFFLINE MODE: Enabled - All network calls intercepted");

  window.fetch = async (...args: any[]) => {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    console.log(`📡 FETCH: ${url}`);

    try {
      const response = await originalFetch.apply(window, args);

      if (!response.ok) {
        console.warn(`⚠️ FETCH ERROR: ${url} returned ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`❌ FETCH FAILED: ${url}`, error);

      return new Response(
        JSON.stringify({
          error: "Offline Mode: Network request failed. Using local data.",
          original_error: String(error),
        }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  window.addEventListener("error", (e) => {
    if (e.message?.includes("CORS") || e.message?.includes("fetch")) {
      e.preventDefault();
    }
  });
}

const offlineModeEnabled =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_OFFLINE_MODE === "true";

if (offlineModeEnabled) {
  enableOfflineMode();
} else if (typeof window !== "undefined") {
  console.info("Offline mode disabled by configuration");
}
