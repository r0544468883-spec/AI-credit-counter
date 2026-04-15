// AI-Flow Monitor - Background Service Worker
// Features: sync, offline queue, badge, context menu, keyboard shortcuts
const SUPABASE_URL = "https://sjollshuztvkkfvgiaus.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/extension-sync`;

// ─── Context Menu ───
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai-flow-log",
    title: "רשום שימוש ב-AI-Flow",
    contexts: ["page", "selection"],
    documentUrlPatterns: [
      "https://chat.openai.com/*",
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://www.perplexity.ai/*",
      "https://perplexity.ai/*",
      "https://app.runwayml.com/*",
      "https://discord.com/*",
    ],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ai-flow-log") {
    const url = tab?.url || "";
    let platform = "Unknown";
    if (/chatgpt|openai/i.test(url)) platform = "ChatGPT";
    else if (/claude/i.test(url)) platform = "Claude";
    else if (/gemini/i.test(url)) platform = "Gemini";
    else if (/perplexity/i.test(url)) platform = "Perplexity";
    else if (/runway/i.test(url)) platform = "Runway";
    else if (/discord/i.test(url)) platform = "Midjourney";

    handleUsageDetected({
      platform,
      units: 1,
      description: "Manual log via context menu",
    });
  }
});

// ─── Keyboard Shortcuts ───
chrome.commands.onCommand.addListener((command) => {
  if (command === "quick-log") {
    // Log 1 unit to the active platform based on current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || "";
      let platform = null;
      if (/chatgpt|openai/i.test(url)) platform = "ChatGPT";
      else if (/claude/i.test(url)) platform = "Claude";
      else if (/gemini/i.test(url)) platform = "Gemini";
      else if (/perplexity/i.test(url)) platform = "Perplexity";
      else if (/runway/i.test(url)) platform = "Runway";
      else if (/discord/i.test(url)) platform = "Midjourney";

      if (platform) {
        handleUsageDetected({
          platform,
          units: 1,
          description: "Quick log via keyboard shortcut",
        });
      }
    });
  }
});

// ─── Badge Update ───
function updateBadge() {
  chrome.storage.local.get(["platforms"], (result) => {
    const platforms = result.platforms || [];
    const alertCount = platforms.filter((p) => {
      const pct = p.quota > 0 ? (p.used / p.quota) * 100 : 0;
      return pct >= 80;
    }).length;

    if (alertCount > 0) {
      chrome.action.setBadgeText({ text: String(alertCount) });
      const hasExhausted = platforms.some((p) => p.quota > 0 && (p.used / p.quota) >= 1);
      chrome.action.setBadgeBackgroundColor({ color: hasExhausted ? "#ef4444" : "#facc15" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
}

// ─── Offline Queue ───
async function flushOfflineQueue() {
  const result = await chrome.storage.local.get(["offline_queue", "auth_token", "anon_key"]);
  const queue = result.offline_queue || [];
  if (!queue.length || !result.auth_token) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const resp = await fetch(`${FUNCTION_URL}?action=${item.action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${result.auth_token}`,
          apikey: result.anon_key || "",
        },
        body: JSON.stringify(item.body),
      });
      if (!resp.ok) remaining.push(item); // Retry later
    } catch {
      remaining.push(item); // Network error, keep in queue
    }
  }
  chrome.storage.local.set({ offline_queue: remaining });
}

function enqueue(action, body) {
  chrome.storage.local.get(["offline_queue"], (result) => {
    const queue = result.offline_queue || [];
    queue.push({ action, body, queued_at: new Date().toISOString() });
    // Cap queue at 200 items
    chrome.storage.local.set({ offline_queue: queue.slice(-200) });
  });
}

function sendToBackend(action, body) {
  chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
    if (!result.auth_token) {
      enqueue(action, body);
      return;
    }
    fetch(`${FUNCTION_URL}?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.auth_token}`,
        apikey: result.anon_key || "",
      },
      body: JSON.stringify(body),
    }).catch(() => {
      enqueue(action, body);
    });
  });
}

// ─── Message Handling ───
function handleUsageDetected(message) {
  chrome.storage.local.get(["platforms", "notified_thresholds"], (result) => {
    const platforms = result.platforms || [];
    const notified = result.notified_thresholds || {};
    const idx = platforms.findIndex((p) => p.name === message.platform);
    if (idx >= 0) {
      platforms[idx].used += message.units || 1;
      chrome.storage.local.set({ platforms });

      const pct = (platforms[idx].used / platforms[idx].quota) * 100;
      const key = platforms[idx].name;

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
      }

      updateBadge();
    }
  });

  sendToBackend("log", {
    platform_name: message.platform,
    units: message.units || 1,
    model_name: message.model || null,
    description: message.description || "Auto-tracked by extension",
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "USAGE_DETECTED") {
    handleUsageDetected(message);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "QUOTA_SCRAPED") {
    chrome.storage.local.get(["scraped_snapshots"], (result) => {
      const snapshots = result.scraped_snapshots || {};
      snapshots[message.platform] = {
        data: message.snapshots,
        scraped_at: new Date().toISOString(),
      };
      chrome.storage.local.set({ scraped_snapshots: snapshots });
    });

    sendToBackend("update-quota", {
      platform_name: message.platform,
      snapshots: message.snapshots,
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
    flushOfflineQueue();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "SYNC") {
    chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
      if (result.auth_token) {
        syncFromBackend(result.auth_token, result.anon_key);
        flushOfflineQueue();
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
        updateBadge();
      }
    })
    .catch(() => {});
}

// Sync every 5 minutes + flush offline queue
setInterval(() => {
  chrome.storage.local.get(["auth_token", "anon_key"], (result) => {
    if (result.auth_token) {
      syncFromBackend(result.auth_token, result.anon_key);
      flushOfflineQueue();
    }
  });
}, 5 * 60 * 1000);

// Clean old hashes every hour
setInterval(() => {
  ["chatgpt_hashes", "claude_hashes", "gemini_hashes", "perplexity_hashes"].forEach((key) => {
    chrome.storage.local.get([key], (result) => {
      const arr = result[key] || [];
      if (arr.length > 500) {
        chrome.storage.local.set({ [key]: arr.slice(-300) });
      }
    });
  });
}, 60 * 60 * 1000);

// Update badge on startup
updateBadge();
