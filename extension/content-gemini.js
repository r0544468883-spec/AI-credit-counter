// AI-Flow Monitor - Content Script for Gemini
(function () {
  let lastMessageCount = 0;

  const observer = new MutationObserver(() => {
    // Gemini uses model-response or similar
    const messages = document.querySelectorAll("model-response, .model-response-text");
    if (messages.length > lastMessageCount) {
      const newMessages = messages.length - lastMessageCount;
      lastMessageCount = messages.length;
      chrome.runtime.sendMessage({
        type: "USAGE_DETECTED",
        platform: "Gemini",
        units: newMessages,
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[AI-Flow Monitor] Gemini tracker active");
})();
