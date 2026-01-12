/**
 * 🦎 QA Iguana Agent - Report Generator
 * Generates formatted reports from test results
 * v2.0 - Improved readability and full issue descriptions
 */

class ReportGenerator {
  constructor(options = {}) {
    this.timezone = options.timezone || 'Asia/Jerusalem';
  }

  /**
   * Get current timestamp in configured timezone
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toLocaleString('he-IL', { 
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Generate full morning report
   * @param {object} results - All test results
   * @returns {object} Report in multiple formats
   */
  generateMorningReport(results) {
    const timestamp = this.getTimestamp();
    
    // Safely check if results exist
    const sslResults = results.ssl || { allHealthy: true, details: [] };
    const uptimeResults = results.uptime || { allHealthy: true, details: [] };
    const linksResults = results.links || { allHealthy: true, details: [] };
    
    // Calculate overall health
    const allHealthy = 
      sslResults.allHealthy && 
      uptimeResults.allHealthy && 
      linksResults.allHealthy;

    const criticalIssues = [];
    const warnings = [];
    const actions = [];

    // Analyze SSL results with detailed descriptions
    if (sslResults.details && sslResults.details.length > 0) {
      sslResults.details.forEach(site => {
        if (site.status === 'critical') {
          const description = site.isExpired 
            ? `תעודת SSL פגה! האתר לא מאובטח ומשתמשים יראו אזהרה`
            : `תעודת SSL תפוג בעוד ${site.daysRemaining} ימים - יש לחדש בהקדם`;
          criticalIssues.push({
            icon: '🔐',
            site: site.siteName,
            issue: site.isExpired ? 'SSL EXPIRED!' : `SSL expires in ${site.daysRemaining} days`,
            description: description,
            action: `חדש תעודת SSL עבור ${site.siteName}`,
            link: site.url
          });
          actions.push(`Renew SSL certificate for ${site.siteName}`);
        } else if (site.status === 'warning') {
          warnings.push({
            icon: '🔐',
            site: site.siteName,
            issue: `SSL expires in ${site.daysRemaining} days`,
            description: `תעודת SSL תפוג בעוד ${site.daysRemaining} ימים`,
            link: site.url
          });
        } else if (site.status === 'error') {
          criticalIssues.push({
            icon: '🔐',
            site: site.siteName,
            issue: `SSL Error: ${site.error}`,
            description: `שגיאה בבדיקת SSL - ${site.error}`,
            action: `בדוק הגדרות SSL עבור ${site.siteName}`,
            link: site.url
          });
          actions.push(`Fix SSL configuration for ${site.siteName}`);
        }
      });
    }

    // Analyze Uptime results with detailed descriptions
    if (uptimeResults.details && uptimeResults.details.length > 0) {
      uptimeResults.details.forEach(site => {
        if (site.overallStatus === 'down' || site.overallStatus === 'error') {
          criticalIssues.push({
            icon: '⬇️',
            site: site.siteName,
            issue: 'SITE DOWN!',
            description: `האתר לא מגיב! המשתמשים לא יכולים לגשת`,
            action: `בדוק מיד את ${site.siteName}`,
            link: site.url
          });
          actions.push(`Investigate downtime for ${site.siteName}`);
        } else if (site.overallStatus === 'critical') {
          warnings.push({
            icon: '🐢',
            site: site.siteName,
            issue: `Very slow: ${site.avgResponseTime}ms`,
            description: `זמן תגובה איטי מאוד - ${site.avgResponseTime}ms`,
            link: site.url
          });
        } else if (site.overallStatus === 'warning') {
          warnings.push({
            icon: '🐢',
            site: site.siteName,
            issue: `Slow: ${site.avgResponseTime}ms`,
            description: `זמן תגובה איטי - ${site.avgResponseTime}ms`,
            link: site.url
          });
        }
      });
    }

    // Analyze Link results with detailed descriptions
    if (linksResults.details && linksResults.details.length > 0) {
      linksResults.details.forEach(site => {
        if (site.totalBrokenLinks > 0) {
          warnings.push({
            icon: '🔗',
            site: site.siteName,
            issue: `${site.totalBrokenLinks} broken link(s)`,
            description: `נמצאו ${site.totalBrokenLinks} לינקים שבורים באתר`,
            link: site.url
          });
          if (site.totalBrokenLinks > 5) {
            actions.push(`Fix broken links on ${site.siteName}`);
          }
        }
      });
    }

    const report = {
      timestamp,
      allHealthy,
      criticalIssues,
      warnings,
      actions,
      summary: {
        ssl: sslResults,
        uptime: uptimeResults,
        links: linksResults
      }
    };

    return {
      data: report,
      text: this.formatTextReport(report),
      html: this.formatHtmlReport(report),
      json: JSON.stringify(report, null, 2)
    };
  }

