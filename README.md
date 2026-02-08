# 🦎 QA Iguana Agent

**The Empire Guardian - Automated QA Testing for No Art Gallery**

> "שומר על האימפריה 24/7"

[![Version](https://img.shields.io/badge/version-1.2.1-green.svg)](https://github.com/nirram77-lang/qa-iguana-agent)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 מה זה עושה?

סוכן QA אוטומטי שרץ 3 פעמים ביום ובודק את כל האתרים והאפליקציות של No Art Gallery:

- 🔐 **SSL Certificates** — בדיקת תוקף תעודות SSL והתראה 30 יום לפני תפוגה
- ⬆️ **Uptime & Performance** — בדיקת זמינות וזמני תגובה
- 🔗 **Broken Links** — סריקת כל הלינקים באתר וזיהוי לינקים שבורים
- 📧 **Email Alerts** — דוח מפורט למייל עם לינק ישיר ללוגים

---

## 🌐 אתרים מנוטרים

| אתר | סוג | עמודים | שפות | Priority |
|-----|-----|--------|------|----------|
| **I4IGUANA Website** | Website | 5 עמודים | HE, EN, PT | 🔴 Critical |
| **I4IGUANA App** | App | 2 עמודים | HE, EN | 🔴 Critical |
| **SOS Click App** | App | 1 עמוד | HE, EN | 🔴 Critical |
| **SOS Click Website** | Website | 3 עמודים | HE, EN | 🔴 Critical |
| **No Art Gallery** | Website | 4 עמודים | EN | 🔴 Critical |
| **FunnyDates Hebrew** | Website | 1 עמוד | HE | 🔴 Critical |
| **FunnyDates English** | Website | 1 עמוד | EN | 🟡 High |
| **GO CIO** | Website | 1 עמוד | HE | 🟢 Medium |

### פירוט עמודים לכל אתר:

**I4IGUANA Website** (`i4iguana.com`)
- `/` — Landing Page (EN)
- `/he` — Hebrew Landing
- `/br` — Portuguese Landing
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service

**I4IGUANA App** (`i4iguana.com/app`)
- `/app` — Main App
- `/admin/super` — Super Admin Panel

**SOS Click** (`sosclick.app` + `app.sosclick.app`)
- `/` — Landing / Main App
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service

**No Art Gallery** (`noartgallery.com`)
- `/` — Home
- `/accessibility.html` — Accessibility
- `/privacy.html` — Privacy
- `/terms.html` — Terms

---

## ⏰ לוח זמנים

הסוכן רץ אוטומטית 3 פעמים ביום:

| שעה | תיאור |
|-----|-------|
| 06:00 | 🌅 בדיקת בוקר |
| 12:00 | 🌞 בדיקת צהריים |
| 18:00 | 🌆 בדיקת ערב |

*כל השעות בזמן ישראל (Asia/Jerusalem)*

---

## 📊 דוגמת דוח

### כשהכל תקין:
```
═══════════════════════════════════════════════════════════════
🦎 QA IGUANA AGENT - DAILY REPORT
═══════════════════════════════════════════════════════════════
📅 יום ראשון, 8 בפברואר 2026 בשעה 07:00:00

✅ STATUS: הכל תקין

🔐 תעודות SSL
────────────────────────────────────────────────────────────────
✅ I4IGUANA App
   כתובת: https://i4iguana.com
   תפוגה בעוד: 89 ימים

✅ SOS Click App
   כתובת: https://app.sosclick.app
   תפוגה בעוד: 120 ימים
```

### כשיש בעיות:
```
⚠️ STATUS: נמצאו בעיות
📋 לוגים מלאים: https://github.com/nirram77-lang/qa-iguana-agent/actions/runs/12345

🔗 לינקים שבורים
────────────────────────────────────────────────────────────────
❌ I4IGUANA App
   כתובת: https://i4iguana.com
   ⚠️ נמצאו 1 לינקים שבורים:

   [1] לינק שבור:
       URL: https://i4iguana.com/old-page
       נמצא בעמוד: https://i4iguana.com/
       טקסט: "לחץ כאן"
       סטטוס HTTP: 404
       שגיאה: Not Found
   
   📋 לוגים: https://github.com/.../actions/runs/12345
```

---

## 🚀 התקנה

```bash
# Clone the repository
git clone https://github.com/nirram77-lang/qa-iguana-agent.git
cd qa-iguana-agent

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your SMTP credentials
```

---

## 🔧 שימוש

### הרצה מקומית:

```bash
# Full report (all checks)
npm test

# SSL only
npm run test:ssl

# Uptime only
npm run test:uptime

# Links only
npm run test:links

# Full report + send email
npm run morning-check
```

### GitHub Actions:

הסוכן רץ אוטומטית דרך GitHub Actions. אפשר גם להפעיל ידנית:
1. לך ל-Actions tab
2. בחר "QA Morning Check"
3. לחץ "Run workflow"

---

## ⚙️ קונפיגורציה

### config/sites.json

```json
{
  "settings": {
    "thresholds": {
      "responseTimeWarning": 3000,    // ms
      "responseTimeCritical": 8000,   // ms
      "sslExpiryWarning": 30,         // days
      "sslExpiryCritical": 7          // days
    }
  }
}
```

### Environment Variables (.env)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
ALERT_EMAIL=alerts@example.com
BACKUP_EMAIL=backup@example.com
```

---

## 📁 מבנה הפרויקט

```
qa-iguana-agent/
├── .github/
│   └── workflows/
│       └── qa-morning.yml      # GitHub Actions workflow
├── config/
│   └── sites.json              # Site configuration
├── reports/
│   ├── output/                 # Generated reports
│   ├── report-generator.js     # Report generation
│   └── email-sender.js         # Email functionality
├── tests/
│   ├── ssl-checker.js          # SSL certificate checks
│   ├── uptime-monitor.js       # Uptime monitoring
│   └── link-validator.js       # Broken link detection
├── index.js                    # Main entry point
├── package.json
├── .env.example
└── README.md
```

---

## 📝 Changelog

### v1.2.1 (2026-02-08)
- ✨ **Split:** I4IGUANA separated into Website + App monitoring
- 📊 **Total:** Now monitoring 8 sites

### v1.2.0 (2026-02-08)
- ✨ **Added:** SOS Click monitoring (App + Website)
- ✨ **Added:** GitHub Actions link in error reports
- ✨ **Improved:** Detailed broken link reporting (URL, page, text, status)
- ✨ **Improved:** Hebrew RTL support in HTML reports

### v1.1.0 (2026-01-12)
- 🐛 Fixed false positives for admin panel SSL checks
- ✨ Added multi-language support for I4IGUANA

### v1.0.0 (2026-01-01)
- 🎉 Initial release
- SSL certificate monitoring
- Uptime monitoring
- Link validation
- Email reports

---

## 🤝 Contributing

Created by **Nir Ram** for **No Art Gallery**

---

## 📜 License

MIT License - feel free to use and modify!

---

<div align="center">

🦎 **QA Iguana Agent** — *"שומר על האימפריה 24/7"*

**No Art Gallery © 2026**

</div>
