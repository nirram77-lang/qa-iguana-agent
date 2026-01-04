/**
 * 🦎 QA Iguana Agent - SSL Certificate Checker
 * Checks SSL certificates for all configured sites
 */

const https = require('https');
const { URL } = require('url');

class SSLChecker {
  constructor(options = {}) {
    this.warningDays = options.warningDays || 30;
    this.criticalDays = options.criticalDays || 7;
  }

  /**
   * Check SSL certificate for a single URL
   * @param {string} urlString - The URL to check
   * @returns {Promise<object>} SSL check result
   */
  async checkCertificate(urlString) {
    return new Promise((resolve) => {
      try {
        const url = new URL(urlString);
        
        if (url.protocol !== 'https:') {
          resolve({
            url: urlString,
            valid: false,
            error: 'Not HTTPS',
            status: 'error'
          });
          return;
        }

        const options = {
          hostname: url.hostname,
          port: 443,
          method: 'HEAD',
          rejectUnauthorized: false, // Allow checking invalid certs
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          const cert = res.socket.getPeerCertificate();
          
          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              url: urlString,
              hostname: url.hostname,
              valid: false,
              error: 'No certificate found',
              status: 'error'
            });
            return;
          }

          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
          
          const isExpired = now > validTo;
          const isNotYetValid = now < validFrom;
          const isValid = !isExpired && !isNotYetValid && res.socket.authorized !== false;

          let status = 'ok';
          if (isExpired || isNotYetValid) {
            status = 'critical';
          } else if (daysRemaining <= this.criticalDays) {
            status = 'critical';
          } else if (daysRemaining <= this.warningDays) {
            status = 'warning';
          }

          resolve({
            url: urlString,
            hostname: url.hostname,
            valid: isValid,
            issuer: cert.issuer ? cert.issuer.O : 'Unknown',
            subject: cert.subject ? cert.subject.CN : 'Unknown',
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            daysRemaining,
            isExpired,
            status,
            fingerprint: cert.fingerprint
          });
        });

        req.on('error', (error) => {
          resolve({
            url: urlString,
            hostname: url.hostname,
            valid: false,
            error: error.message,
            status: 'error'
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            url: urlString,
            hostname: url.hostname,
            valid: false,
            error: 'Connection timeout',
            status: 'error'
          });
        });

        req.end();
      } catch (error) {
        resolve({
          url: urlString,
          valid: false,
          error: error.message,
          status: 'error'
        });
      }
    });
  }

  /**
   * Check SSL certificates for multiple sites
   * @param {Array<object>} sites - Array of site objects with url property
   * @returns {Promise<Array<object>>} Array of SSL check results
   */
  async checkMultipleSites(sites) {
    const results = [];
    
    for (const site of sites) {
      console.log(`🔐 Checking SSL: ${site.name || site.url}`);
      const result = await this.checkCertificate(site.url);
      result.siteName = site.name;
      result.siteId = site.id;
      results.push(result);
    }
    
    return results;
  }

  /**
   * Generate SSL report summary
   * @param {Array<object>} results - SSL check results
   * @returns {object} Summary report
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      expiringSoon: results.filter(r => r.status === 'warning').length,
      critical: results.filter(r => r.status === 'critical').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results
    };

    summary.allHealthy = summary.invalid === 0 && summary.critical === 0 && summary.errors === 0;
    
    return summary;
  }

  /**
   * Format result for display
   * @param {object} result - Single SSL check result
   * @returns {string} Formatted string
   */
  formatResult(result) {
    const icons = {
      ok: '✅',
      warning: '⚠️',
      critical: '🔴',
      error: '❌'
    };

    const icon = icons[result.status] || '❓';
    
    if (result.error) {
      return `${icon} ${result.siteName || result.hostname}: ${result.error}`;
    }
    
    let message = `${icon} ${result.siteName || result.hostname}: `;
    
    if (result.valid) {
      message += `Valid (${result.daysRemaining} days remaining)`;
    } else if (result.isExpired) {
      message += `EXPIRED!`;
    } else {
      message += `Invalid`;
    }
    
    return message;
  }
}

// Export for use as module
module.exports = SSLChecker;

// Run standalone if executed directly
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  async function main() {
    console.log('🦎 QA Iguana Agent - SSL Certificate Check');
    console.log('==========================================\n');
    
    // Load sites config
    const configPath = path.join(__dirname, '..', 'config', 'sites.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const checker = new SSLChecker({
      warningDays: config.settings.thresholds.sslExpiryWarning,
      criticalDays: config.settings.thresholds.sslExpiryCritical
    });
    
    // Filter sites that have SSL check enabled
    const sitesToCheck = config.sites.filter(site => site.checks.ssl);
    
    const results = await checker.checkMultipleSites(sitesToCheck);
    const summary = checker.generateSummary(results);
    
    console.log('\n📊 Results:');
    console.log('===========\n');
    
    results.forEach(result => {
      console.log(checker.formatResult(result));
    });
    
    console.log('\n📈 Summary:');
    console.log('===========');
    console.log(`Total sites checked: ${summary.total}`);
    console.log(`Valid certificates: ${summary.valid}`);
    console.log(`Expiring soon (< ${checker.warningDays} days): ${summary.expiringSoon}`);
    console.log(`Critical (< ${checker.criticalDays} days): ${summary.critical}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`\nAll healthy: ${summary.allHealthy ? '✅ Yes' : '❌ No'}`);
    
    // Return results for use in other scripts
    return summary;
  }
  
  main().catch(console.error);
}
