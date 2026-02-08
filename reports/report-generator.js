/**
 * 🦎 QA Iguana Agent - Report Generator
 * Enhanced v1.3.0 - Detailed timestamps, direct links, downtime tracking
 */

class ReportGenerator {
  constructor(options = {}) {
    this.timezone = options.timezone || 'Asia/Jerusalem';
    this.actionsUrl = options.actionsUrl || null;
    this.runId = options.runId || null;
    this.runNumber = options.runNumber || null;
    this.checkTime = options.checkTime || new Date();
  }

  /**
   * Format date for display
   */
  formatDate(date = new Date()) {
    return date.toLocaleString('he-IL', { 
      timeZone: this.timezone,
      dateStyle: 'full',
      timeStyle: 'medium'
    });
  }

  /**
   * Format time only
   */
  formatTime(date = new Date()) {
    return date.toLocaleString('he-IL', { 
      timeZone: this.timezone,
      timeStyle: 'medium'
    });
  }

  /**
   * Generate GitHub Actions direct link
   */
  getActionsLink() {
    if (this.runId) {
      return `https://github.com/nirram77-lang/qa-iguana-agent/actions/runs/${this.runId}`;
    }
    return 'https://github.com/nirram77-lang/qa-iguana-agent/actions';
  }

  /**
   * Generate morning report in multiple formats
   */
  generateMorningReport(results) {
    const hasIssues = this.hasAnyIssues(results);
    
    return {
      text: this.generateTextReport(results, hasIssues),
      html: this.generateHtmlReport(results, hasIssues),
      json: this.generateJsonReport(results, hasIssues),
      hasIssues: hasIssues
    };
  }

  /**
   * Check if there are any issues
   */
  hasAnyIssues(results) {
    if (results.ssl && !results.ssl.allHealthy) return true;
    if (results.uptime && !results.uptime.allHealthy) return true;
    if (results.links && !results.links.allHealthy) return true;
    return false;
  }

