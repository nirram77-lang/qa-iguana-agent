/**
 * 🦎 QA Iguana Agent - Report Generator
 * Enhanced v1.3.1 - Fixed field mapping to match test module output
 */

class ReportGenerator {
  constructor(options = {}) {
    this.timezone = options.timezone || 'Asia/Jerusalem';
    this.actionsUrl = options.actionsUrl || null;
    this.runId = options.runId || null;
    this.runNumber = options.runNumber || null;
    this.checkTime = options.checkTime || new Date();
  }

  formatDate(date = new Date()) {
    return date.toLocaleString('he-IL', { 
      timeZone: this.timezone,
      dateStyle: 'full',
      timeStyle: 'medium'
    });
  }

  formatTime(date = new Date()) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleString('he-IL', { 
      timeZone: this.timezone,
      timeStyle: 'medium'
    });
  }

  getActionsLink() {
    if (this.runId) {
      return `https://github.com/nirram77-lang/qa-iguana-agent/actions/runs/${this.runId}`;
    }
    return 'https://github.com/nirram77-lang/qa-iguana-agent/actions';
  }

  generateMorningReport(results) {
    const hasIssues = this.hasAnyIssues(results);
    
    return {
      text: this.generateTextReport(results, hasIssues),
      html: this.generateHtmlReport(results, hasIssues),
      json: this.generateJsonReport(results, hasIssues),
      hasIssues: hasIssues,
      data: {
        allHealthy: !hasIssues,
        criticalIssues: this.getCriticalIssues(results),
        warnings: this.getWarnings(results),
        timestamp: this.formatDate()
      }
    };
  }

  getCriticalIssues(results) {
    const issues = [];
    if (results.ssl && results.ssl.details) {
      results.ssl.details.forEach(item => {
        if (item.status === 'critical' || item.status === 'error' || !item.valid) {
          issues.push({ type: 'ssl', site: item.siteName || item.hostname, message: item.error || (item.isExpired ? 'Certificate expired' : `${item.daysRemaining} days remaining`) });
        }
      });
    }
    if (results.uptime && results.uptime.details) {
      results.uptime.details.forEach(item => {
        if (item.overallStatus === 'down' || item.overallStatus === 'error') {
          issues.push({ type: 'uptime', site: item.siteName, message: 'Site is down' });
        }
      });
    }
    return issues;
  }

  getWarnings(results) {
    const warnings = [];
    if (results.ssl && results.ssl.details) {
      results.ssl.details.forEach(item => {
        if (item.status === 'warning') {
          warnings.push({ type: 'ssl', site: item.siteName || item.hostname, message: `SSL expiring in ${item.daysRemaining} days` });
        }
      });
    }
    if (results.uptime && results.uptime.details) {
      results.uptime.details.forEach(item => {
        if (item.overallStatus === 'warning' || item.overallStatus === 'critical') {
          warnings.push({ type: 'uptime', site: item.siteName, message: `Slow response: ${item.avgResponseTime}ms` });
        }
      });
    }
    if (results.links && results.links.details) {
      results.links.details.forEach(item => {
        if (item.totalBrokenLinks > 0) {
          warnings.push({ type: 'links', site: item.siteName, message: `${item.totalBrokenLinks} broken links` });
        }
      });
    }
    return warnings;
  }

  hasAnyIssues(results) {
    if (results.ssl && !results.ssl.allHealthy) return true;
    if (results.uptime && !results.uptime.allHealthy) return true;
    if (results.links && !results.links.allHealthy) return true;
    return false;
  }

  generateTextReport(results, hasIssues) {
    let report = [];
    
    report.push('═'.repeat(60));
    report.push('🦎 QA IGUANA AGENT - DAILY REPORT');
    report.push('═'.repeat(60));
    report.push(`📅 ${this.formatDate()}`);
    report.push(`⏰ בדיקה בוצעה בשעה: ${this.formatTime(this.checkTime)}`);
    if (this.runNumber) report.push(`🔢 Run #${this.runNumber}`);
    report.push(`📋 לוגים מלאים: ${this.getActionsLink()}`);
    report.push('');
    
    if (hasIssues) {
      report.push('⚠️ STATUS: נמצאו בעיות - פרטים מלאים בלינק למעלה');
    } else {
      report.push('✅ STATUS: הכל תקין');
    }
    report.push('');
    
    // SSL Results
    if (results.ssl) {
      report.push('─'.repeat(60));
      report.push('🔐 תעודות SSL');
      report.push('─'.repeat(60));
      
      if (results.ssl.details && results.ssl.details.length > 0) {
        results.ssl.details.forEach(item => {
          const isHealthy = item.valid && item.status !== 'critical' && item.status !== 'error';
          const isWarning = item.status === 'warning';
          const status = isHealthy ? '✅' : (isWarning ? '⚠️' : '❌');
          
          report.push(`${status} ${item.siteName || item.hostname}`);
          report.push(`   כתובת: ${item.url}`);
          report.push(`   נבדק בשעה: ${this.formatTime(this.checkTime)}`);
          
          if (item.daysRemaining !== undefined) {
            report.push(`   תפוגה בעוד: ${item.daysRemaining} ימים`);
            if (item.validTo) {
              report.push(`   תאריך תפוגה: ${new Date(item.validTo).toLocaleDateString('he-IL')}`);
            }
          }
          if (item.error) {
            report.push(`   ❌ שגיאה: ${item.error}`);
            report.push(`   📋 לוג מלא: ${this.getActionsLink()}`);
          }
          if (!isHealthy || isWarning) {
            report.push(`   🔧 לתיקון: Vercel → Settings → Domains → Refresh SSL`);
          }
          report.push('');
        });
      } else {
        report.push('   אין נתונים');
        report.push('');
      }
    }
    
    // Uptime Results
    if (results.uptime) {
      report.push('─'.repeat(60));
      report.push('⬆️ זמינות ומהירות');
      report.push('─'.repeat(60));
      
      if (results.uptime.details && results.uptime.details.length > 0) {
        results.uptime.details.forEach(item => {
          const isHealthy = item.overallStatus === 'ok';
          const status = isHealthy ? '✅' : '❌';
          
          report.push(`${status} ${item.siteName}`);
          report.push(`   כתובת: ${item.baseUrl}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.timestamp || this.checkTime)}`);
          report.push(`   זמן תגובה ממוצע: ${item.avgResponseTime || 'N/A'}ms`);
          
          if (!isHealthy && item.pages) {
            item.pages.forEach(page => {
              if (!page.isUp) {
                report.push(`   ❌ ${page.pageName}: ${page.error || 'HTTP ' + page.statusCode}`);
              } else if (page.status === 'critical' || page.status === 'warning') {
                report.push(`   ⚠️ ${page.pageName}: ${page.responseTime}ms`);
              }
            });
            report.push(`   📋 לוג מלא: ${this.getActionsLink()}`);
            report.push(`   🔧 לתיקון: בדוק Vercel Dashboard או הרץ npm run build`);
          }
          report.push('');
        });
      } else {
        report.push('   אין נתונים');
        report.push('');
      }
    }
    
    // Link Validation Results
    if (results.links) {
      report.push('─'.repeat(60));
      report.push('🔗 לינקים שבורים');
      report.push('─'.repeat(60));
      
      if (results.links.details && results.links.details.length > 0) {
        results.links.details.forEach(item => {
          const isHealthy = item.totalBrokenLinks === 0;
          const status = isHealthy ? '✅' : '❌';
          
          report.push(`${status} ${item.siteName}`);
          report.push(`   כתובת: ${item.baseUrl}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.timestamp || this.checkTime)}`);
          
          if (item.allBrokenLinks && item.allBrokenLinks.length > 0) {
            report.push(`   ⚠️ נמצאו ${item.allBrokenLinks.length} לינקים שבורים:`);
            item.allBrokenLinks.forEach((link, index) => {
              report.push('');
              report.push(`   [${index + 1}] לינק שבור:`);
              report.push(`       🔗 URL: ${link.url || link.href}`);
              report.push(`       📄 נמצא בעמוד: ${link.foundOn || item.baseUrl}`);
              report.push(`       📝 טקסט: "${link.text || 'ללא טקסט'}"`);
              report.push(`       🔢 סטטוס HTTP: ${link.statusCode || 'לא זמין'}`);
              if (link.error) report.push(`       ❌ שגיאה: ${link.error}`);
              report.push(`       📋 לוג מלא: ${this.getActionsLink()}`);
            });
          } else if (isHealthy) {
            report.push(`   ✓ כל הלינקים תקינים`);
          }
          report.push('');
        });
      } else {
        report.push('   אין נתונים');
        report.push('');
      }
    }
    
    // Footer
    report.push('═'.repeat(60));
    report.push(`📋 לוגים מלאים: ${this.getActionsLink()}`);
    report.push('🦎 QA Iguana Agent v1.3.1 - "שומר על האימפריה 24/7"');
    report.push('No Art Gallery © 2026');
    report.push('═'.repeat(60));
    
    return report.join('\n');
  }

  generateHtmlReport(results, hasIssues) {
    const statusColor = hasIssues ? '#ff6b6b' : '#51cf66';
    const statusText = hasIssues ? '⚠️ נמצאו בעיות' : '✅ הכל תקין';
    
    let html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #1a2d47; color: #fff; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: #243b55; border-radius: 12px; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 48px; }
    .title { font-size: 24px; color: #4ade80; margin: 8px 0; }
    .date { color: #888; font-size: 14px; }
    .run-id { color: #666; font-size: 12px; }
    .status-box { background: ${statusColor}22; border: 2px solid ${statusColor}; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
    .status-text { font-size: 20px; font-weight: bold; color: ${statusColor}; }
    .section { background: #1a2d47; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .section-title { font-size: 18px; color: #ff8c00; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
    .item { background: #243b55; border-radius: 6px; padding: 12px; margin: 8px 0; }
    .item-name { font-weight: bold; color: #fff; }
    .item-url { color: #888; font-size: 12px; word-break: break-all; }
    .item-detail { color: #ccc; font-size: 13px; margin: 4px 0; }
    .healthy { border-right: 4px solid #51cf66; }
    .warning { border-right: 4px solid #ffd43b; }
    .error { border-right: 4px solid #ff6b6b; }
    .broken-link { background: #ff6b6b22; border-radius: 4px; padding: 10px; margin: 8px 0; font-size: 12px; border-right: 3px solid #ff6b6b; }
    .broken-link-title { color: #ff6b6b; font-weight: bold; margin-bottom: 4px; }
    .broken-link-url { color: #ff6b6b; word-break: break-all; font-family: monospace; }
    .broken-link-detail { color: #ccc; margin: 2px 0; }
    .fix-hint { background: #4ade8022; border-radius: 4px; padding: 8px; margin-top: 8px; font-size: 12px; color: #4ade80; }
    .logs-link { display: inline-block; background: #ff8c00; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; margin-top: 8px; font-size: 13px; }
    .footer { text-align: center; margin-top: 24px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🦎</div>
      <div class="title">QA Iguana Agent</div>
      <div class="date">${this.formatDate()}</div>
      ${this.runId ? `<div class="run-id">Run #${this.runNumber || this.runId}</div>` : ''}
    </div>
    <div class="status-box">
      <div class="status-text">${statusText}</div>
      <a href="${this.getActionsLink()}" class="logs-link">📋 צפה בלוגים המלאים</a>
    </div>`;

    // SSL Section
    if (results.ssl && results.ssl.details) {
      html += `<div class="section"><div class="section-title">🔐 תעודות SSL</div>`;
      results.ssl.details.forEach(item => {
        const isHealthy = item.valid && item.status !== 'critical' && item.status !== 'error';
        const isWarning = item.status === 'warning';
        const itemClass = isHealthy ? 'healthy' : (isWarning ? 'warning' : 'error');
        const icon = isHealthy ? '✅' : (isWarning ? '⚠️' : '❌');
        html += `<div class="item ${itemClass}"><div class="item-name">${icon} ${item.siteName || item.hostname}</div><div class="item-url">${item.url}</div>`;
        if (item.daysRemaining !== undefined) {
          html += `<div class="item-detail">תפוגה בעוד: <strong>${item.daysRemaining} ימים</strong></div>`;
          if (item.validTo) html += `<div class="item-detail">תאריך: ${new Date(item.validTo).toLocaleDateString('he-IL')}</div>`;
        }
        if (item.error) html += `<div class="item-detail" style="color: #ff6b6b;">❌ ${item.error}</div>`;
        if (!isHealthy || isWarning) html += `<div class="fix-hint">🔧 Vercel → Settings → Domains → Refresh SSL</div>`;
        if (!isHealthy) html += `<a href="${this.getActionsLink()}" class="logs-link">📋 לוגים</a>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Uptime Section
    if (results.uptime && results.uptime.details) {
      html += `<div class="section"><div class="section-title">⬆️ זמינות ומהירות</div>`;
      results.uptime.details.forEach(item => {
        const isHealthy = item.overallStatus === 'ok';
        const itemClass = isHealthy ? 'healthy' : (item.overallStatus === 'warning' ? 'warning' : 'error');
        const icon = isHealthy ? '✅' : '❌';
        html += `<div class="item ${itemClass}"><div class="item-name">${icon} ${item.siteName}</div><div class="item-url">${item.baseUrl}</div>`;
        html += `<div class="item-detail">תגובה ממוצעת: ${item.avgResponseTime || 'N/A'}ms</div>`;
        if (!isHealthy && item.pages) {
          item.pages.forEach(page => {
            if (!page.isUp) html += `<div class="item-detail" style="color: #ff6b6b;">❌ ${page.pageName}: ${page.error || 'HTTP ' + page.statusCode}</div>`;
          });
          html += `<a href="${this.getActionsLink()}" class="logs-link">📋 לוגים</a>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Links Section
    if (results.links && results.links.details) {
      html += `<div class="section"><div class="section-title">🔗 בדיקת לינקים</div>`;
      results.links.details.forEach(item => {
        const isHealthy = item.totalBrokenLinks === 0;
        const itemClass = isHealthy ? 'healthy' : 'error';
        const icon = isHealthy ? '✅' : '❌';
        html += `<div class="item ${itemClass}"><div class="item-name">${icon} ${item.siteName}</div><div class="item-url">${item.baseUrl}</div>`;
        if (item.allBrokenLinks && item.allBrokenLinks.length > 0) {
          html += `<div class="item-detail" style="color: #ff6b6b;">⚠️ ${item.allBrokenLinks.length} לינקים שבורים:</div>`;
          item.allBrokenLinks.forEach((link, i) => {
            html += `<div class="broken-link"><div class="broken-link-title">[${i+1}] לינק שבור</div>`;
            html += `<div class="broken-link-detail"><strong>URL:</strong> <span class="broken-link-url">${link.url || link.href}</span></div>`;
            html += `<div class="broken-link-detail"><strong>בעמוד:</strong> ${link.foundOn || item.baseUrl}</div>`;
            html += `<div class="broken-link-detail"><strong>סטטוס:</strong> ${link.statusCode || 'N/A'}</div>`;
            if (link.error) html += `<div class="broken-link-detail"><strong>שגיאה:</strong> ${link.error}</div>`;
            html += `</div>`;
          });
        } else if (isHealthy) {
          html += `<div class="item-detail" style="color: #51cf66;">✓ כל הלינקים תקינים</div>`;
        }
        if (!isHealthy) html += `<a href="${this.getActionsLink()}" class="logs-link">📋 לוגים</a>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    html += `<div class="footer"><a href="${this.getActionsLink()}" style="color: #ff8c00;">📋 לוגים מלאים</a><br><br>🦎 QA Iguana Agent v1.3.1<br>No Art Gallery © 2026</div></div></body></html>`;
    return html;
  }

  generateJsonReport(results, hasIssues) {
    return JSON.stringify({
      meta: {
        generatedAt: new Date().toISOString(),
        checkTime: this.checkTime.toISOString(),
        timezone: this.timezone,
        version: '1.3.1',
        hasIssues,
        actionsUrl: this.getActionsLink(),
        runId: this.runId,
        runNumber: this.runNumber
      },
      results
    }, null, 2);
  }
}

module.exports = ReportGenerator;
