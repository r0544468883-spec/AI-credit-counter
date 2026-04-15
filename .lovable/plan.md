

# AI-Flow Monitor — Full Build Plan

## Phase 1: Theme & Layout Foundation

**Update design system** — Dark Slate (#0F172A) bg, Deep Purple (#581C87) secondary, Gold (#FACC15) accent. Custom CSS variables, Tailwind config, Inter font, golden sparkle keyframes, progress bar animations (green→yellow→red).

**Create core layout** — Sidebar navigation, dark header with TOSAF logo, main content area. Pages: Dashboard, Platforms, Tips, Settings, Login/Signup.

**Reusable components:**
- `GoldenProgressBar` — animated bar with color transitions
- `PlatformCard` — platform icon + name + usage bar + remaining credits
- `GoldenToast` — gold notification for 80% quota alerts
- `ShimmerSkeleton` — dark-mode loading skeletons

## Phase 2: Supabase Backend (Lovable Cloud)

**Enable Lovable Cloud** and create tables:

- `profiles` (id, email, display_name, subscription_type, settings jsonb)
- `ai_platforms` (id, name, icon_url, quota_limit, reset_cycle, category) — seeded with ChatGPT, Claude, Gemini, Midjourney, Perplexity, Runway, Kling
- `usage_logs` (id, user_id, platform_id, units_used, timestamp, action_description)
- `daily_tips` (id, content, category, date)
- `user_roles` (id, user_id, role enum)
- `webhook_configs` (id, user_id, url, trigger_threshold)

**RLS policies** on all tables with `auth.uid() = user_id`. `has_role()` security definer function.

**Auth** — email/password signup & login with profile auto-creation trigger.

## Phase 3: Dashboard Pages

- **Login/Signup** — dark auth pages with gold accents
- **Dashboard Home** — overview grid of all platforms with golden progress bars, total efficiency score gauge, "Tip of the Day" card
- **Platform Detail** — drill-down with recent activity list, usage chart
- **Settings** — webhook URL config, notification preferences
- **Recent Activity** — scrollable feed across all platforms

Data fetched via TanStack Query with Supabase client.

## Phase 4: Chrome Extension

Build in `extension/` directory:
- `manifest.json` (Manifest V3)
- React popup UI — compact platform list with progress bars, daily tip, link to dashboard
- `background.js` service worker
- Content script template with DOM selectors for ChatGPT, Claude, Gemini
- Package as ZIP in `public/` with fetch+blob download from dashboard

## Phase 5: Integrations

- Webhook edge function — fires on quota thresholds (80%, 100%)
- Seed `daily_tips` with AI productivity tips
- Platform icons and branding

---

## Technical Notes
- Lovable Cloud handles Supabase infra (can migrate to external Supabase later)
- Chrome extension content scripts need manual testing in a real browser
- User email for Supabase auth: canatech10@gmail.com
- TOSAF logo from uploaded file will be embedded in header

