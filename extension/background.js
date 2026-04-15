// AI-Flow Monitor - Background Service Worker with Supabase Sync
const SUPABASE_URL = "https://sjollshuztvkkfvgiaus.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/extension-sync`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- Chat message counting (fallback) ---
  if (message.type === "USAGE_DETECTED") {
    chrome.storage.local.get(["platforms", "notified_thresholds"], (result) => {
      const platforms = result.platforms || [];
      const notified = result.notified_thresholds || {};
      const idx = platforms.findIndex((p) => p.name === message.platform);
      if (idx >= 0) {
        platforms[idx].used += message.units || 1;
        chrome.storage.local.set({ platforms });

        const pct = (platforms[idx].used / platforms[idx].quota) * 100;
        const key = platforms[idx].name;

        if (pct >= 80) {
          chrome.action.setBadgeText({ text: "!" });
          chrome.action.setBadgeBackgroundColor({ color: "#facc15" });
        }

        // Push notification at 80%
        if (pct >= 80 && pct < 100 && !notified[key + "_80"]) {
          notified[key + "_80"] = true;
          chrome.storage.local.set({ notified_thresholds: notified });
          chrome.notifications.create(key + "_80", {
            type: "basic",
            iconUrl: "icon.png",
            title: "⚠️ AI-Flow Monitor",
            message: `${key}: הגעת ל-${Math.round(pct)}% מהמכסה (${platforms[idx].used}/${platforms[idx].quota})`,
          });
        }

        // Push notification at 100%
        if (pct >= 100 && !notified[key + "_100"]) {
          notified[key + "_100"] = true;
          chrome.storage.local.set({ notified_thresholds: notified });
          chrome.notifications.create(key + "_100", {
            type: "basic",
            iconUrl: "icon.png",
            title: "🚨 AI-Flow Monitor",
            message: `${key}: המכסה נגמרה! (${platforms[idx].used}/${platforms[idx].quota})`,
          });
          chrome.action.setBadgeText({ text: "⛔" });
          chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        }
      }
    });

    chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
      if (result.auth_token) {
        fetch(`${FUNCTION_URL}?action=log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${result.auth_token}`,
            apikey: result.anon_key || "",
          },
          body: JSON.stringify({
            platform_name: message.platform,
            units: message.units || 1,
            model_name: message.model || null,
            description: message.description || "Auto-tracked by extension",
          }),
        }).catch(() => {});
      }
    });

    sendResponse({ success: true });
    return true;
  }

  // --- Quota scraped from settings pages (primary) ---
  if (message.type === "QUOTA_SCRAPED") {
    // Save locally
    chrome.storage.local.get(["scraped_snapshots"], (result) => {
      const snapshots = result.scraped_snapshots || {};
      snapshots[message.platform] = {
        data: message.snapshots,
        scraped_at: new Date().toISOString(),
      };
      chrome.storage.local.set({ scraped_snapshots: snapshots });
    });

    // Sync to backend
    chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
      if (result.auth_token) {
        fetch(`${FUNCTION_URL}?action=update-quota`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${result.auth_token}`,
            apikey: result.anon_key || "",
          },
          body: JSON.stringify({
            platform_name: message.platform,
            snapshots: message.snapshots,
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
      Authorization: `Bearer ${token}`,
      apikey: anonKey || "",
    },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.platforms) {
        chrome.storage.local.set({
          platforms: data.platforms,
          tip: data.tip,
          scraped_snapshots: data.snapshots || {},
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

// Clean old hashes every hour
setInterval(() => {
  ["chatgpt_hashes", "claude_hashes", "gemini_hashes"].forEach((key) => {
    chrome.storage.local.get([key], (result) => {
      const arr = result[key] || [];
      if (arr.length > 500) {
        chrome.storage.local.set({ [key]: arr.slice(-300) });
      }
    });
  });
}, 60 * 60 * 1000);
