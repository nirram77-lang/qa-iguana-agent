/**
 * 🦎 QA Iguana Agent - Link Validator
 * Checks for broken links on all configured sites
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class LinkValidator {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.maxDepth = options.maxDepth || 1;
    this.checkedUrls = new Set();
  }

  /**
   * Fetch page content
   * @param {string} urlString - URL to fetch
   * @returns {Promise<object>} Page content and status
   */
  async fetchPage(urlString) {
    return new Promise((resolve) => {
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
            'User-Agent': 'QA-Iguana-Agent/1.0',
            'Accept': 'text/html,application/xhtml+xml'
          }
        };

        const req = protocol.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            resolve({
              url: urlString,
              statusCode: res.statusCode,
              isOk: res.statusCode >= 200 && res.statusCode < 400,
              body,
              contentType: res.headers['content-type']
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            url: urlString,
            statusCode: 0,
            isOk: false,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            url: urlString,
            statusCode: 0,
            isOk: false,
            error: 'Timeout'
          });
        });

        req.end();
      } catch (error) {
        resolve({
          url: urlString,
          statusCode: 0,
          isOk: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Check if a URL is accessible (HEAD request)
   * @param {string} urlString - URL to check
   * @returns {Promise<object>} Link check result
   */
  async checkLink(urlString) {
    return new Promise((resolve) => {
      try {
        const url = new URL(urlString);
        const protocol = url.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'HEAD',
          timeout: this.timeout,
          headers: {
            'User-Agent': 'QA-Iguana-Agent/1.0'
          }
        };

        const req = protocol.request(options, (res) => {
          const isOk = res.statusCode >= 200 && res.statusCode < 400;
          resolve({
            url: urlString,
            statusCode: res.statusCode,
            isOk,
            isRedirect: res.statusCode >= 300 && res.statusCode < 400,
            redirectTo: res.headers['location']
          });
        });

        req.on('error', (error) => {
          resolve({
            url: urlString,
            statusCode: 0,
            isOk: false,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            url: urlString,
            statusCode: 0,
            isOk: false,
            error: 'Timeout'
          });
        });

        req.end();
      } catch (error) {
        resolve({
          url: urlString,
          statusCode: 0,
          isOk: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Extract links from HTML content
   * @param {string} html - HTML content
   * @param {string} baseUrl - Base URL for relative links
   * @returns {Array<object>} Array of link objects
   */
  extractLinks(html, baseUrl) {
    const links = [];
    const base = new URL(baseUrl);
    
    // Match href attributes
    const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      
      // Skip anchors, javascript, mailto, tel
      if (href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:')) {
        continue;
      }
      
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        links.push({
          href,
          absoluteUrl,
          isExternal: new URL(absoluteUrl).hostname !== base.hostname
        });
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    // Match src attributes (images, scripts)
    const srcRegex = /src\s*=\s*["']([^"']+)["']/gi;
    
    while ((match = srcRegex.exec(html)) !== null) {
      const src = match[1];
      
      // Skip data URLs and blobs
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        continue;
      }
      
      try {
        const absoluteUrl = new URL(src, baseUrl).toString();
        links.push({
          href: src,
          absoluteUrl,
          isExternal: new URL(absoluteUrl).hostname !== base.hostname,
          isResource: true
        });
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    return links;
  }

  /**
   * Validate all links on a page
   * @param {string} pageUrl - Page URL to scan
   * @param {boolean} checkExternal - Whether to check external links
   * @returns {Promise<object>} Validation results
   */
  async validatePageLinks(pageUrl, checkExternal = false) {
    console.log(`  🔗 Scanning links on: ${pageUrl}`);
    
    const pageResult = await this.fetchPage(pageUrl);
    
    if (!pageResult.isOk) {
      return {
        pageUrl,
        error: pageResult.error || `HTTP ${pageResult.statusCode}`,
        links: [],
        brokenLinks: []
      };
    }
    
    const links = this.extractLinks(pageResult.body, pageUrl);
    const uniqueLinks = [...new Map(links.map(l => [l.absoluteUrl, l])).values()];
    
    console.log(`    Found ${uniqueLinks.length} unique links`);
    
    const results = {
      pageUrl,
      totalLinks: uniqueLinks.length,
      checkedLinks: 0,
      validLinks: 0,
      brokenLinks: [],
      redirects: [],
      skippedExternal: 0
    };
    
    for (const link of uniqueLinks) {
      // Skip already checked URLs
      if (this.checkedUrls.has(link.absoluteUrl)) {
        continue;
      }
      
      // Skip external links if not requested
      if (link.isExternal && !checkExternal) {
        results.skippedExternal++;
        continue;
      }
      
      this.checkedUrls.add(link.absoluteUrl);
      results.checkedLinks++;
      
      const linkResult = await this.checkLink(link.absoluteUrl);
      
      if (linkResult.isOk) {
        results.validLinks++;
        if (linkResult.isRedirect) {
          results.redirects.push({
            from: link.absoluteUrl,
            to: linkResult.redirectTo,
            statusCode: linkResult.statusCode
          });
        }
      } else {
        results.brokenLinks.push({
          url: link.absoluteUrl,
          foundOn: pageUrl,
          href: link.href,
          statusCode: linkResult.statusCode,
          error: linkResult.error
        });
      }
    }
    
    return results;
  }

  /**
   * Validate links for a site
   * @param {object} site - Site configuration
   * @returns {Promise<object>} Site validation results
   */
  async validateSite(site) {
    console.log(`🔗 Validating links: ${site.name}`);
    
    this.checkedUrls.clear();
    
    const results = {
      siteId: site.id,
      siteName: site.name,
      baseUrl: site.url,
      pages: [],
      totalBrokenLinks: 0,
      allBrokenLinks: [],
      timestamp: new Date().toISOString()
    };
    
    // Check main page
    const mainResult = await this.validatePageLinks(site.url);
    mainResult.pageName = 'Main';
    results.pages.push(mainResult);
    results.allBrokenLinks.push(...mainResult.brokenLinks);
    
    // Check additional pages
    if (site.pages && site.pages.length > 0) {
      for (const page of site.pages) {
        if (page.path === '/') continue; // Skip if already checked main
        
        const pageUrl = new URL(page.path, site.url).toString();
        const pageResult = await this.validatePageLinks(pageUrl);
        pageResult.pageName = page.name;
        results.pages.push(pageResult);
        results.allBrokenLinks.push(...pageResult.brokenLinks);
      }
    }
    
    results.totalBrokenLinks = results.allBrokenLinks.length;
    results.status = results.totalBrokenLinks === 0 ? 'ok' : 'warning';
    
    return results;
  }

  /**
   * Validate links for multiple sites
   * @param {Array<object>} sites - Array of site configurations
   * @returns {Promise<Array<object>>} Array of validation results
   */
  async validateMultipleSites(sites) {
    const results = [];
    
    for (const site of sites) {
      const result = await this.validateSite(site);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Generate summary report
   * @param {Array<object>} results - Validation results
   * @returns {object} Summary
   */
  generateSummary(results) {
    const allBroken = results.flatMap(r => r.allBrokenLinks);
    
    return {
      totalSites: results.length,
      sitesWithBrokenLinks: results.filter(r => r.totalBrokenLinks > 0).length,
      totalBrokenLinks: allBroken.length,
      brokenLinks: allBroken,
      allHealthy: allBroken.length === 0,
      details: results
    };
  }

  /**
   * Format result for display
   * @param {object} result - Site validation result
   * @returns {string} Formatted string
   */
  formatResult(result) {
    const icon = result.totalBrokenLinks === 0 ? '✅' : '⚠️';
    return `${icon} ${result.siteName}: ${result.totalBrokenLinks} broken links`;
  }
}

// Export for use as module
module.exports = LinkValidator;

// Run standalone if executed directly
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  async function main() {
    console.log('🦎 QA Iguana Agent - Link Validator');
    console.log('====================================\n');
    
    // Load sites config
    const configPath = path.join(__dirname, '..', 'config', 'sites.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const validator = new LinkValidator();
    
    // Filter sites that have link validation enabled
    const sitesToCheck = config.sites.filter(site => site.checks.links);
    
    const results = await validator.validateMultipleSites(sitesToCheck);
    const summary = validator.generateSummary(results);
    
    console.log('\n📊 Results:');
    console.log('===========\n');
    
    results.forEach(result => {
      console.log(validator.formatResult(result));
      
      if (result.totalBrokenLinks > 0) {
        result.allBrokenLinks.forEach(link => {
          console.log(`  ❌ ${link.href} → ${link.error || link.statusCode}`);
        });
      }
    });
    
    console.log('\n📈 Summary:');
    console.log('===========');
    console.log(`Total sites checked: ${summary.totalSites}`);
    console.log(`Sites with broken links: ${summary.sitesWithBrokenLinks}`);
    console.log(`Total broken links: ${summary.totalBrokenLinks}`);
    console.log(`\nAll healthy: ${summary.allHealthy ? '✅ Yes' : '⚠️ No'}`);
    
    return summary;
  }
  
  main().catch(console.error);
}
