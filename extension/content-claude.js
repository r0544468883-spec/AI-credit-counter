// AI-Flow Monitor - Content Script for Claude
// Dual mode: chat counting (fallback) + usage scraping (primary)
(function () {
  let lastMessageCount = 0;
  const seenHashes = new Set();

  function hashMessage(el) {
    const text = (el.textContent || "").slice(0, 120).trim();
    return text.length > 10 ? text : null;
  }

  function detectModel() {
    const selectors = [
      '[data-testid="model-selector"] span',
      'button[aria-haspopup] span',
      '[class*="model"] span',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (/sonnet|opus|haiku|claude/i.test(text)) return text;
      }
    }
    return null;
  }

  // --- Chat message tracking (fallback) ---
  const chatObserver = new MutationObserver(() => {
    const messages = document.querySelectorAll('[data-testid="assistant-message"], .font-claude-message');
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
          platform: "Claude",
          units: newCount,
          model: detectModel(),
        });
      }
    }
  });

  // --- Usage scraping ---
  function scrapeUsage() {
    const results = [];
    const allText = document.body.innerText || "";

    // Claude shows "X messages remaining" or usage bars
    const remaining = allText.match(/(\d+)\s*(?:\/\s*(\d+))?\s*messages?\s*remaining/i);
    if (remaining) {
      results.push({
        model: detectModel(),
        actual_remaining: parseInt(remaining[1]),
        actual_limit: remaining[2] ? parseInt(remaining[2]) : null,
      });
    }

    // "Usage limit" or cooldown patterns
    const cooldown = allText.match(/(\d+)\s*(?:hours?|minutes?|hrs?|mins?)\s*(?:until|before|remaining)/i);
    if (cooldown || /usage\s*limit|rate\s*limit/i.test(allText)) {
      results.push({
        model: detectModel(),
        actual_remaining: 0,
        actual_limit: null,
        reset_info: cooldown ? cooldown[0] : null,
      });
    }

    // Progress bars
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
        platform: "Claude",
        snapshots: results,
      });
    }
  }

  function startScraping() {
    setTimeout(scrapeUsage, 3000);
    setInterval(scrapeUsage, 15 * 60 * 1000);
  }

  if (location.pathname.includes("/settings")) {
    startScraping();
    console.log("[AI-Flow Monitor] Claude settings scraper active");
  }

  if (document.body) {
    chatObserver.observe(document.body, { childList: true, subtree: true });
  }
  console.log("[AI-Flow Monitor] Claude tracker active");

  chrome.storage.local.get(["claude_hashes"], (result) => {
    const stored = result.claude_hashes || [];
    stored.forEach((h) => seenHashes.add(h));
  });

  setInterval(() => {
    const arr = Array.from(seenHashes).slice(-500);
    chrome.storage.local.set({ claude_hashes: arr });
  }, 30000);
})();
