// AI-Flow Monitor - Content Script for Claude
(function () {
  let lastMessageCount = 0;

  const observer = new MutationObserver(() => {
    // Claude uses div[data-is-streaming] or similar patterns
    const messages = document.querySelectorAll('[data-testid="assistant-message"], .font-claude-message');
    if (messages.length > lastMessageCount) {
      const newMessages = messages.length - lastMessageCount;
      lastMessageCount = messages.length;
      chrome.runtime.sendMessage({
        type: "USAGE_DETECTED",
        platform: "Claude",
        units: newMessages,
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[AI-Flow Monitor] Claude tracker active");
})();
