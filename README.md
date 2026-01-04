# 🦎 QA Iguana Agent

**The Empire Guardian - Automated QA Testing for No Art Gallery**

> "שומר על האימפריה 24/7"

---

## 🎯 Overview

QA Iguana Agent is an automated quality assurance system that monitors all websites and applications in the No Art Gallery ecosystem. It runs daily checks and alerts you to any issues before your users notice them.

### What It Monitors

| Site | Type | Checks |
|------|------|--------|
| 🦎 i4iguana.com | App | SSL, Uptime, Links, Forms, i18n |
| 🎨 noartgallery.com | Hub | SSL, Uptime, Links, Forms |
| 📚 funnydates101.co.il | Website | SSL, Uptime, Links, Forms |
| 📖 funnydates101.com | Website | SSL, Uptime, Links |
| ⚙️ gocio.org | Website | SSL, Uptime, Links, Forms |
| 🔧 i4iguana.com/admin | Admin | SSL, Uptime |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Gmail account (for email alerts) or other SMTP provider

### Installation

```bash
# Clone the repository
git clone https://github.com/nirram77-lang/qa-iguana-agent.git
cd qa-iguana-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env

# Run your first check
npm test
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific tests
npm run test:ssl      # SSL certificates only
npm run test:uptime   # Uptime & performance only
npm run test:links    # Broken links only

# Generate full report
npm run morning-check
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Email Configuration (required for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Alert Recipients
ALERT_EMAIL=nir@noartgallery.com
BACKUP_EMAIL=nir.ram77@gmail.com
```

### Sites Configuration (config/sites.json)

Add or modify sites in the `sites` array:

```json
{
  "id": "my-site",
  "name": "My Site",
  "url": "https://mysite.com",
  "type": "website",
  "priority": "critical",
  "languages": ["en"],
  "checks": {
    "ssl": true,
    "uptime": true,
    "links": true,
    "forms": false,
    "i18n": false,
    "screenshots": false
  }
}
```

---

## 📅 Automated Scheduling (GitHub Actions)

The agent runs automatically via GitHub Actions:

| Time (Israel) | Check Type | Description |
|---------------|------------|-------------|
| 07:00 | Full | Morning report + email |
| 13:00 | Quick | SSL + Uptime only |
| 19:00 | Quick | SSL + Uptime only |

### Setting Up GitHub Actions

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add these secrets:

| Secret | Description |
|--------|-------------|
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | Your email |
| `SMTP_PASS` | App password (not regular password!) |
| `ALERT_EMAIL` | nir@noartgallery.com |
| `BACKUP_EMAIL` | nir.ram77@gmail.com |

3. Enable Actions in your repository

---

## 📊 Report Types

### Text Report

Plain text format, sent via email and saved to file:

```
═══════════════════════════════════════════════════
🦎 QA IGUANA - דו"ח בוקר יומי
📅 05/01/2026 08:00
═══════════════════════════════════════════════════

📊 סיכום מהיר:
✅ כל המערכות תקינות!
```

### HTML Report

Beautiful HTML email with:
- Color-coded status indicators
- Site-by-site breakdown
- Action items list
- Professional design matching No Art Gallery branding

### JSON Report

Machine-readable format for integrations and dashboards.

---

## 🔧 Extending the Agent

### Adding New Checks

Create a new file in `tests/`:

```javascript
// tests/my-check.js
class MyCheck {
  async run(site) {
    // Your check logic
    return { status: 'ok', message: 'All good!' };
  }
}
module.exports = MyCheck;
```

### Adding New Alert Channels

Create a new file in `reports/`:

```javascript
// reports/slack-sender.js
class SlackSender {
  async send(report) {
    // Send to Slack webhook
  }
}
module.exports = SlackSender;
```

---

## 📁 Project Structure

```
qa-iguana-agent/
├── index.js              # Main entry point
├── package.json          # Dependencies
├── .env.example          # Environment template
│
├── config/
│   └── sites.json        # Site configurations
│
├── tests/
│   ├── ssl-checker.js    # SSL certificate checks
│   ├── uptime-monitor.js # Uptime & response time
│   └── link-validator.js # Broken link detection
│
├── reports/
│   ├── report-generator.js # Report formatting
│   ├── email-sender.js     # Email delivery
│   └── output/             # Generated reports
│
├── screenshots/
│   ├── baseline/         # Reference screenshots
│   └── current/          # Current screenshots
│
└── .github/
    └── workflows/
        └── qa-morning.yml # GitHub Actions
```

---

## 🛠️ Roadmap

### v1.0 (Current)
- [x] SSL certificate monitoring
- [x] Uptime & response time checks
- [x] Broken link detection
- [x] Email reports
- [x] GitHub Actions automation

### v1.1 (Planned)
- [ ] WhatsApp alerts (Twilio)
- [ ] Screenshot comparisons
- [ ] Form submission testing
- [ ] Multi-language validation

### v1.2 (Future)
- [ ] Web dashboard
- [ ] Historical trends
- [ ] Performance graphs
- [ ] Mobile app notifications

---

## 🤝 Contributing

This is a private project for No Art Gallery. For questions or suggestions, contact Nir Ram.

---

## 📜 License

MIT © 2026 No Art Gallery

---

## 🦎 Made with 💚 by No Art Gallery

*"Stories Create Worlds"*
