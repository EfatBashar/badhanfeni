const isPreviewHost = (hostname: string) =>
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname === "lovableproject.com" ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "lovableproject-dev.com" ||
  hostname.endsWith(".lovableproject-dev.com") ||
  hostname === "beta.lovable.dev" ||
  hostname.endsWith(".beta.lovable.dev");

const unregisterAppWorker = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
      .map((registration) => registration.unregister()),
  );
};

export const setupPwa = async () => {
  if (!("serviceWorker" in navigator)) return;
  const disabled = new URLSearchParams(window.location.search).has("sw") && new URLSearchParams(window.location.search).get("sw") === "off";
  const refused = !import.meta.env.PROD || window.self !== window.top || isPreviewHost(window.location.hostname) || disabled;
  if (refused) {
    await unregisterAppWorker();
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
};