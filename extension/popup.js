// AI-Flow Monitor - Popup Script with Pie Chart, Auth & Sync
const SUPABASE_URL = "https://sjollshuztvkkfvgiaus.supabase.co";

document.getElementById("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://id-preview--dec68301-0d60-4553-a63d-ef30714dcfd3.lovable.app/dashboard" });
});

chrome.storage.local.get(
  ["auth_token", "anon_key", "user_email", "platforms", "tip", "scraped_snapshots", "offline_queue"],
  (result) => {
    const app = document.getElementById("app");
    if (!result.auth_token) {
      showLogin(app);
    } else {
      showDashboard(app, result);
      chrome.runtime.sendMessage({ type: "SYNC" });
    }
  }
);

function showLogin(container) {
  container.innerHTML = `
    <div class="login-section">
      <p style="font-size:13px; margin-bottom: 12px; color: #94a3b8;">התחבר כדי לסנכרן עם הדשבורד</p>
      <input type="email" id="email" placeholder="אימייל" />
      <input type="password" id="password" placeholder="סיסמה" />
      <button id="login-btn">כניסה</button>
      <div id="login-status"></div>
    </div>
  `;

  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const status = document.getElementById("login-status");

    if (!email || !password) {
      status.className = "status error";
      status.textContent = "הזן אימייל וסיסמה";
      return;
    }

    status.className = "status";
    status.textContent = "מתחבר...";

    try {
      const anonKey = getAnonKey();
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();
      if (data.error) {
        status.className = "status error";
        status.textContent = data.error_description || data.error;
        return;
      }

      const token = data.access_token;
      chrome.storage.local.set({ auth_token: token, anon_key: anonKey, user_email: email });
      chrome.runtime.sendMessage({ type: "LOGIN", token, anonKey });
      status.className = "status";
      status.textContent = "מחובר! טוען...";
      setTimeout(() => location.reload(), 1000);
    } catch {
      status.className = "status error";
      status.textContent = "שגיאת חיבור";
    }
  });
}

function getAnonKey() {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqb2xsc2h1enR2a2tmdmdpYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzUzOTYsImV4cCI6MjA5MTgxMTM5Nn0.iCudC6Lt55TZrDcgRW9PLjWsQdy-rUCJYuUCFfp4E6Y";
}

function showDashboard(container, data) {
  const platforms = data.platforms || getDefaultPlatforms();
  const snapshots = data.scraped_snapshots || {};
  const tip = data.tip || "השתמש ב-Claude לניתוחים ארוכים וב-GPT למשימות יצירתיות מהירות.";
  const offlineCount = (data.offline_queue || []).length;

  // Build platform data with resolved values
  const platformData = platforms.map((p) => {
    const snap = snapshots[p.name] || p.snapshot;
    const isFresh = snap?.scraped_at && (Date.now() - new Date(snap.scraped_at).getTime()) < 30 * 60 * 1000;

    let used, quota, sourceLabel;
    if (isFresh && snap.data?.[0]?.actual_remaining != null && snap.data?.[0]?.actual_limit) {
      used = snap.data[0].actual_limit - snap.data[0].actual_remaining;
      quota = snap.data[0].actual_limit;
      sourceLabel = "✓ מאומת";
    } else if (isFresh && snap.actual_remaining != null && snap.actual_limit) {
      used = snap.actual_limit - snap.actual_remaining;
      quota = snap.actual_limit;
      sourceLabel = "✓ מאומת";
    } else {
      used = p.used || 0;
      quota = p.quota || 100;
      sourceLabel = "~ הערכה";
    }

    return { ...p, used, quota, sourceLabel, isFresh };
  });

  const totalUsed = platformData.reduce((s, p) => s + p.used, 0);

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <span style="font-size:11px;color:#64748b;">👤 ${data.user_email || "מחובר"}</span>
    <div>
      ${offlineCount > 0 ? `<span class="offline-badge">${offlineCount} בהמתנה</span>` : ""}
      <button class="sync-btn" id="sync-btn">⟳ סנכרן</button>
    </div>
  </div>`;

  // Pie chart
  html += `<div class="pie-container">
    <canvas id="pie-chart" width="140" height="140"></canvas>
    <div class="pie-center">
      <div class="total">${totalUsed}</div>
      <div class="label">סה״כ שימוש</div>
    </div>
  </div>`;

  // Platform list
  platformData.forEach((p) => {
    const pct = p.quota > 0 ? Math.min((p.used / p.quota) * 100, 100) : 0;
    const colorClass = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
    const remaining = Math.max(p.quota - p.used, 0);

    html += `
      <div class="platform">
        <div class="platform-icon" style="background:${p.color}20;color:${p.color}">${p.name[0]}</div>
        <div class="platform-info">
          <div class="platform-name">${p.name} <span style="font-size:9px;color:${p.isFresh ? '#22c55e' : '#64748b'};margin-right:4px;">${p.sourceLabel}</span></div>
          <div class="progress-bar"><div class="progress-fill ${colorClass}" style="width:${pct}%"></div></div>
          <div class="platform-meta">${p.used}/${p.quota} קרדיטים</div>
        </div>
        <div class="platform-remaining">${remaining}<small>נותרו</small></div>
      </div>
    `;
  });

  html += `
    <div class="tip">
      <div class="tip-label">💡 הטיפ היומי</div>
      <div class="tip-text">${tip}</div>
    </div>
    <button class="sync-btn" id="logout-btn" style="width:100%;margin-top:4px;color:#ef4444;border-color:#ef444440;">התנתקות</button>
  `;

  container.innerHTML = html;

  // Draw pie chart
  drawPieChart(platformData);

  document.getElementById("sync-btn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SYNC" });
    setTimeout(() => location.reload(), 1500);
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    chrome.storage.local.remove(["auth_token", "anon_key", "user_email", "platforms", "tip", "scraped_snapshots"]);
    location.reload();
  });
}

function drawPieChart(platforms) {
  const canvas = document.getElementById("pie-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = 140;
  const center = size / 2;
  const radius = 56;
  const innerRadius = 38;

  // Filter platforms with usage
  const withUsage = platforms.filter((p) => p.used > 0);
  const total = withUsage.reduce((s, p) => s + p.used, 0);

  if (total === 0) {
    // Draw empty circle
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = radius - innerRadius;
    ctx.stroke();
    return;
  }

  let startAngle = -Math.PI / 2;
  withUsage.forEach((p) => {
    const sliceAngle = (p.used / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(center, center, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = p.color || "#facc15";
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Inner circle (background)
  ctx.beginPath();
  ctx.arc(center, center, innerRadius - 1, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1120";
  ctx.fill();
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
