/**
 * 🦎 QA Iguana Agent - Email Sender
 * Sends reports via email using Nodemailer
 */

const nodemailer = require('nodemailer');

class EmailSender {
  constructor(options = {}) {
    this.transporter = null;
    this.from = options.from || process.env.SMTP_USER;
    this.to = options.to || process.env.ALERT_EMAIL;
    this.backupTo = options.backupTo || process.env.BACKUP_EMAIL;
    
    this.initTransporter();
  }

  /**
   * Initialize the email transporter
   */
  initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn('⚠️ Email credentials not configured. Emails will not be sent.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  /**
   * Send an email
   * @param {object} options - Email options
   * @returns {Promise<object>} Send result
   */
  async send(options) {
    if (!this.transporter) {
      console.warn('⚠️ Email transporter not configured');
      return { success: false, error: 'Transporter not configured' };
    }

    try {
      const mailOptions = {
        from: `"🦎 QA Iguana" <${this.from}>`,
        to: options.to || this.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${result.messageId}`);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send the morning report
   * @param {object} report - Report object with text and html properties
   * @returns {Promise<object>} Send result
   */
  async sendMorningReport(report) {
    const data = report.data || {};
    const isHealthy = data.allHealthy !== undefined ? data.allHealthy : !report.hasIssues;
    const criticalIssues = data.criticalIssues || [];
    const warnings = data.warnings || [];
    const criticalCount = criticalIssues.length;
    const warningCount = warnings.length;

    let subjectEmoji = '✅';
    let subjectStatus = 'All Systems OK';

    if (criticalCount > 0) {
      subjectEmoji = '🚨';
      subjectStatus = `${criticalCount} Critical Issue(s)!`;
    } else if (warningCount > 0) {
      subjectEmoji = '⚠️';
      subjectStatus = `${warningCount} Warning(s)`;
    } else if (!isHealthy) {
      subjectEmoji = '⚠️';
      subjectStatus = 'Issues Detected';
    }

    const timestamp = data.timestamp || new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const subject = `${subjectEmoji} QA Iguana Report - ${subjectStatus} - ${timestamp}`;

    return this.send({
      subject,
      text: report.text,
      html: report.html
    });
  }

  /**
   * Send an urgent alert
   * @param {string} message - Alert message
   * @param {string} site - Site name
   * @returns {Promise<object>} Send result
   */
  async sendUrgentAlert(message, site) {
    const subject = `🚨 URGENT: ${site} - Immediate Action Required!`;
    
    const html = `
      <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px;">
        <h1>🚨 Urgent Alert</h1>
        <p><strong>Site:</strong> ${site}</p>
        <p><strong>Issue:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p>
        <p style="margin-top: 20px; font-size: 14px;">
          This is an automated alert from QA Iguana Agent.
        </p>
      </div>
    `;

    // Send to both primary and backup email for urgent alerts
    const recipients = [this.to, this.backupTo].filter(Boolean).join(', ');

    return this.send({
      to: recipients,
      subject,
      text: `URGENT ALERT\n\nSite: ${site}\nIssue: ${message}\n\nImmediate action required!`,
      html
    });
  }

  /**
   * Test the email configuration
   * @returns {Promise<object>} Test result
   */
  async testConnection() {
    if (!this.transporter) {
      return { success: false, error: 'Transporter not configured' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email configuration verified');
      return { success: true };
    } catch (error) {
      console.error(`❌ Email verification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailSender;
