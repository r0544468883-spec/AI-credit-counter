// AI-Flow Monitor - Popup Script
const DASHBOARD_URL = "https://id-preview--dec68301-0d60-4553-a63d-ef30714dcfd3.lovable.app";

document.getElementById("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: DASHBOARD_URL + "/dashboard" });
});

// Load saved platform data from storage
chrome.storage.local.get(["platforms", "tip"], (result) => {
  const app = document.getElementById("app");
  const platforms = result.platforms || getDefaultPlatforms();
  const tip = result.tip || "Use Claude for long-form analysis and GPT for quick creative tasks.";

  let html = "";

  platforms.forEach((p) => {
    const pct = p.quota > 0 ? Math.min((p.used / p.quota) * 100, 100) : 0;
    const colorClass = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
    const remaining = Math.max(p.quota - p.used, 0);

    html += `
      <div class="platform">
        <div class="platform-icon" style="background:${p.color}20;color:${p.color}">${p.name[0]}</div>
        <div class="platform-info">
          <div class="platform-name">${p.name}</div>
          <div class="progress-bar"><div class="progress-fill ${colorClass}" style="width:${pct}%"></div></div>
          <div class="platform-meta">${p.used}/${p.quota} credits used</div>
        </div>
        <div class="platform-remaining">${remaining}<small>left</small></div>
      </div>
    `;
  });

  html += `
    <div class="tip">
      <div class="tip-label">💡 Tip of the Day</div>
      <div class="tip-text">${tip}</div>
    </div>
  `;

  app.innerHTML = html;
});

function getDefaultPlatforms() {
  return [
    { name: "ChatGPT", used: 0, quota: 100, color: "#10a37f" },
    { name: "Claude", used: 0, quota: 100, color: "#d4a27f" },
    { name: "Gemini", used: 0, quota: 100, color: "#4285f4" },
    { name: "Midjourney", used: 0, quota: 200, color: "#7c3aed" },
    { name: "Perplexity", used: 0, quota: 300, color: "#22d3ee" },
  ];
}
