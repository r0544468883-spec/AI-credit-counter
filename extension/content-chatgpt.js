// AI-Flow Monitor - Content Script for ChatGPT
// Detects when user sends a message on ChatGPT
(function () {
  let lastMessageCount = 0;

  const observer = new MutationObserver(() => {
    // Count message containers - ChatGPT uses data-message-author-role
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length > lastMessageCount) {
      const newMessages = messages.length - lastMessageCount;
      lastMessageCount = messages.length;
      chrome.runtime.sendMessage({
        type: "USAGE_DETECTED",
        platform: "ChatGPT",
        units: newMessages,
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[AI-Flow Monitor] ChatGPT tracker active");
})();
