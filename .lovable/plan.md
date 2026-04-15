

# תוכנית: ספירה אוטומטית מדפי ההגדרות של הפלטפורמות

## הרעיון
במקום לספור הודעות בעצמנו (וליפול על כפילויות, סגירת טאב וכו'), **נגרד את נתוני השימוש האמיתיים ישירות מדפי ההגדרות** של כל פלטפורמה. הנתונים כבר שם — רק צריך לקרוא אותם.

## מאיפה הנתונים באים

| פלטפורמה | דף | מה ניתן לחלץ |
|-----------|-----|---------------|
| ChatGPT | Settings → Usage / הכפתור בממשק שמציג כמה הודעות נשארו | כמות הודעות שנותרו, מודל, reset time |
| Claude | Settings → Usage | כמות הודעות שנוצלו, מגבלת זמן |
| Gemini | Settings / ממשק ראשי | מודל נוכחי, סטטוס מנוי |
| OpenAI API | platform.openai.com/usage | קרדיטים שנותרו, שימוש בדולרים |

## איך זה עובד

### 1. Content Scripts חדשים לדפי Settings
כל content script יקבל **שני תפקידים**:
- **מעקב צ'אט** (כמו היום) — ספירת הודעות כ-fallback
- **גריפת מכסה** — כשהמשתמש נכנס לדף ההגדרות, או בבדיקה תקופתית, חילוץ הנתונים האמיתיים

### 2. שינויים בקבצים

| קובץ | שינוי |
|-------|-------|
| `extension/content-chatgpt.js` | הוספת גריפת usage מדף Settings + זיהוי הודעת "limit reached" |
| `extension/content-claude.js` | גריפת usage bar מהממשק |
| `extension/content-gemini.js` | גריפת סטטוס מנוי ומודל |
| `extension/manifest.json` | הוספת `matches` לדפי settings (למשל `https://chatgpt.com/settings/*`, `https://platform.openai.com/*`) |
| `extension/background.js` | הוספת `QUOTA_SCRAPED` message type — שמירת נתוני מכסה אמיתיים |
| `extension/popup.html` / `popup.js` | הצגת "נתון אמיתי" vs "הערכה" עם אינדיקטור |
| `supabase/functions/extension-sync/index.ts` | endpoint חדש `action=update-quota` לעדכון מכסה אמיתית |
| DB migration | הוספת עמודות `actual_remaining`, `last_scraped_at`, `model_name` ל-`usage_logs` או טבלה חדשה `platform_usage_snapshots` |
| `src/pages/PlatformDetail.tsx` | הצגת נתון אמיתי כשזמין, הערכה כש-fallback |

### 3. טבלת DB חדשה: `platform_usage_snapshots`
```
id, user_id, platform_id, model_name, 
actual_remaining, actual_limit, reset_at,
source ('scraped' | 'manual' | 'estimated'),
scraped_at
```
זה מאפשר לשמור היסטוריה של נתונים אמיתיים לאורך זמן.

### 4. לוגיקה בתוסף
```
כל 15 דקות (או כשנכנסים לדף settings):
  → גרד נתוני שימוש מה-DOM
  → שלח QUOTA_SCRAPED ל-background
  → background שומר ב-storage + שולח ל-Cloud

בתוסף popup:
  אם יש נתון scraped טרי (< 30 דק) → הצג אותו עם ✓
  אחרת → הצג הערכה מספירת הודעות עם ~
```

### 5. רישום ידני כ-fallback
כפתור "עדכן ידנית" בתוסף ובדשבורד — למקרים שבהם הגריפה לא עובדת או לפלטפורמות לא נתמכות (Cursor, מובייל).

## סדר יישום
1. **טבלת `platform_usage_snapshots`** + migration + RLS
2. **Content scripts** — גריפת נתונים מדפי settings
3. **Background + Edge Function** — שמירת snapshots
4. **Popup + Dashboard** — הצגת נתון אמיתי vs הערכה
5. **רישום ידני** — fallback UI

## מגבלות
- הסלקטורים יכולים להישבר כשפלטפורמות משנות UI — צריך תחזוקה
- חלק מהנתונים לא חשופים בממשק (למשל ChatGPT לא תמיד מציג מספר מדויק)
- עובד רק כשהדפדפן פתוח עם התוסף מותקן

