// AI-Flow Monitor - Background Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "USAGE_DETECTED") {
    chrome.storage.local.get(["platforms"], (result) => {
      const platforms = result.platforms || [];
      const idx = platforms.findIndex((p) => p.name === message.platform);
      if (idx >= 0) {
        platforms[idx].used += message.units || 1;
        chrome.storage.local.set({ platforms });

        // Check threshold
        const pct = (platforms[idx].used / platforms[idx].quota) * 100;
        if (pct >= 80) {
          chrome.action.setBadgeText({ text: "!" });
          chrome.action.setBadgeBackgroundColor({ color: "#facc15" });
        }
      }
      sendResponse({ success: true });
    });
    return true;
  }
});

// Clear badge on popup open
chrome.action.onClicked?.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});
