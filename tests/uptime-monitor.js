/**
 * 🦎 QA Iguana Agent - Uptime Monitor
 * Checks if sites are up and measures response time
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class UptimeMonitor {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.warningThreshold = options.warningThreshold || 2000;
    this.criticalThreshold = options.criticalThreshold || 5000;
  }

  /**
   * Check if a URL is up and measure response time
   * @param {string} urlString - The URL to check
   * @returns {Promise<object>} Uptime check result
   */
  async checkSite(urlString) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      try {
        const url = new URL(urlString);
        const protocol = url.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          timeout: this.timeout,
          headers: {
            'User-Agent': 'QA-Iguana-Agent/1.0'
          }
        };

        const req = protocol.request(options, (res) => {
          const responseTime = Date.now() - startTime;
          
          // Read body to complete the request
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const isUp = res.statusCode >= 200 && res.statusCode < 400;
            
            let status = 'ok';
            if (!isUp) {
              status = 'down';
            } else if (responseTime >= this.criticalThreshold) {
              status = 'critical';
            } else if (responseTime >= this.warningThreshold) {
              status = 'warning';
            }

            resolve({
              url: urlString,
              hostname: url.hostname,
              isUp,
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              responseTime,
              responseTimeFormatted: this.formatResponseTime(responseTime),
              status,
              contentLength: body.length,
              headers: {
                server: res.headers['server'],
                contentType: res.headers['content-type']
              },
              timestamp: new Date().toISOString()
            });
          });
        });

        req.on('error', (error) => {
          const responseTime = Date.now() - startTime;
          resolve({
            url: urlString,
            hostname: url.hostname,
            isUp: false,
            error: error.message,
            errorCode: error.code,
            responseTime,
            status: 'down',
            timestamp: new Date().toISOString()
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const responseTime = Date.now() - startTime;
          resolve({
            url: urlString,
            hostname: url.hostname,
            isUp: false,
            error: 'Connection timeout',
            responseTime,
            status: 'down',
            timestamp: new Date().toISOString()
          });
        });

        req.end();
      } catch (error) {
        resolve({
          url: urlString,
          isUp: false,
          error: error.message,
          status: 'error',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Check multiple pages for a site
   * @param {object} site - Site configuration object
   * @returns {Promise<object>} Site check results with all pages
   */
  async checkSitePages(site) {
    const results = {
      siteId: site.id,
      siteName: site.name,
      baseUrl: site.url,
      pages: [],
      overallStatus: 'ok',
      timestamp: new Date().toISOString()
    };

    // Check main URL
    const mainResult = await this.checkSite(site.url);
    mainResult.pageName = 'Main';
    results.pages.push(mainResult);

    // Check additional pages if configured
    if (site.pages && site.pages.length > 0) {
      for (const page of site.pages) {
        const pageUrl = new URL(page.path, site.url).toString();
        console.log(`  📄 Checking page: ${page.name} (${page.path})`);
        const pageResult = await this.checkSite(pageUrl);
        pageResult.pageName = page.name;
        pageResult.pagePath = page.path;
        results.pages.push(pageResult);
      }
    }

    // Determine overall status
    const statuses = results.pages.map(p => p.status);
    if (statuses.includes('down') || statuses.includes('error')) {
      results.overallStatus = 'down';
    } else if (statuses.includes('critical')) {
      results.overallStatus = 'critical';
    } else if (statuses.includes('warning')) {
      results.overallStatus = 'warning';
    }

    // Calculate average response time
    const validTimes = results.pages.filter(p => p.responseTime).map(p => p.responseTime);
    results.avgResponseTime = validTimes.length > 0 
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : null;

    return results;
  }

  /**
   * Check uptime for multiple sites
   * @param {Array<object>} sites - Array of site objects
   * @returns {Promise<Array<object>>} Array of uptime check results
   */
  async checkMultipleSites(sites) {
    const results = [];
    
    for (const site of sites) {
      console.log(`⬆️ Checking uptime: ${site.name}`);
      const result = await this.checkSitePages(site);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Generate uptime report summary
   * @param {Array<object>} results - Uptime check results
   * @returns {object} Summary report
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      up: results.filter(r => r.overallStatus === 'ok' || r.overallStatus === 'warning').length,
      down: results.filter(r => r.overallStatus === 'down' || r.overallStatus === 'error').length,
      slow: results.filter(r => r.overallStatus === 'warning' || r.overallStatus === 'critical').length,
      details: results,
      timestamp: new Date().toISOString()
    };

    summary.allHealthy = summary.down === 0;
    summary.uptimePercentage = Math.round((summary.up / summary.total) * 100);
    
    return summary;
  }

  /**
   * Format response time for display
   * @param {number} ms - Response time in milliseconds
   * @returns {string} Formatted string
   */
  formatResponseTime(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Format result for display
   * @param {object} result - Site check result
   * @returns {string} Formatted string
   */
  formatResult(result) {
    const icons = {
      ok: '✅',
      warning: '⚠️',
      critical: '🔴',
      down: '❌',
      error: '❌'
    };

    const icon = icons[result.overallStatus] || '❓';
    
    let message = `${icon} ${result.siteName}: `;
    
    if (result.overallStatus === 'down' || result.overallStatus === 'error') {
      const failedPages = result.pages.filter(p => !p.isUp);
      message += `DOWN (${failedPages.length} page(s) failed)`;
    } else {
      message += `UP | Avg: ${this.formatResponseTime(result.avgResponseTime)}`;
    }
    
    return message;
  }
}

// Export for use as module
module.exports = UptimeMonitor;

// Run standalone if executed directly
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  async function main() {
    console.log('🦎 QA Iguana Agent - Uptime Monitor');
    console.log('====================================\n');
    
    // Load sites config
    const configPath = path.join(__dirname, '..', 'config', 'sites.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const monitor = new UptimeMonitor({
      warningThreshold: config.settings.thresholds.responseTimeWarning,
      criticalThreshold: config.settings.thresholds.responseTimeCritical
    });
    
    // Filter sites that have uptime check enabled
    const sitesToCheck = config.sites.filter(site => site.checks.uptime);
    
    const results = await monitor.checkMultipleSites(sitesToCheck);
    const summary = monitor.generateSummary(results);
    
    console.log('\n📊 Results:');
    console.log('===========\n');
    
    results.forEach(result => {
      console.log(monitor.formatResult(result));
      
      // Show page details if there are issues
      if (result.overallStatus !== 'ok') {
        result.pages.forEach(page => {
          const pageIcon = page.isUp ? '  ✓' : '  ✗';
          console.log(`${pageIcon} ${page.pageName}: ${page.isUp ? page.statusCode : page.error}`);
        });
      }
    });
    
    console.log('\n📈 Summary:');
    console.log('===========');
    console.log(`Total sites: ${summary.total}`);
    console.log(`Sites up: ${summary.up}`);
    console.log(`Sites down: ${summary.down}`);
    console.log(`Slow sites: ${summary.slow}`);
    console.log(`Uptime: ${summary.uptimePercentage}%`);
    console.log(`\nAll healthy: ${summary.allHealthy ? '✅ Yes' : '❌ No'}`);
    
    return summary;
  }
  
  main().catch(console.error);
}
