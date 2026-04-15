// AI-Flow Monitor - Content Script for Discord (Midjourney tracking)
// Detects /imagine commands and upscale actions in Discord
(function () {
  const seenIds = new Set();

  function detectMidjourneyAction(el) {
    const text = (el.textContent || "").trim();
    
    // /imagine command results (4 images = 4 credits typically)
    if (/\*\*.*\*\*\s*-\s*<@/i.test(text) || /\*\*.*\*\*\s*-\s*Image/i.test(text)) {
      return { type: "imagine", units: 4 };
    }
    
    // Upscale (U1-U4) = 1 credit
    if (/Upscaled\s*\(.*\)\s*by/i.test(text) || /U[1-4]\s*by/i.test(text)) {
      return { type: "upscale", units: 1 };
    }

    // Variation (V1-V4) = 4 credits
    if (/Variations\s*\(.*\)\s*by/i.test(text) || /V[1-4]\s*by/i.test(text)) {
      return { type: "variation", units: 4 };
    }

    // Zoom/Pan = 4 credits
    if (/Zoom\s*Out|Pan\s*(Left|Right|Up|Down)/i.test(text)) {
      return { type: "zoom", units: 4 };
    }

    return null;
  }

  const observer = new MutationObserver(() => {
    // Discord messages from Midjourney Bot
    const messages = document.querySelectorAll('[data-author-id="936929561302675456"], [class*="message"]');
    
    messages.forEach((msg) => {
      const msgId = msg.id || msg.getAttribute("data-list-item-id");
      if (!msgId || seenIds.has(msgId)) return;

      // Check if this is from Midjourney Bot
      const authorEl = msg.querySelector('[class*="username"]');
      const author = authorEl?.textContent?.trim() || "";
      if (!/midjourney\s*bot/i.test(author)) return;

      const action = detectMidjourneyAction(msg);
      if (action) {
        seenIds.add(msgId);
        chrome.runtime.sendMessage({
          type: "USAGE_DETECTED",
          platform: "Midjourney",
          units: action.units,
          model: "Midjourney",
          description: `${action.type} (${action.units} credits)`,
        });
      }
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Persist seen IDs
  chrome.storage.local.get(["discord_seen_ids"], (result) => {
    const stored = result.discord_seen_ids || [];
    stored.forEach((id) => seenIds.add(id));
  });

  setInterval(() => {
    const arr = Array.from(seenIds).slice(-300);
    chrome.storage.local.set({ discord_seen_ids: arr });
  }, 30000);

  console.log("[AI-Flow Monitor] Discord/Midjourney tracker active");
})();
