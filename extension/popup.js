// AI-Flow Monitor - Popup Script with Auth & Sync
const SUPABASE_URL = "https://sjollshuztvkkfvgiaus.supabase.co";
const SUPABASE_ANON_KEY_URL = `${SUPABASE_URL}/functions/v1/extension-sync`;

document.getElementById("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://id-preview--dec68301-0d60-4553-a63d-ef30714dcfd3.lovable.app/dashboard" });
});

// Check if logged in
chrome.storage.local.get(["auth_token", "anon_key", "user_email", "platforms", "tip"], (result) => {
  const app = document.getElementById("app");

  if (!result.auth_token) {
    showLogin(app);
  } else {
    showDashboard(app, result);
    // Trigger background sync
    chrome.runtime.sendMessage({ type: "SYNC" });
  }
});

function showLogin(container) {
  container.innerHTML = `
    <div class="login-section">
      <p style="font-size:13px; margin-bottom: 12px; color: #94a3b8;">Sign in to sync with your dashboard</p>
      <input type="email" id="email" placeholder="Email" />
      <input type="password" id="password" placeholder="Password" />
      <button id="login-btn">Sign In</button>
      <div id="login-status"></div>
    </div>
  `;

  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const status = document.getElementById("login-status");

    if (!email || !password) {
      status.className = "status error";
      status.textContent = "Please enter email and password";
      return;
    }

    status.className = "status";
    status.textContent = "Signing in...";

    try {
      // Get anon key from meta or use stored
      const anonKeyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": await getAnonKey(),
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await anonKeyRes.json();

      if (data.error) {
        status.className = "status error";
        status.textContent = data.error_description || data.error;
        return;
      }

      const token = data.access_token;
      const anonKey = await getAnonKey();

      chrome.storage.local.set({ auth_token: token, anon_key: anonKey, user_email: email });
      chrome.runtime.sendMessage({ type: "LOGIN", token, anonKey });

      status.className = "status";
      status.textContent = "Signed in! Loading...";

      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      status.className = "status error";
      status.textContent = "Connection failed";
    }
  });
}

async function getAnonKey() {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqb2xsc2h1enR2a2tmdmdpYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzUzOTYsImV4cCI6MjA5MTgxMTM5Nn0.iCudC6Lt55TZrDcgRW9PLjWsQdy-rUCJYuUCFfp4E6Y";
}

function showDashboard(container, data) {
  const platforms = data.platforms || getDefaultPlatforms();
  const tip = data.tip || "Use Claude for long-form analysis and GPT for quick creative tasks.";

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <span style="font-size:11px;color:#64748b;">👤 ${data.user_email || 'Connected'}</span>
    <button class="sync-btn" id="sync-btn">⟳ Sync</button>
  </div>`;

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
    <button class="sync-btn" id="logout-btn" style="width:100%;margin-top:4px;color:#ef4444;border-color:#ef444440;">Logout</button>
  `;

  container.innerHTML = html;

  document.getElementById("sync-btn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SYNC" });
    setTimeout(() => location.reload(), 1500);
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    chrome.storage.local.remove(["auth_token", "anon_key", "user_email", "platforms", "tip"]);
    location.reload();
  });
}

function getDefaultPlatforms() {
  return [
    { name: "ChatGPT", used: 0, quota: 100, color: "#10a37f" },
    { name: "Claude", used: 0, quota: 100, color: "#d4a27f" },
    { name: "Gemini", used: 0, quota: 100, color: "#4285f4" },
    { name: "Midjourney", used: 0, quota: 200, color: "#7c3aed" },
    { name: "Perplexity", used: 0, quota: 300, color: "#22d3ee" },
  ];
}
