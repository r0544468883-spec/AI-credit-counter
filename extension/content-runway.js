// AI-Flow Monitor - Content Script for Runway
// Detects video generation actions and tracks credit usage
(function () {
  const seenGenerations = new Set();

  function detectGeneration() {
    // Look for generation status elements
    const generatingEls = document.querySelectorAll(
      '[class*="generation"], [class*="render"], [data-testid*="generation"], [class*="project-card"]'
    );

    generatingEls.forEach((el) => {
      const id = el.id || el.getAttribute("data-id") || el.getAttribute("data-generation-id");
      if (!id || seenGenerations.has(id)) return;

      // Check if generation is completed
      const statusText = el.textContent || "";
      if (/completed|done|ready|finished/i.test(statusText)) {
        seenGenerations.add(id);

        // Try to detect duration/resolution for credit calculation
        let units = 10; // Default: ~10 credits per generation
        const durationMatch = statusText.match(/(\d+)\s*s(?:ec)?/i);
        if (durationMatch) {
          const seconds = parseInt(durationMatch[1]);
          // Runway charges roughly per 5-second increment
          units = Math.ceil(seconds / 5) * 5;
        }

        chrome.runtime.sendMessage({
          type: "USAGE_DETECTED",
          platform: "Runway",
          units: units,
          model: detectModel(),
          description: `Video generation (${durationMatch ? durationMatch[1] + "s" : "standard"})`,
        });
      }
    });
  }

  function detectModel() {
    const selectors = [
      '[class*="model-select"] span',
      '[data-testid*="model"] span',
      'button[aria-label*="model"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const text = el.textContent.trim();
        if (/gen-?[234]|runway/i.test(text)) return text;
      }
    }
    return "Runway";
  }

  // --- Usage page scraping ---
  function scrapeUsage() {
    const results = [];
    const allText = document.body.innerText || "";

    // Look for credit balance
    const credits = allText.match(/(\d+)\s*credits?\s*remaining/i);
    if (credits) {
      results.push({
        model: "Runway",
        actual_remaining: parseInt(credits[1]),
        actual_limit: null,
      });
    }

    // Look for usage stats
    const used = allText.match(/(\d+)\s*(?:\/\s*(\d+))?\s*credits?\s*used/i);
    if (used) {
      results.push({
        model: "Runway",
        actual_remaining: used[2] ? parseInt(used[2]) - parseInt(used[1]) : null,
        actual_limit: used[2] ? parseInt(used[2]) : null,
      });
    }

    if (results.length > 0) {
      chrome.runtime.sendMessage({
        type: "QUOTA_SCRAPED",
        platform: "Runway",
        snapshots: results,
      });
    }
  }

  // Observe for new generations
  const observer = new MutationObserver(() => {
    detectGeneration();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Scrape usage on settings/billing pages
  if (/settings|billing|usage|account/i.test(location.pathname)) {
    setTimeout(scrapeUsage, 3000);
    setInterval(scrapeUsage, 15 * 60 * 1000);
    console.log("[AI-Flow Monitor] Runway usage scraper active");
  }

  // Persist seen generations
  chrome.storage.local.get(["runway_seen"], (result) => {
    const stored = result.runway_seen || [];
    stored.forEach((id) => seenGenerations.add(id));
  });

  setInterval(() => {
    const arr = Array.from(seenGenerations).slice(-200);
    chrome.storage.local.set({ runway_seen: arr });
  }, 30000);

  console.log("[AI-Flow Monitor] Runway tracker active");
})();
