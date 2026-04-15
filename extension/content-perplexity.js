// AI-Flow Monitor - Content Script for Perplexity
// Tracks search queries and follow-up questions
(function () {
  let lastAnswerCount = 0;
  const seenHashes = new Set();

  function hashMessage(el) {
    const text = (el.textContent || "").slice(0, 120).trim();
    return text.length > 10 ? text : null;
  }

  function detectModel() {
    // Perplexity shows model in the UI
    const selectors = [
      '[class*="model"] span',
      'button[aria-label*="model"]',
      '[data-testid*="model"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const text = el.textContent.trim();
        if (/sonar|pro|reasoning|default/i.test(text)) return text;
      }
    }
    return null;
  }

  // --- Answer tracking ---
  const observer = new MutationObserver(() => {
    // Perplexity answers appear in specific containers
    const answers = document.querySelectorAll(
      '[class*="prose"], [class*="answer"], [data-testid*="answer"], .markdown'
    );

    if (answers.length > lastAnswerCount) {
      let newCount = 0;
      for (let i = lastAnswerCount; i < answers.length; i++) {
        const hash = hashMessage(answers[i]);
        if (hash && !seenHashes.has(hash)) {
          seenHashes.add(hash);
          newCount++;
        } else if (!hash) {
          newCount++;
        }
      }
      lastAnswerCount = answers.length;
      if (newCount > 0) {
        chrome.runtime.sendMessage({
          type: "USAGE_DETECTED",
          platform: "Perplexity",
          units: newCount,
          model: detectModel(),
        });
      }
    }
  });

  // --- Usage scraping from settings ---
  function scrapeUsage() {
    const results = [];
    const allText = document.body.innerText || "";

    // Look for query counts
    const queries = allText.match(/(\d+)\s*(?:\/\s*(\d+))?\s*(?:queries|searches|questions)\s*(?:remaining|left|used)/i);
    if (queries) {
      const isUsed = /used/i.test(queries[0]);
      results.push({
        model: detectModel(),
        actual_remaining: isUsed && queries[2]
          ? parseInt(queries[2]) - parseInt(queries[1])
          : parseInt(queries[1]),
        actual_limit: queries[2] ? parseInt(queries[2]) : null,
      });
    }

    // Pro search count
    const pro = allText.match(/(\d+)\s*(?:\/\s*(\d+))?\s*pro\s*search/i);
    if (pro) {
      results.push({
        model: "Pro",
        actual_remaining: parseInt(pro[1]),
        actual_limit: pro[2] ? parseInt(pro[2]) : null,
      });
    }

    if (results.length > 0) {
      chrome.runtime.sendMessage({
        type: "QUOTA_SCRAPED",
        platform: "Perplexity",
        snapshots: results,
      });
    }
  }

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (/settings|account|billing/i.test(location.pathname)) {
    setTimeout(scrapeUsage, 3000);
    setInterval(scrapeUsage, 15 * 60 * 1000);
    console.log("[AI-Flow Monitor] Perplexity usage scraper active");
  }

  chrome.storage.local.get(["perplexity_hashes"], (result) => {
    const stored = result.perplexity_hashes || [];
    stored.forEach((h) => seenHashes.add(h));
  });

  setInterval(() => {
    const arr = Array.from(seenHashes).slice(-500);
    chrome.storage.local.set({ perplexity_hashes: arr });
  }, 30000);

  console.log("[AI-Flow Monitor] Perplexity tracker active");
})();
