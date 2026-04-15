// AI-Flow Monitor - Background Service Worker with Supabase Sync
const SUPABASE_URL = "https://sjollshuztvkkfvgiaus.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/extension-sync`;

// Listen for usage detection from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "USAGE_DETECTED") {
    // Save locally first
    chrome.storage.local.get(["platforms"], (result) => {
      const platforms = result.platforms || [];
      const idx = platforms.findIndex((p) => p.name === message.platform);
      if (idx >= 0) {
        platforms[idx].used += message.units || 1;
        chrome.storage.local.set({ platforms });

        const pct = (platforms[idx].used / platforms[idx].quota) * 100;
        if (pct >= 80) {
          chrome.action.setBadgeText({ text: "!" });
          chrome.action.setBadgeBackgroundColor({ color: "#facc15" });
        }
      }
    });

    // Sync to backend
    chrome.storage.local.get(["auth_token"], (result) => {
      if (result.auth_token) {
        fetch(`${FUNCTION_URL}?action=log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.auth_token}`,
            "apikey": result.anon_key || "",
          },
          body: JSON.stringify({
            platform_name: message.platform,
            units: message.units || 1,
            description: message.description || "Auto-tracked by extension",
          }),
        }).catch(() => {});
      }
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.type === "LOGIN") {
    chrome.storage.local.set({
      auth_token: message.token,
      anon_key: message.anonKey,
    });
    syncFromBackend(message.token, message.anonKey);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "SYNC") {
    chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
      if (result.auth_token) {
        syncFromBackend(result.auth_token, result.anon_key);
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

function syncFromBackend(token, anonKey) {
  fetch(`${FUNCTION_URL}?action=sync`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey || "",
    },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.platforms) {
        chrome.storage.local.set({
          platforms: data.platforms,
          tip: data.tip,
        });
      }
    })
    .catch(() => {});
}

// Sync every 5 minutes
setInterval(() => {
  chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
    if (result.auth_token) {
      syncFromBackend(result.auth_token, result.anon_key);
    }
  });
}, 5 * 60 * 1000);