  /**
   * Format report as plain text
   * @param {object} report - Report data
   * @returns {string} Plain text report
   */
  formatTextReport(report) {
    const lines = [];
    
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🦎 QA IGUANA - דו"ח בוקר יומי');
    lines.push(`📅 ${report.timestamp}`);
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    
    // Quick summary
    lines.push('📊 סיכום מהיר:');
    if (report.allHealthy) {
      lines.push('✅ כל המערכות תקינות!');
    } else {
      if (report.criticalIssues.length > 0) {
        lines.push(`🔴 ${report.criticalIssues.length} בעיות קריטיות`);
      }
      if (report.warnings.length > 0) {
        lines.push(`⚠️ ${report.warnings.length} אזהרות`);
      }
    }
    lines.push('');

    // SSL Status
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🔐 SSL Certificates:');
    lines.push('═══════════════════════════════════════════════════');
    if (report.summary.ssl.details && report.summary.ssl.details.length > 0) {
      report.summary.ssl.details.forEach(site => {
        const icon = site.status === 'ok' ? '✅' : site.status === 'warning' ? '⚠️' : '🔴';
        if (site.error) {
          lines.push(`${icon} ${site.siteName}: ${site.error}`);
        } else {
          lines.push(`${icon} ${site.siteName}: ${site.daysRemaining} days remaining`);
        }
      });
    } else {
      lines.push('No SSL checks performed');
    }
    lines.push('');

    // Uptime Status
    lines.push('═══════════════════════════════════════════════════');
    lines.push('⬆️ Uptime & Performance:');
    lines.push('═══════════════════════════════════════════════════');
    if (report.summary.uptime.details && report.summary.uptime.details.length > 0) {
      report.summary.uptime.details.forEach(site => {
        const icon = site.overallStatus === 'ok' ? '✅' : 
                     site.overallStatus === 'warning' ? '⚠️' : '🔴';
        if (site.avgResponseTime) {
          lines.push(`${icon} ${site.siteName}: ${site.avgResponseTime}ms`);
        } else {
          lines.push(`${icon} ${site.siteName}: DOWN`);
        }
      });
    } else {
      lines.push('No uptime checks performed');
    }
    lines.push('');

    // Links Status
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🔗 Broken Links:');
    lines.push('═══════════════════════════════════════════════════');
    if (report.summary.links.details && report.summary.links.details.length > 0) {
      report.summary.links.details.forEach(site => {
        const icon = site.totalBrokenLinks === 0 ? '✅' : '⚠️';
        lines.push(`${icon} ${site.siteName}: ${site.totalBrokenLinks} broken`);
      });
    } else {
      lines.push('No link checks performed');
    }
    lines.push('');

    // Critical Issues - DETAILED
    if (report.criticalIssues.length > 0) {
      lines.push('═══════════════════════════════════════════════════');
      lines.push('🚨 בעיות קריטיות:');
      lines.push('═══════════════════════════════════════════════════');
      report.criticalIssues.forEach((issue, i) => {
        lines.push(`${i + 1}. ${issue.icon} ${issue.site}: ${issue.issue}`);
        lines.push(`   📝 ${issue.description}`);
        if (issue.action) {
          lines.push(`   🔧 ${issue.action}`);
        }
        lines.push('');
      });
    }

    // Warnings - DETAILED
    if (report.warnings.length > 0) {
      lines.push('═══════════════════════════════════════════════════');
      lines.push('⚠️ אזהרות:');
      lines.push('═══════════════════════════════════════════════════');
      report.warnings.forEach((warning, i) => {
        lines.push(`${i + 1}. ${warning.icon} ${warning.site}: ${warning.issue}`);
        lines.push(`   📝 ${warning.description}`);
        lines.push('');
      });
    }

    // Required Actions
    if (report.actions.length > 0) {
      lines.push('═══════════════════════════════════════════════════');
      lines.push('📋 פעולות נדרשות:');
      lines.push('═══════════════════════════════════════════════════');
      report.actions.forEach((action, i) => {
        lines.push(`${i + 1}. ${action}`);
      });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════');
    lines.push('🦎 QA Iguana - "שומר על האימפריה 24/7"');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Format report as HTML - IMPROVED v2.0
   * @param {object} report - Report data
   * @returns {string} HTML report
   */
  formatHtmlReport(report) {
    const statusColor = report.allHealthy ? '#22c55e' : '#ef4444';
    const statusText = report.allHealthy ? 'All Systems Healthy ✅' : 'Issues Detected 🔴';

    const sslDetails = report.summary.ssl.details || [];
    const uptimeDetails = report.summary.uptime.details || [];
    const linksDetails = report.summary.links.details || [];

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Iguana - Daily Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a1f1a 0%, #1a4035 100%);
      color: #f5f5dc;
      padding: 20px;
      margin: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(10, 31, 26, 0.95);
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      border: 1px solid rgba(205, 127, 50, 0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid rgba(205, 127, 50, 0.3);
    }
    .logo { font-size: 48px; margin-bottom: 10px; }
    h1 {
      color: #ffd700;
      margin: 10px 0;
      font-size: 24px;
    }
    .timestamp {
      color: rgba(245, 245, 220, 0.7);
      font-size: 14px;
    }
    .status-banner {
      background: ${statusColor};
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 20px;
      font-size: 18px;
    }
    .section {
      background: rgba(26, 64, 53, 0.5);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section h2 {
      color: #cd7f32;
      margin-top: 0;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .site-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(245, 245, 220, 0.1);
    }
    .site-item:last-child { border-bottom: none; }
    .site-name {
      color: #f5f5dc;
      font-weight: 500;
    }
    .status-ok { color: #22c55e; font-weight: bold; }
    .status-warning { color: #f59e0b; font-weight: bold; }
    .status-critical { color: #ef4444; font-weight: bold; }
    .status-error { color: #ef4444; font-weight: bold; }
    .status-down { color: #ef4444; font-weight: bold; }
    
    /* ✅ IMPROVED: Critical Issues with full visible text */
    .issue-card {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .issue-card.warning {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.4);
    }
    .issue-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .issue-icon {
      font-size: 24px;
    }
    .issue-site {
      color: #ffd700;
      font-weight: bold;
      font-size: 16px;
    }
    .issue-title {
      color: #ef4444;
      font-weight: bold;
      font-size: 14px;
    }
    .issue-card.warning .issue-title {
      color: #f59e0b;
    }
    .issue-description {
      color: #f5f5dc;
      font-size: 14px;
      margin: 10px 0;
      padding: 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      line-height: 1.5;
    }
    .issue-action {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #22c55e;
      font-size: 13px;
      margin-top: 10px;
    }
    .issue-link {
      color: #4ade80;
      text-decoration: underline;
      font-size: 12px;
    }
    
    .action-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .action-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      margin: 8px 0;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 8px;
      border-right: 4px solid #22c55e;
    }
    .action-number {
      background: #22c55e;
      color: #0a1f1a;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(205, 127, 50, 0.3);
      color: rgba(245, 245, 220, 0.5);
      font-size: 12px;
    }
    .quick-links {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    .quick-link {
      background: rgba(74, 222, 128, 0.2);
      color: #4ade80;
      padding: 8px 16px;
      border-radius: 20px;
      text-decoration: none;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🦎</div>
      <h1>QA Iguana - דו"ח בוקר</h1>
      <div class="timestamp">📅 ${report.timestamp}</div>
    </div>
    
    <div class="status-banner">
      ${statusText}
    </div>

    <!-- SSL Certificates -->
    <div class="section">
      <h2>🔐 SSL Certificates</h2>
      ${sslDetails.length > 0 ? sslDetails.map(site => `
        <div class="site-item">
          <span class="site-name">${site.siteName}</span>
          <span class="status-${site.status}">
            ${site.error ? site.error : `${site.daysRemaining} days`}
          </span>
        </div>
      `).join('') : '<div class="site-item"><span>No SSL checks performed</span></div>'}
    </div>

    <!-- Uptime & Performance -->
    <div class="section">
      <h2>⬆️ Uptime & Performance</h2>
      ${uptimeDetails.length > 0 ? uptimeDetails.map(site => `
        <div class="site-item">
          <span class="site-name">${site.siteName}</span>
          <span class="status-${site.overallStatus}">
            ${site.avgResponseTime ? `${site.avgResponseTime}ms` : 'DOWN'}
          </span>
        </div>
      `).join('') : '<div class="site-item"><span>No uptime checks performed</span></div>'}
    </div>

    <!-- Links Health -->
    <div class="section">
      <h2>🔗 Links Health</h2>
      ${linksDetails.length > 0 ? linksDetails.map(site => `
        <div class="site-item">
          <span class="site-name">${site.siteName}</span>
          <span class="${site.totalBrokenLinks === 0 ? 'status-ok' : 'status-warning'}">
            ${site.totalBrokenLinks === 0 ? '✅ All OK' : `⚠️ ${site.totalBrokenLinks} broken`}
          </span>
        </div>
      `).join('') : '<div class="site-item"><span>No link checks performed</span></div>'}
    </div>

    <!-- ✅ IMPROVED: Critical Issues with full details -->
    ${report.criticalIssues.length > 0 ? `
    <div class="section">
      <h2>🚨 Critical Issues</h2>
      ${report.criticalIssues.map(issue => `
        <div class="issue-card">
          <div class="issue-header">
            <span class="issue-icon">${issue.icon}</span>
            <span class="issue-site">${issue.site}</span>
          </div>
          <div class="issue-title">${issue.issue}</div>
          <div class="issue-description">
            📝 ${issue.description}
          </div>
          ${issue.action ? `
          <div class="issue-action">
            🔧 <strong>פעולה נדרשת:</strong> ${issue.action}
          </div>
          ` : ''}
          ${issue.link ? `
          <a href="${issue.link}" class="issue-link" target="_blank">🔗 פתח אתר</a>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- ✅ IMPROVED: Warnings with full details -->
    ${report.warnings.length > 0 ? `
    <div class="section">
      <h2>⚠️ Warnings</h2>
      ${report.warnings.map(warning => `
        <div class="issue-card warning">
          <div class="issue-header">
            <span class="issue-icon">${warning.icon}</span>
            <span class="issue-site">${warning.site}</span>
          </div>
          <div class="issue-title">${warning.issue}</div>
          <div class="issue-description">
            📝 ${warning.description}
          </div>
          ${warning.link ? `
          <a href="${warning.link}" class="issue-link" target="_blank">🔗 פתח אתר</a>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Required Actions -->
    ${report.actions.length > 0 ? `
    <div class="section">
      <h2>📋 Required Actions</h2>
      <ul class="action-list">
        ${report.actions.map((action, i) => `
          <li class="action-item">
            <span class="action-number">${i + 1}</span>
            <span>${action}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Quick Links -->
    <div class="quick-links">
      <a href="https://i4iguana.com/admin/super" class="quick-link">🦎 Admin Panel</a>
      <a href="https://vercel.com/dashboard" class="quick-link">▲ Vercel</a>
      <a href="https://console.firebase.google.com" class="quick-link">🔥 Firebase</a>
    </div>

    <div class="footer">
      🦎 QA Iguana Agent v2.0 - "שומר על האימפריה 24/7"<br>
      No Art Gallery © 2026
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = ReportGenerator;
