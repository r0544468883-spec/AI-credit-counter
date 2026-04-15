

# תוכנית: שדרוג מלא — RTL + עברית, רספונסיב, ייצוא CSV, מרכז התראות, מכסות מותאמות, webhooks פעילים

## סקירה
6 שדרוגים מרכזיים שהופכים את AI-Flow Monitor למערכת מלאה ובשלה.

---

## 1. תרגום מלא לעברית + RTL

**קבצים:** `index.html`, `src/index.css`, כל קובצי הדפים והקומפוננטות

- הוספת `dir="rtl"` ו-`lang="he"` ל-`<html>` ב-`index.html`
- עדכון CSS: `ml-64` → `ms-64` (margin-inline-start) ב-`DashboardLayout`
- Sidebar: `left-0` → `right-0` (או שימוש ב-`inset-inline-start`)
- תרגום כל הטקסטים הקבועים (sidebar labels, כותרות, כפתורים, הודעות toast, placeholders):
  - Dashboard → לוח בקרה
  - Platforms → פלטפורמות  
  - Settings → הגדרות
  - Activity → פעילות
  - Tips → טיפים
  - Logout → התנתקות
  - "remaining" → "נותרו"
  - "Active Platforms" → "פלטפורמות פעילות"
  - Auth page: "Welcome Back" → "ברוכים השבים", "Sign In" → "כניסה", "Sign Up" → "הרשמה"
  - וכו׳

## 2. רספונסיב + Hamburger Menu

**קבצים:** `AppSidebar.tsx`, `DashboardLayout.tsx`, דפים עם grid

- הוספת state `mobileOpen` ב-`DashboardLayout` + כפתור hamburger שנראה רק ב-`md:hidden`
- Sidebar: `hidden md:flex` כברירת מחדל, overlay מלא במובייל כשפתוח
- Grid של כרטיסים: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (כבר קיים ברוב המקומות)
- `max-w-*` הקיימים יהפכו ל-`w-full` במובייל

## 3. ייצוא CSV

**קבצים:** `PlatformsSummary.tsx`, `ActivityFeed.tsx` + utility חדש `src/lib/export-csv.ts`

- פונקציית עזר `downloadCSV(rows, filename)` שממירה מערך אובייקטים ל-CSV ומורידה
- כפתור "ייצוא CSV" בדף Summary — מייצא פלטפורמה, שימוש, מכסה, אחוז, מקור
- כפתור "ייצוא CSV" בדף Activity — מייצא תאריך, פלטפורמה, יחידות, תיאור, מודל

## 4. מרכז התראות (Bell Icon)

**DB:** טבלת `quota_alerts` חדשה (`id, user_id, platform_id, threshold_pct, message, read, created_at`) + RLS
**קבצים:** `src/components/NotificationCenter.tsx`, `DashboardLayout.tsx`, `extension-sync/index.ts`

- קומפוננטת Bell icon ב-header עם badge של מספר התראות שלא נקראו
- Popover/dropdown שמציג רשימת התראות עם timestamp
- Edge function: כשמגיע `action=log` או `action=update-quota`, בדיקה אם usage ≥ 80% → insert ל-`quota_alerts`
- כפתור "סמן הכל כנקרא"

## 5. מכסות מותאמות + איפוס אוטומטי

**קבצים:** `PlatformDetail.tsx` (UI לעריכת מכסה), `extension-sync/index.ts`

- כפתור "ערוך מכסה" בדף פלטפורמה → dialog עם input לערך חדש → upsert ל-`user_platform_quotas`
- לוגיקה באז׳ function: אם `reset_cycle = 'monthly'` ו-`scraped_at` של snapshot אחרון מחודש קודם → איפוס ספירה (הוספת usage_log עם units שלילי, או פשוט הצגה לפי תקופה נוכחית בלבד)
- **גישה פשוטה**: סינון `usage_logs` לפי תחילת תקופה נוכחית (1 לחודש / תחילת שבוע) במקום מחיקה

## 6. Webhooks פעילים

**קבצים:** `extension-sync/index.ts`

- בתוך ה-edge function, אחרי log usage — שליפת `webhook_configs` של המשתמש
- חישוב אחוז שימוש נוכחי
- אם עובר את `trigger_threshold` → `fetch(webhook.url, { method: 'POST', body: JSON.stringify({ platform, used, quota, pct }) })`
- שמירת timestamp של שליחה אחרונה כדי לא לשלוח שוב אותו threshold

---

## סדר יישום

1. Migration: טבלת `quota_alerts` + RLS
2. RTL + תרגום עברית (כל הקבצים)
3. רספונסיב + hamburger
4. ייצוא CSV
5. מרכז התראות (UI + edge function)
6. מכסות מותאמות + סינון לפי תקופה
7. Webhooks פעילים
8. Deploy edge function מעודכן + ZIP תוסף

---

## פירוט טכני

### טבלת quota_alerts
```sql
CREATE TABLE public.quota_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform_id uuid NOT NULL,
  threshold_pct integer NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quota_alerts ENABLE ROW LEVEL SECURITY;
-- SELECT/INSERT/UPDATE for own rows
```

### סינון לפי תקופה (במקום איפוס)
במקום למחוק usage_logs, פשוט מסננים לפי `created_at >= period_start`:
- monthly: `created_at >= date_trunc('month', now())`
- weekly: `created_at >= date_trunc('week', now())`

זה ישפיע על Dashboard, Platforms, Summary — בכל מקום שמחשבים `totalUsed`.

### Webhook fire logic (edge function)
```typescript
// After inserting usage log:
const { data: webhooks } = await supabase
  .from('webhook_configs')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true);

for (const wh of webhooks || []) {
  if (currentPct >= wh.trigger_threshold) {
    await fetch(wh.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_name, used, quota, percentage: currentPct })
    });
  }
}
```

