/**
 * 🦎 QA Iguana Agent - Report Generator
 * Enhanced v1.4.0 - Full details for ALL issue types
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

  /**
   * Extract broken links from any possible field name the checker might use
   */
  extractBrokenLinks(item) {
    return item.allBrokenLinks 
      || item.brokenLinks 
      || item.broken_links 
      || item.errors 
      || [];
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
    if (results.links && results.links.details) {
      results.links.details.forEach(item => {
        const brokenLinks = this.extractBrokenLinks(item);
        if (brokenLinks.length > 0 || item.totalBrokenLinks > 0) {
          issues.push({ 
            type: 'links', 
            site: item.siteName, 
            message: `${brokenLinks.length || item.totalBrokenLinks} לינקים שבורים`,
            links: brokenLinks
          });
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
      report.push('⚠️ STATUS: נמצאו בעיות - פרטים מלאים למטה');
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
          if (item.issuer) report.push(`   מנפיק: ${item.issuer}`);
          if (item.error) {
            report.push(`   ❌ שגיאה: ${item.error}`);
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
          const status = isHealthy ? '✅' : (item.overallStatus === 'warning' ? '⚠️' : '❌');
          
          report.push(`${status} ${item.siteName}`);
          report.push(`   כתובת: ${item.baseUrl}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.timestamp || this.checkTime)}`);
          report.push(`   זמן תגובה ממוצע: ${item.avgResponseTime || 'N/A'}ms`);
          
          if (!isHealthy && item.pages) {
            item.pages.forEach(page => {
              if (!page.isUp) {
                report.push(`   ❌ עמוד: ${page.pageName || page.url}`);
                report.push(`      סטטוס HTTP: ${page.statusCode || 'N/A'}`);
                if (page.error) report.push(`      שגיאה: ${page.error}`);
                report.push(`      🔧 בדוק Vercel logs או שגיאות build`);
              } else if (page.status === 'critical' || page.status === 'warning') {
                report.push(`   ⚠️ ${page.pageName}: איטי - ${page.responseTime}ms`);
              }
            });
          }
          
          // Show all pages with response times
          if (item.pages && item.pages.length > 0) {
            report.push(`   📊 פירוט עמודים:`);
            item.pages.forEach(page => {
              const pageIcon = page.isUp ? '✓' : '✗';
              report.push(`      ${pageIcon} ${page.pageName || page.url}: ${page.responseTime || page.statusCode || 'N/A'}ms`);
            });
          }
          
          report.push('');
        });
      } else {
        report.push('   אין נתונים');
        report.push('');
      }
    }
    
    // Links Results
    if (results.links) {
      report.push('─'.repeat(60));
      report.push('🔗 בדיקת לינקים');
      report.push('─'.repeat(60));
      
      if (results.links.details && results.links.details.length > 0) {
        results.links.details.forEach(item => {
          const brokenLinks = this.extractBrokenLinks(item);
          const brokenCount = brokenLinks.length || item.totalBrokenLinks || 0;
          const isHealthy = brokenCount === 0;
          const status = isHealthy ? '✅' : '❌';
          
          report.push(`${status} ${item.siteName}`);
          report.push(`   כתובת: ${item.baseUrl}`);
          report.push(`   נבדק בשעה: ${this.formatTime(item.timestamp || this.checkTime)}`);
          if (item.totalChecked) report.push(`   סה"כ לינקים נבדקו: ${item.totalChecked}`);
          
          if (brokenLinks.length > 0) {
            report.push(`   ❌ נמצאו ${brokenLinks.length} לינקים שבורים:`);
            brokenLinks.forEach((link, index) => {
              report.push('');
              report.push(`   ┌─ [${index + 1}/${brokenLinks.length}] לינק שבור`);
              report.push(`   │  🔗 URL: ${link.url || link.href || 'לא ידוע'}`);
              report.push(`   │  📄 נמצא בעמוד: ${link.foundOn || link.page || item.baseUrl}`);
              if (link.text) report.push(`   │  📝 טקסט הלינק: "${link.text}"`);
              report.push(`   │  🔢 סטטוס HTTP: ${link.statusCode || link.status || 'לא זמין'}`);
              if (link.error) report.push(`   │  ❌ שגיאה: ${link.error}`);
              if (link.redirectTo) report.push(`   │  ↪️ מפנה ל: ${link.redirectTo}`);
              report.push(`   └─ 🔧 פתח את העמוד ותקן את הלינק`);
            });
          } else if (!isHealthy && brokenCount > 0) {
            // totalBrokenLinks > 0 but no detail array — data missing
            report.push(`   ❌ נמצאו ${brokenCount} לינקים שבורים`);
            report.push(`   ⚠️ פירוט לינקים לא זמין - בדוק: ${this.getActionsLink()}`);
          } else {
            report.push(`   ✓ כל הלינקים תקינים`);
          }
          report.push('');
        });
      } else {
        report.push('   אין נתונים');
        report.push('');
      }
    }
    
    // Summary of all issues
    if (hasIssues) {
      report.push('─'.repeat(60));
      report.push('📋 סיכום בעיות שדורשות טיפול');
      report.push('─'.repeat(60));
      const criticalIssues = this.getCriticalIssues(results);
      const warnings = this.getWarnings(results);
      
      if (criticalIssues.length > 0) {
        report.push('🔴 קריטי:');
        criticalIssues.forEach(issue => {
          report.push(`   • [${issue.type.toUpperCase()}] ${issue.site}: ${issue.message}`);
          if (issue.links && issue.links.length > 0) {
            issue.links.slice(0, 3).forEach(link => {
              report.push(`     - ${link.url || link.href}`);
            });
            if (issue.links.length > 3) report.push(`     ... ועוד ${issue.links.length - 3}`);
          }
        });
      }
      
      if (warnings.length > 0) {
        report.push('🟡 אזהרות:');
        warnings.forEach(w => {
          report.push(`   • [${w.type.toUpperCase()}] ${w.site}: ${w.message}`);
        });
      }
      report.push('');
    }
    
    // Footer
    report.push('═'.repeat(60));
    report.push(`📋 לוגים מלאים: ${this.getActionsLink()}`);
    report.push('🦎 QA Iguana Agent v1.4.0 - "שומר על האימפריה 24/7"');
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
    .container { max-width: 650px; margin: 0 auto; background: #243b55; border-radius: 12px; padding: 24px; }
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
    .item-name { font-weight: bold; color: #fff; font-size: 15px; }
    .item-url { color: #888; font-size: 12px; word-break: break-all; margin: 3px 0; }
    .item-detail { color: #ccc; font-size: 13px; margin: 4px 0; }
    .healthy { border-right: 4px solid #51cf66; }
    .warning { border-right: 4px solid #ffd43b; }
    .error { border-right: 4px solid #ff6b6b; }
    .broken-links-container { margin-top: 10px; }
    .broken-link { background: #ff6b6b15; border: 1px solid #ff6b6b44; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 12px; border-right: 3px solid #ff6b6b; }
    .broken-link-num { color: #ff6b6b; font-weight: bold; font-size: 13px; margin-bottom: 6px; }
    .broken-link-url { color: #ff8888; word-break: break-all; font-family: monospace; background: #ff6b6b15; padding: 3px 6px; border-radius: 3px; display: block; margin: 4px 0; }
    .broken-link-detail { color: #ccc; margin: 3px 0; }
    .broken-link-detail strong { color: #aaa; }
    .fix-hint { background: #4ade8015; border-radius: 4px; padding: 8px; margin-top: 8px; font-size: 12px; color: #4ade80; border-right: 3px solid #4ade80; }
    .pages-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .pages-table td { padding: 4px 8px; border-bottom: 1px solid #333; }
    .pages-table tr:last-child td { border-bottom: none; }
    .logs-link { display: inline-block; background: #ff8c00; color: #fff; padding: 6px 14px; border-radius: 6px; text-decoration: none; margin-top: 8px; font-size: 12px; }
    .summary-section { background: #ff6b6b15; border: 1px solid #ff6b6b44; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .summary-title { color: #ff6b6b; font-size: 16px; font-weight: bold; margin-bottom: 10px; }
    .summary-item { color: #ccc; font-size: 13px; margin: 5px 0; padding: 5px 10px; background: #ff6b6b10; border-radius: 4px; }
    .footer { text-align: center; margin-top: 24px; color: #666; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-right: 4px; }
    .badge-error { background: #ff6b6b33; color: #ff6b6b; }
    .badge-ok { background: #51cf6633; color: #51cf66; }
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
        html += `<div class="item ${itemClass}">
          <div class="item-name">${icon} ${item.siteName || item.hostname}</div>
          <div class="item-url">${item.url}</div>`;
        if (item.daysRemaining !== undefined) {
          const daysColor = item.daysRemaining < 14 ? '#ff6b6b' : item.daysRemaining < 30 ? '#ffd43b' : '#51cf66';
          html += `<div class="item-detail">תפוגה בעוד: <strong style="color:${daysColor}">${item.daysRemaining} ימים</strong></div>`;
          if (item.validTo) html += `<div class="item-detail">תאריך: ${new Date(item.validTo).toLocaleDateString('he-IL')}</div>`;
        }
        if (item.issuer) html += `<div class="item-detail">מנפיק: ${item.issuer}</div>`;
        if (item.error) html += `<div class="item-detail" style="color:#ff6b6b;">❌ ${item.error}</div>`;
        if (!isHealthy || isWarning) html += `<div class="fix-hint">🔧 לתיקון: Vercel → Settings → Domains → Refresh SSL</div>`;
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
        const icon = isHealthy ? '✅' : (item.overallStatus === 'warning' ? '⚠️' : '❌');
        html += `<div class="item ${itemClass}">
          <div class="item-name">${icon} ${item.siteName}</div>
          <div class="item-url">${item.baseUrl}</div>
          <div class="item-detail">תגובה ממוצעת: <strong>${item.avgResponseTime || 'N/A'}ms</strong></div>`;
        
        if (item.pages && item.pages.length > 0) {
          html += `<table class="pages-table">`;
          item.pages.forEach(page => {
            const pageOk = page.isUp !== false;
            const color = pageOk ? '#51cf66' : '#ff6b6b';
            html += `<tr>
              <td style="color:${color}">${pageOk ? '✓' : '✗'} ${page.pageName || page.url || 'עמוד'}</td>
              <td style="color:${color};text-align:left;">${page.responseTime ? page.responseTime+'ms' : (page.statusCode || 'N/A')}</td>
              ${!pageOk && page.error ? `<td style="color:#ff8888;font-size:11px;">${page.error}</td>` : '<td></td>'}
            </tr>`;
          });
          html += `</table>`;
        }
        
        if (!isHealthy) {
          html += `<div class="fix-hint">🔧 בדוק Vercel logs → פרוס מחדש אם צריך</div>`;
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
        const brokenLinks = this.extractBrokenLinks(item);
        const brokenCount = brokenLinks.length || item.totalBrokenLinks || 0;
        const isHealthy = brokenCount === 0;
        const itemClass = isHealthy ? 'healthy' : 'error';
        const icon = isHealthy ? '✅' : '❌';
        
        html += `<div class="item ${itemClass}">
          <div class="item-name">${icon} ${item.siteName}</div>
          <div class="item-url">${item.baseUrl}</div>`;
        
        if (item.totalChecked) html += `<div class="item-detail">נבדקו: ${item.totalChecked} לינקים</div>`;
        
        if (brokenLinks.length > 0) {
          html += `<div class="item-detail" style="color:#ff6b6b;margin:8px 0;">❌ נמצאו <strong>${brokenLinks.length}</strong> לינקים שבורים:</div>`;
          html += `<div class="broken-links-container">`;
          brokenLinks.forEach((link, i) => {
            html += `<div class="broken-link">
              <div class="broken-link-num">🔴 לינק שבור #${i+1}</div>
              <div class="broken-link-detail"><strong>URL:</strong></div>
              <div class="broken-link-url">${link.url || link.href || 'לא ידוע'}</div>
              <div class="broken-link-detail"><strong>נמצא בעמוד:</strong> ${link.foundOn || link.page || item.baseUrl}</div>
              ${link.text ? `<div class="broken-link-detail"><strong>טקסט:</strong> "${link.text}"</div>` : ''}
              <div class="broken-link-detail"><strong>סטטוס HTTP:</strong> <span class="badge badge-error">${link.statusCode || link.status || 'N/A'}</span></div>
              ${link.error ? `<div class="broken-link-detail" style="color:#ff8888;"><strong>שגיאה:</strong> ${link.error}</div>` : ''}
              ${link.redirectTo ? `<div class="broken-link-detail"><strong>מפנה ל:</strong> ${link.redirectTo}</div>` : ''}
            </div>`;
          });
          html += `</div>`;
          html += `<div class="fix-hint">🔧 פתח כל עמוד ותקן את הלינקים השבורים</div>`;
          html += `<a href="${this.getActionsLink()}" class="logs-link">📋 לוגים</a>`;
        } else if (!isHealthy && brokenCount > 0) {
          html += `<div class="item-detail" style="color:#ff6b6b;">❌ נמצאו ${brokenCount} לינקים שבורים - פירוט בלוגים</div>`;
          html += `<a href="${this.getActionsLink()}" class="logs-link">📋 ראה לוגים מלאים</a>`;
        } else {
          html += `<div class="item-detail" style="color:#51cf66;">✓ כל הלינקים תקינים</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Summary section if issues exist
    if (hasIssues) {
      const criticalIssues = this.getCriticalIssues(results);
      const warnings = this.getWarnings(results);
      if (criticalIssues.length > 0 || warnings.length > 0) {
        html += `<div class="summary-section"><div class="summary-title">📋 סיכום - מה צריך טיפול</div>`;
        criticalIssues.forEach(issue => {
          html += `<div class="summary-item">🔴 <strong>${issue.type.toUpperCase()}</strong> | ${issue.site}: ${issue.message}</div>`;
        });
        warnings.forEach(w => {
          html += `<div class="summary-item">🟡 <strong>${w.type.toUpperCase()}</strong> | ${w.site}: ${w.message}</div>`;
        });
        html += `</div>`;
      }
    }

    html += `
    <div class="footer">
      <a href="${this.getActionsLink()}" style="color:#ff8c00;">📋 לוגים מלאים ב-GitHub Actions</a><br><br>
      🦎 QA Iguana Agent v1.4.0 | "שומר על האימפריה 24/7"<br>
      No Art Gallery © 2026
    </div>
  </div>
</body>
</html>`;
    return html;
  }

  generateJsonReport(results, hasIssues) {
    // Enrich results with extracted broken links for easier consumption
    const enrichedResults = JSON.parse(JSON.stringify(results));
    if (enrichedResults.links && enrichedResults.links.details) {
      enrichedResults.links.details.forEach(item => {
        item._brokenLinksExtracted = this.extractBrokenLinks(item);
      });
    }
    
    return JSON.stringify({
      meta: {
        generatedAt: new Date().toISOString(),
        checkTime: this.checkTime.toISOString(),
        timezone: this.timezone,
        version: '1.4.0',
        hasIssues,
        actionsUrl: this.getActionsLink(),
        runId: this.runId,
        runNumber: this.runNumber
      },
      summary: {
        criticalIssues: this.getCriticalIssues(results),
        warnings: this.getWarnings(results),
        allHealthy: !hasIssues
      },
      results: enrichedResults
    }, null, 2);
  }
}

module.exports = ReportGenerator;
