// AI-Flow Monitor - Content Script for ChatGPT
// Dual mode: chat message counting (fallback) + settings page scraping (primary)
(function () {
  let lastMessageCount = 0;
  const seenHashes = new Set();

  // --- Hash-based dedup ---
  function hashMessage(el) {
    const text = (el.textContent || "").slice(0, 120).trim();
    return text.length > 10 ? text : null;
  }

  // --- Model detection ---
  function detectModel() {
    // ChatGPT shows model name in the dropdown/button at top
    const selectors = [
      '[data-testid="model-switcher"] span',
      'button[aria-label*="Model"] span',
      '.text-token-text-secondary span',
      '[class*="model"] span',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (/gpt|o1|o3|4o/i.test(text)) return text;
      }
    }
    return null;
  }

  // --- DALL-E image detection ---
  let seenImages = new Set();

  function detectDallEImages() {
    // DALL-E images in ChatGPT appear as img elements within assistant messages
    const imgs = document.querySelectorAll(
      '[data-message-author-role="assistant"] img[src*="oaidalleapi"], ' +
      '[data-message-author-role="assistant"] img[src*="dalle"], ' +
      '[data-message-author-role="assistant"] img[alt*="DALL"], ' +
      '[data-message-author-role="assistant"] img[src*="openai"]'
    );

    let newImages = 0;
    imgs.forEach((img) => {
      const src = img.src || img.getAttribute("data-src") || "";
      const key = src.slice(0, 200);
      if (key && !seenImages.has(key)) {
        seenImages.add(key);
        newImages++;
      }
    });

    if (newImages > 0) {
      chrome.runtime.sendMessage({
        type: "USAGE_DETECTED",
        platform: "DALL-E",
        units: newImages,
        model: "DALL-E 3",
        description: `${newImages} image(s) generated`,
      });
    }
  }

  // --- Chat message tracking (fallback) ---
  const chatObserver = new MutationObserver(() => {
    // Track DALL-E images
    detectDallEImages();

    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length > lastMessageCount) {
      let newCount = 0;
      for (let i = lastMessageCount; i < messages.length; i++) {
        const hash = hashMessage(messages[i]);
        if (hash && !seenHashes.has(hash)) {
          seenHashes.add(hash);
          newCount++;
        } else if (!hash) {
          newCount++;
        }
      }
      lastMessageCount = messages.length;
      if (newCount > 0) {
        chrome.runtime.sendMessage({
          type: "USAGE_DETECTED",
          platform: "ChatGPT",
          units: newCount,
          model: detectModel(),
        });
      }
    }
  });

  // --- Settings/Usage page scraping ---
  function scrapeUsagePage() {
    // Look for usage indicators on settings pages
    // ChatGPT Plus shows remaining messages in various UI elements
    const results = [];

    // Try to find "X messages remaining" or "limit reached" patterns
    const allText = document.body.innerText || "";

    // Pattern: "X/Y messages" or "X messages remaining"
    const remaining = allText.match(/(\d+)\s*(?:\/\s*(\d+))?\s*messages?\s*remaining/i);
    if (remaining) {
      results.push({
        model: detectModel(),
        actual_remaining: parseInt(remaining[1]),
        actual_limit: remaining[2] ? parseInt(remaining[2]) : null,
      });
    }

    // Pattern: "Usage limit reached" or "You've reached your limit"
    if (/limit\s*reached|you.ve\s*reached/i.test(allText)) {
      results.push({
        model: detectModel(),
        actual_remaining: 0,
        actual_limit: null,
      });
    }

    // Try to find usage bars/progress elements
    const progressBars = document.querySelectorAll('[role="progressbar"], progress');
    progressBars.forEach((bar) => {
      const value = bar.getAttribute("aria-valuenow") || bar.getAttribute("value");
      const max = bar.getAttribute("aria-valuemax") || bar.getAttribute("max");
      if (value && max) {
        results.push({
          model: detectModel(),
          actual_remaining: parseInt(max) - parseInt(value),
          actual_limit: parseInt(max),
        });
      }
    });

    if (results.length > 0) {
      chrome.runtime.sendMessage({
        type: "QUOTA_SCRAPED",
        platform: "ChatGPT",
        snapshots: results,
      });
    }
  }

  // --- Periodic scraping ---
  function startScraping() {
    // Scrape immediately on page load
    setTimeout(scrapeUsagePage, 3000);
    // Re-scrape every 15 minutes
    setInterval(scrapeUsagePage, 15 * 60 * 1000);
  }

  // Start appropriate mode based on URL
  if (location.pathname.includes("/settings") || location.hostname === "platform.openai.com") {
    startScraping();
    console.log("[AI-Flow Monitor] ChatGPT settings scraper active");
  }

  // Always run chat observer on chat pages
  if (document.body) {
    chatObserver.observe(document.body, { childList: true, subtree: true });
  }
  console.log("[AI-Flow Monitor] ChatGPT tracker active");

  // Persist seen hashes to storage for cross-reload dedup
  chrome.storage.local.get(["chatgpt_hashes"], (result) => {
    const stored = result.chatgpt_hashes || [];
    stored.forEach((h) => seenHashes.add(h));
  });

  // Save hashes periodically
  setInterval(() => {
    const arr = Array.from(seenHashes).slice(-500); // Keep last 500
    chrome.storage.local.set({ chatgpt_hashes: arr });
  }, 30000);
})();
