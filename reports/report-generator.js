/**
 * 🦎 QA Iguana Agent - Report Generator
 * Generates formatted reports from test results
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
    
    // Calculate overall health
    const allHealthy = 
      results.ssl.allHealthy && 
      results.uptime.allHealthy && 
      results.links.allHealthy;

    const criticalIssues = [];
    const warnings = [];
    const actions = [];

    // Analyze SSL results
    results.ssl.details.forEach(site => {
      if (site.status === 'critical') {
        criticalIssues.push(`🔐 ${site.siteName}: SSL ${site.isExpired ? 'EXPIRED!' : `expires in ${site.daysRemaining} days`}`);
        actions.push(`Renew SSL certificate for ${site.siteName}`);
      } else if (site.status === 'warning') {
        warnings.push(`🔐 ${site.siteName}: SSL expires in ${site.daysRemaining} days`);
      } else if (site.status === 'error') {
        criticalIssues.push(`🔐 ${site.siteName}: SSL Error - ${site.error}`);
        actions.push(`Fix SSL configuration for ${site.siteName}`);
      }
    });

    // Analyze Uptime results
    results.uptime.details.forEach(site => {
      if (site.overallStatus === 'down' || site.overallStatus === 'error') {
        criticalIssues.push(`⬇️ ${site.siteName}: SITE DOWN!`);
        actions.push(`Investigate downtime for ${site.siteName}`);
      } else if (site.overallStatus === 'critical') {
        warnings.push(`🐢 ${site.siteName}: Very slow response (${site.avgResponseTime}ms)`);
      } else if (site.overallStatus === 'warning') {
        warnings.push(`🐢 ${site.siteName}: Slow response (${site.avgResponseTime}ms)`);
      }
    });

    // Analyze Link results
    results.links.details.forEach(site => {
      if (site.totalBrokenLinks > 0) {
        warnings.push(`🔗 ${site.siteName}: ${site.totalBrokenLinks} broken link(s)`);
        if (site.totalBrokenLinks > 5) {
          actions.push(`Fix broken links on ${site.siteName}`);
        }
      }
    });

    const report = {
      timestamp,
      allHealthy,
      criticalIssues,
      warnings,
      actions,
      summary: {
        ssl: results.ssl,
        uptime: results.uptime,
        links: results.links
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
    report.summary.ssl.details.forEach(site => {
      const icon = site.status === 'ok' ? '✅' : site.status === 'warning' ? '⚠️' : '🔴';
      if (site.error) {
        lines.push(`${icon} ${site.siteName}: ${site.error}`);
      } else {
        lines.push(`${icon} ${site.siteName}: ${site.daysRemaining} days remaining`);
      }
    });
    lines.push('');

    // Uptime Status
    lines.push('═══════════════════════════════════════════════════');
    lines.push('⬆️ Uptime & Performance:');
    lines.push('═══════════════════════════════════════════════════');
    report.summary.uptime.details.forEach(site => {
      const icon = site.overallStatus === 'ok' ? '✅' : 
                   site.overallStatus === 'warning' ? '⚠️' : '🔴';
      if (site.avgResponseTime) {
        lines.push(`${icon} ${site.siteName}: ${site.avgResponseTime}ms`);
      } else {
        lines.push(`${icon} ${site.siteName}: DOWN`);
      }
    });
    lines.push('');

    // Links Status
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🔗 Broken Links:');
    lines.push('═══════════════════════════════════════════════════');
    report.summary.links.details.forEach(site => {
      const icon = site.totalBrokenLinks === 0 ? '✅' : '⚠️';
      lines.push(`${icon} ${site.siteName}: ${site.totalBrokenLinks} broken`);
    });
    lines.push('');

    // Critical Issues
    if (report.criticalIssues.length > 0) {
      lines.push('═══════════════════════════════════════════════════');
      lines.push('🚨 בעיות קריטיות:');
      lines.push('═══════════════════════════════════════════════════');
      report.criticalIssues.forEach((issue, i) => {
        lines.push(`${i + 1}. ${issue}`);
      });
      lines.push('');
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('═══════════════════════════════════════════════════');
      lines.push('⚠️ אזהרות:');
      lines.push('═══════════════════════════════════════════════════');
      report.warnings.forEach((warning, i) => {
        lines.push(`${i + 1}. ${warning}`);
      });
      lines.push('');
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
   * Format report as HTML
   * @param {object} report - Report data
   * @returns {string} HTML report
   */
  formatHtmlReport(report) {
    const statusColor = report.allHealthy ? '#22c55e' : '#ef4444';
    const statusText = report.allHealthy ? 'All Systems Healthy ✅' : 'Issues Detected 🔴';

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
      background: rgba(10, 31, 26, 0.9);
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
      padding: 10px 0;
      border-bottom: 1px solid rgba(245, 245, 220, 0.1);
    }
    .site-item:last-child { border-bottom: none; }
    .status-ok { color: #22c55e; }
    .status-warning { color: #f59e0b; }
    .status-critical { color: #ef4444; }
    .issue-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .issue-list li {
      padding: 10px;
      margin: 5px 0;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      border-right: 3px solid #ef4444;
    }
    .warning-list li {
      border-right-color: #f59e0b;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(205, 127, 50, 0.3);
      color: rgba(245, 245, 220, 0.5);
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

    <div class="section">
      <h2>🔐 SSL Certificates</h2>
      ${report.summary.ssl.details.map(site => `
        <div class="site-item">
          <span>${site.siteName}</span>
          <span class="status-${site.status}">
            ${site.error ? site.error : `${site.daysRemaining} days`}
          </span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>⬆️ Uptime & Performance</h2>
      ${report.summary.uptime.details.map(site => `
        <div class="site-item">
          <span>${site.siteName}</span>
          <span class="status-${site.overallStatus}">
            ${site.avgResponseTime ? `${site.avgResponseTime}ms` : 'DOWN'}
          </span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>🔗 Links Health</h2>
      ${report.summary.links.details.map(site => `
        <div class="site-item">
          <span>${site.siteName}</span>
          <span class="${site.totalBrokenLinks === 0 ? 'status-ok' : 'status-warning'}">
            ${site.totalBrokenLinks === 0 ? '✅ All OK' : `⚠️ ${site.totalBrokenLinks} broken`}
          </span>
        </div>
      `).join('')}
    </div>

    ${report.criticalIssues.length > 0 ? `
    <div class="section">
      <h2>🚨 Critical Issues</h2>
      <ul class="issue-list">
        ${report.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.warnings.length > 0 ? `
    <div class="section">
      <h2>⚠️ Warnings</h2>
      <ul class="issue-list warning-list">
        ${report.warnings.map(warning => `<li>${warning}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.actions.length > 0 ? `
    <div class="section">
      <h2>📋 Required Actions</h2>
      <ul class="issue-list">
        ${report.actions.map((action, i) => `<li>${i + 1}. ${action}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="footer">
      🦎 QA Iguana Agent - "שומר על האימפריה 24/7"<br>
      No Art Gallery © 2026
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = ReportGenerator;