  /**
   * Generate plain text report
   */
  generateTextReport(results, hasIssues) {
    let report = [];
    
    report.push('═'.repeat(60));
    report.push('🦎 QA IGUANA AGENT - DAILY REPORT');
    report.push('═'.repeat(60));
    report.push(`📅 ${this.formatDate()}`);
    report.push(`⏰ בדיקה בוצעה בשעה: ${this.formatTime(this.checkTime)}`);
    if (this.runNumber) {
      report.push(`🔢 Run #${this.runNumber}`);
    }
    report.push(`📋 לוגים מלאים: ${this.getActionsLink()}`);
    report.push('');
    
    // Overall status
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
          const status = item.healthy ? '✅' : (item.warning ? '⚠️' : '❌');
          report.push(`${status} ${item.name}`);
          report.push(`   כתובת: ${item.url}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.checkedAt || this.checkTime)}`);
          
          if (item.daysUntilExpiry !== undefined) {
            report.push(`   תפוגה בעוד: ${item.daysUntilExpiry} ימים`);
            if (item.expiryDate) {
              report.push(`   תאריך תפוגה: ${item.expiryDate}`);
            }
          }
          
          if (item.error) {
            report.push(`   ❌ שגיאה: ${item.error}`);
            report.push(`   📋 לוג מלא: ${this.getActionsLink()}`);
          }
          
          // How to fix
          if (!item.healthy || item.warning) {
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
          const status = item.healthy ? '✅' : '❌';
          report.push(`${status} ${item.name}`);
          report.push(`   כתובת: ${item.url}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.checkedAt || this.checkTime)}`);
          report.push(`   סטטוס HTTP: ${item.statusCode || 'N/A'}`);
          report.push(`   זמן תגובה: ${item.responseTime || 'N/A'}ms`);
          
          if (item.error) {
            report.push(`   ❌ שגיאה: ${item.error}`);
          }
          
          if (!item.healthy) {
            report.push(`   🚨 האתר לא הגיב בזמן הבדיקה!`);
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
          const status = item.healthy ? '✅' : '❌';
          report.push(`${status} ${item.name}`);
          report.push(`   כתובת: ${item.url}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.checkedAt || this.checkTime)}`);
          
          if (item.brokenLinks && item.brokenLinks.length > 0) {
            report.push(`   ⚠️ נמצאו ${item.brokenLinks.length} לינקים שבורים:`);
            item.brokenLinks.forEach((link, index) => {
              report.push('');
              report.push(`   [${index + 1}] לינק שבור:`);
              report.push(`       🔗 URL: ${link.href}`);
              report.push(`       📄 נמצא בעמוד: ${link.foundOnPage || item.url}`);
              report.push(`       📝 טקסט: "${link.text || 'ללא טקסט'}"`);
              report.push(`       🔢 סטטוס HTTP: ${link.statusCode || 'לא זמין'}`);
              if (link.error) {
                report.push(`       ❌ שגיאה: ${link.error}`);
              }
              report.push(`       📋 לוג מלא: ${this.getActionsLink()}`);
            });
          } else if (item.healthy) {
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
    report.push('🦎 QA Iguana Agent v1.3.0 - "שומר על האימפריה 24/7"');
    report.push('No Art Gallery © 2026');
    report.push('═'.repeat(60));
    
    return report.join('\n');
  }

  /**
   * Generate HTML report for email
   */
  generateHtmlReport(results, hasIssues) {
    const statusColor = hasIssues ? '#ff6b6b' : '#51cf66';
    const statusText = hasIssues ? '⚠️ נמצאו בעיות' : '✅ הכל תקין';
    
    let html = `
<!DOCTYPE html>
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
    .logs-link:hover { background: #ff7b00; }
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
      html += `
    <div class="section">
      <div class="section-title">🔐 תעודות SSL</div>`;
      
      results.ssl.details.forEach(item => {
        const itemClass = item.healthy ? 'healthy' : (item.warning ? 'warning' : 'error');
        const icon = item.healthy ? '✅' : (item.warning ? '⚠️' : '❌');
        
        html += `
      <div class="item ${itemClass}">
        <div class="item-name">${icon} ${item.name}</div>
        <div class="item-url">${item.url}</div>`;
        
        if (item.daysUntilExpiry !== undefined) {
          html += `<div class="item-detail">תפוגה בעוד: <strong>${item.daysUntilExpiry} ימים</strong></div>`;
          if (item.expiryDate) {
            html += `<div class="item-detail">תאריך: ${item.expiryDate}</div>`;
          }
        }
        
        if (item.error) {
          html += `<div class="item-detail" style="color: #ff6b6b;">❌ שגיאה: ${item.error}</div>`;
        }
        
        if (!item.healthy || item.warning) {
          html += `<div class="fix-hint">🔧 לתיקון: Vercel → Settings → Domains → Refresh SSL</div>`;
        }
        
        if (!item.healthy && this.actionsUrl) {
          html += `<a href="${this.actionsUrl}" class="logs-link">📋 לוגים מלאים</a>`;
        }
        
        html += `</div>`;
      });
      
      html += `</div>`;
    }

    // Uptime Section
    if (results.uptime && results.uptime.details) {
      html += `
    <div class="section">
      <div class="section-title">⬆️ זמינות ומהירות</div>`;
      
      results.uptime.details.forEach(item => {
        const itemClass = item.healthy ? 'healthy' : 'error';
        const icon = item.healthy ? '✅' : '❌';
        
        html += `
      <div class="item ${itemClass}">
        <div class="item-name">${icon} ${item.name}</div>
        <div class="item-url">${item.url}</div>
        <div class="item-detail">סטטוס: ${item.statusCode || 'N/A'} | זמן תגובה: ${item.responseTime || 'N/A'}ms</div>`;
        
        if (item.error) {
          html += `<div class="item-detail" style="color: #ff6b6b;">❌ שגיאה: ${item.error}</div>`;
        }
        
        if (!item.healthy && this.actionsUrl) {
          html += `<a href="${this.actionsUrl}" class="logs-link">📋 לוגים מלאים</a>`;
        }
        
        html += `</div>`;
      });
      
      html += `</div>`;
    }

    // Links Section
    if (results.links && results.links.details) {
      html += `
    <div class="section">
      <div class="section-title">🔗 בדיקת לינקים</div>`;
      
      results.links.details.forEach(item => {
        const itemClass = item.healthy ? 'healthy' : 'error';
        const icon = item.healthy ? '✅' : '❌';
        
        html += `
      <div class="item ${itemClass}">
        <div class="item-name">${icon} ${item.name}</div>
        <div class="item-url">${item.url}</div>`;
        
        if (item.brokenLinks && item.brokenLinks.length > 0) {
          html += `<div class="item-detail" style="color: #ff6b6b;">⚠️ נמצאו ${item.brokenLinks.length} לינקים שבורים:</div>`;
          
          item.brokenLinks.forEach((link, index) => {
            html += `
          <div class="broken-link">
            <div class="broken-link-title">[${index + 1}] לינק שבור</div>
            <div class="broken-link-detail"><strong>URL:</strong> <span class="broken-link-url">${link.href}</span></div>
            <div class="broken-link-detail"><strong>נמצא בעמוד:</strong> ${link.foundOnPage || item.url}</div>
            <div class="broken-link-detail"><strong>טקסט הלינק:</strong> "${link.text || 'ללא טקסט'}"</div>
            <div class="broken-link-detail"><strong>סטטוס HTTP:</strong> ${link.statusCode || 'לא זמין'}</div>
            ${link.error ? `<div class="broken-link-detail"><strong>שגיאה:</strong> ${link.error}</div>` : ''}
          </div>`;
          });
        } else if (item.healthy) {
          html += `<div class="item-detail" style="color: #51cf66;">✓ כל הלינקים תקינים</div>`;
        }
        
        if (!item.healthy && this.actionsUrl) {
          html += `<a href="${this.actionsUrl}" class="logs-link">📋 לוגים מלאים</a>`;
        }
        
        html += `</div>`;
      });
      
      html += `</div>`;
    }

    // Footer
    html += `
    <div class="footer">
      <a href="${this.getActionsLink()}" style="color: #ff8c00;">📋 לוגים מלאים ב-GitHub Actions</a><br><br>
      🦎 QA Iguana Agent v1.3.0 - "שומר על האימפריה 24/7"<br>
      No Art Gallery © 2026
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(results, hasIssues) {
    return JSON.stringify({
      meta: {
        generatedAt: new Date().toISOString(),
        checkTime: this.checkTime.toISOString(),
        timezone: this.timezone,
        version: '1.3.0',
        hasIssues: hasIssues,
        actionsUrl: this.getActionsLink(),
        runId: this.runId,
        runNumber: this.runNumber
      },
      results: results
    }, null, 2);
  }
}

module.exports = ReportGenerator;
