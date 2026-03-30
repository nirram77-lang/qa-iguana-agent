#!/usr/bin/env node

/**
 * 🦎 QA Iguana Agent - Main Entry Point
 * The Empire Guardian - Automated QA Testing
 * v1.2.0 - Added GitHub Actions links for issues
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Import test modules
const SSLChecker = require('./tests/ssl-checker');
const UptimeMonitor = require('./tests/uptime-monitor');
const LinkValidator = require('./tests/link-validator');
const ReportGenerator = require('./reports/report-generator');
const EmailSender = require('./reports/email-sender');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  ssl: args.includes('--ssl') || args.includes('--full-report') || args.length === 0,
  uptime: args.includes('--uptime') || args.includes('--full-report') || args.length === 0,
  links: args.includes('--links') || args.includes('--full-report') || args.length === 0,
  fullReport: args.includes('--full-report') || args.length === 0,
  sendEmail: args.includes('--send-email'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

/**
 * Load configuration
 */
function loadConfig() {
  const configPath = path.join(__dirname, 'config', 'sites.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Get GitHub Actions run URL
 */
function getGitHubActionsUrl(config) {
  const github = config.settings.github;
  if (!github) return null;
  
  // If running in GitHub Actions, use the actual run ID
  const runId = process.env.GITHUB_RUN_ID;
  
  if (runId) {
    return `https://github.com/${github.owner}/${github.repo}/actions/runs/${runId}`;
  }
  
  // Fallback to general actions page
  return github.actionsUrl || `https://github.com/${github.owner}/${github.repo}/actions`;
}

/**
 * Print banner
 */
function printBanner() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           🦎 QA IGUANA AGENT - The Empire Guardian            ║
║                        v1.2.0                                 ║
║              "שומר על האימפריה 24/7"                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  console.log(`📅 ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`);
  console.log('');
}

/**
 * Run SSL checks
 */
async function runSSLChecks(config) {
  console.log('🔐 Starting SSL Certificate Checks...');
  console.log('─'.repeat(50));
  
  const checker = new SSLChecker({
    warningDays: config.settings.thresholds.sslExpiryWarning,
    criticalDays: config.settings.thresholds.sslExpiryCritical
  });
  
  const sitesToCheck = config.sites.filter(site => site.checks && site.checks.ssl);
  
  if (sitesToCheck.length === 0) {
    console.log('No sites configured for SSL checks');
    return { allHealthy: true, details: [] };
  }
  
  const results = await checker.checkMultipleSites(sitesToCheck);
  const summary = checker.generateSummary(results);
  
  console.log('');
  results.forEach(result => console.log(checker.formatResult(result)));
  console.log('');
  
  return summary;
}

/**
 * Run uptime checks
 */
async function runUptimeChecks(config) {
  console.log('⬆️ Starting Uptime & Performance Checks...');
  console.log('─'.repeat(50));
  
  const monitor = new UptimeMonitor({
    warningThreshold: config.settings.thresholds.responseTimeWarning,
    criticalThreshold: config.settings.thresholds.responseTimeCritical
  });
  
  const sitesToCheck = config.sites.filter(site => site.checks && site.checks.uptime);
  
  if (sitesToCheck.length === 0) {
    console.log('No sites configured for uptime checks');
    return { allHealthy: true, details: [] };
  }
  
  const results = await monitor.checkMultipleSites(sitesToCheck);
  const summary = monitor.generateSummary(results);
  
  console.log('');
  results.forEach(result => console.log(monitor.formatResult(result)));
  console.log('');
  
  return summary;
}

/**
 * Run link validation
 */
async function runLinkValidation(config) {
  console.log('🔗 Starting Link Validation...');
  console.log('─'.repeat(50));
  
  const validator = new LinkValidator();
  
  const sitesToCheck = config.sites.filter(site => site.checks && site.checks.links);
  
  if (sitesToCheck.length === 0) {
    console.log('No sites configured for link checks');
    return { allHealthy: true, details: [] };
  }
  
  const results = await validator.validateMultipleSites(sitesToCheck);
  const summary = validator.generateSummary(results);
  
  console.log('');
  results.forEach(result => console.log(validator.formatResult(result)));
  console.log('');
  
  return summary;
}

/**
 * Main function
 */
async function main() {
  printBanner();
  
  const config = loadConfig();
  const results = {};
  
  // Get GitHub Actions URL for reports
  const actionsUrl = getGitHubActionsUrl(config);
  
  if (actionsUrl && process.env.GITHUB_RUN_ID) {
    console.log(`📋 Run ID: ${process.env.GITHUB_RUN_ID}`);
    console.log(`🔗 Logs: ${actionsUrl}`);
    console.log('');
  }
  
  // Always run all tests when --full-report is specified
  if (options.ssl) {
    results.ssl = await runSSLChecks(config);
  }
  
  if (options.uptime) {
    results.uptime = await runUptimeChecks(config);
  }
  
  if (options.links) {
    results.links = await runLinkValidation(config);
  }
  

  // Load Audiobook Monitor results (runs before this step in workflow)
  const audiobookReportPath = path.join(__dirname, 'reports', 'output', 'audiobook-monitor.json');
  if (fs.existsSync(audiobookReportPath)) {
    try {
      results.audiobook = JSON.parse(fs.readFileSync(audiobookReportPath, 'utf8'));
      console.log('🎧 Audiobook monitor data loaded: ' + (results.audiobook.foundPlatforms || []).length + ' platforms found');
    } catch(e) {
      console.log('⚠️ Could not load audiobook monitor data: ' + e.message);
    }
  } else {
    console.log('⚠️ Audiobook monitor JSON not found - run audiobook-monitor.js first');
  }

  // Generate report
  console.log('📊 Generating Report...');
  console.log('─'.repeat(50));
  
  const reportGenerator = new ReportGenerator({
    timezone: config.settings.timezone,
    actionsUrl: actionsUrl,
    runId: process.env.GITHUB_RUN_ID,
    runNumber: process.env.GITHUB_RUN_NUMBER
  });
  
  const report = reportGenerator.generateMorningReport(results);
  
  // Save report to file
  const reportDir = path.join(__dirname, 'reports', 'output');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  fs.writeFileSync(
    path.join(reportDir, `report-${dateStr}.txt`),
    report.text
  );
  fs.writeFileSync(
    path.join(reportDir, `report-${dateStr}.html`),
    report.html
  );
  fs.writeFileSync(
    path.join(reportDir, `report-${dateStr}.json`),
    report.json
  );
  
  console.log(`✅ Reports saved to ${reportDir}`);
  
  // Print text report to console
  console.log(report.text);
  
  // Send email if requested
  if (options.sendEmail) {
    console.log('');
    console.log('📧 Sending Email Report...');
    console.log('─'.repeat(50));
    
    const emailSender = new EmailSender({
      to: config.settings.alertEmail,
      backupTo: config.settings.backupEmail
    });
    
    const emailResult = await emailSender.sendMorningReport(report);
    
    if (emailResult.success) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log(`❌ Email failed: ${emailResult.error}`);
    }
  }
  
  // Final summary
  console.log('');
  console.log('═'.repeat(50));
  console.log('🦎 QA Iguana Agent - Check Complete');
  console.log('═'.repeat(50));
  
  // Determine exit code based on results
  const sslHealthy = !results.ssl || results.ssl.allHealthy;
  const uptimeHealthy = !results.uptime || results.uptime.allHealthy;
  const linksHealthy = !results.links || results.links.allHealthy;
  const allHealthy = sslHealthy && uptimeHealthy && linksHealthy;
  
  if (allHealthy) {
    console.log('✅ All systems healthy!');
    process.exit(0);
  } else {
    console.log('⚠️ Issues detected - check report for details');
    if (actionsUrl) {
      console.log(`📋 Full logs: ${actionsUrl}`);
    }
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
