import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { User } from '../models';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailNotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'price_alert' | 'signal' | 'news' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
  actionUrl?: string;
}

/**
 * Email Service for sending notification emails
 */
export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize email transporter
   */
  private async initializeTransporter(): Promise<void> {
    try {
      // Check for email configuration
      const emailConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      // Validate configuration
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn('Email service not configured. Email notifications will be disabled.');
        logger.info('To enable email notifications, set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables');
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
      }
      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      logger.warn('Email notifications will be disabled');
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is configured and ready
   */
  public isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send notification email
   */
  public async sendNotificationEmail(emailData: EmailNotificationData): Promise<boolean> {
    try {
      if (!this.isReady()) {
        logger.debug('Email service not ready, skipping email notification');
        return false;
      }

      // Get user information
      const user = await User.findByPk(emailData.userId);
      if (!user) {
        logger.error(`User not found for email notification: ${emailData.userId}`);
        return false;
      }

      // Generate email template
      const template = this.generateEmailTemplate(emailData, user);

      // Send email
      const mailOptions = {
        from: `"Crypto Intelligence Engine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'X-Notification-ID': uuidv4(),
          'X-Notification-Type': emailData.type,
          'X-Priority': this.mapPriorityToHeader(emailData.priority),
        },
      };

      const result = await this.transporter!.sendMail(mailOptions);
      logger.info(`Email notification sent successfully to ${user.email}: ${template.subject}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      return false;
    }
  }

  /**
   * Send digest email with multiple notifications
   */
  public async sendDigestEmail(
    userId: string,
    notifications: EmailNotificationData[],
    period: 'hourly' | 'daily' | 'weekly'
  ): Promise<boolean> {
    try {
      if (!this.isReady()) {
        logger.debug('Email service not ready, skipping digest email');
        return false;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        logger.error(`User not found for digest email: ${userId}`);
        return false;
      }

      const template = this.generateDigestTemplate(notifications, period, user);

      const mailOptions = {
        from: `"Crypto Intelligence Engine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'X-Notification-ID': uuidv4(),
          'X-Notification-Type': 'digest',
          'X-Digest-Period': period,
        },
      };

      await this.transporter!.sendMail(mailOptions);
      logger.info(`Digest email sent successfully to ${user.email} for ${period} period`);
      return true;
    } catch (error) {
      logger.error('Failed to send digest email:', error);
      return false;
    }
  }

  /**
   * Generate email template for single notification
   */
  private generateEmailTemplate(emailData: EmailNotificationData, user: User): EmailTemplate {
    const { title, message, type, priority, actionUrl } = emailData;
    
    const priorityEmoji = this.getPriorityEmoji(priority);
    const typeEmoji = this.getTypeEmoji(type);
    
    const subject = `${priorityEmoji} ${title} - Crypto Intelligence Engine`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .notification-card { background-color: #f8fafc; border-left: 4px solid ${this.getPriorityColor(priority)}; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .priority-${priority} { border-left-color: ${this.getPriorityColor(priority)}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${typeEmoji} Crypto Intelligence Engine</h1>
            <p>Real-time cryptocurrency monitoring and alerts</p>
        </div>
        <div class="content">
            <h2>Hello ${user.name || 'User'}!</h2>
            <div class="notification-card priority-${priority}">
                <h3 style="margin-top: 0; color: #1e293b;">${priorityEmoji} ${title}</h3>
                <p style="color: #475569; line-height: 1.6;">${message}</p>
                ${emailData.data ? `
                <div style="margin-top: 15px; padding: 10px; background-color: #e2e8f0; border-radius: 4px;">
                    <strong>Additional Details:</strong><br>
                    ${this.formatEmailData(emailData.data)}
                </div>
                ` : ''}
            </div>
            ${actionUrl ? `
            <p style="text-align: center;">
                <a href="${actionUrl}" class="button">View Details</a>
            </p>
            ` : ''}
            <p style="color: #64748b; font-size: 14px;">
                This notification was sent because you have email notifications enabled for ${type.replace('_', ' ')} alerts.
                You can manage your notification preferences in your account settings.
            </p>
        </div>
        <div class="footer">
            <p>&copy; 2025 Crypto Intelligence Engine. All rights reserved.</p>
            <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings">Notification Settings</a> |
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${title}

${message}

${emailData.data ? `Additional Details: ${JSON.stringify(emailData.data, null, 2)}` : ''}

${actionUrl ? `View Details: ${actionUrl}` : ''}

---
Crypto Intelligence Engine
${process.env.FRONTEND_URL || 'http://localhost:3000'}
`;

    return { subject, html, text };
  }

  /**
   * Generate digest email template
   */
  private generateDigestTemplate(
    notifications: EmailNotificationData[],
    period: string,
    user: User
  ): EmailTemplate {
    const subject = `Your ${period} crypto alerts digest - ${notifications.length} notifications`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Alerts Digest</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .notification-item { background-color: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #4f46e5; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Crypto Alerts Digest</h1>
            <p>${period.charAt(0).toUpperCase() + period.slice(1)} Summary</p>
        </div>
        <div class="content">
            <h2>Hello ${user.name || 'User'}!</h2>
            <p>Here's your ${period} summary of cryptocurrency alerts and notifications:</p>
            
            <div class="stats">
                <div class="stat">
                    <h3>${notifications.length}</h3>
                    <p>Total Alerts</p>
                </div>
                <div class="stat">
                    <h3>${notifications.filter(n => n.priority === 'high' || n.priority === 'critical').length}</h3>
                    <p>High Priority</p>
                </div>
                <div class="stat">
                    <h3>${notifications.filter(n => n.type === 'price_alert').length}</h3>
                    <p>Price Alerts</p>
                </div>
            </div>

            ${notifications.map(notification => `
            <div class="notification-item">
                <h4 style="margin: 0 0 10px 0; color: #1e293b;">
                    ${this.getPriorityEmoji(notification.priority)} ${notification.title}
                </h4>
                <p style="margin: 0; color: #475569; font-size: 14px;">${notification.message}</p>
            </div>
            `).join('')}

            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                You can manage your notification preferences and digest frequency in your account settings.
            </p>
        </div>
        <div class="footer">
            <p>&copy; 2025 Crypto Intelligence Engine. All rights reserved.</p>
            <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings">Notification Settings</a> |
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Crypto Alerts Digest - ${period.charAt(0).toUpperCase() + period.slice(1)} Summary

Hello ${user.name || 'User'}!

You received ${notifications.length} notifications in the last ${period}:

${notifications.map((n, i) => `
${i + 1}. ${n.title}
   ${n.message}
   Priority: ${n.priority} | Type: ${n.type}
`).join('\n')}

---
Crypto Intelligence Engine
${process.env.FRONTEND_URL || 'http://localhost:3000'}
`;

    return { subject, html, text };
  }

  /**
   * Format additional email data
   */
  private formatEmailData(data: any): string {
    if (!data) return '';
    
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
    }
    
    return String(data);
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return 'ℹ️';
      default: return '📊';
    }
  }

  /**
   * Get type emoji
   */
  private getTypeEmoji(type: string): string {
    switch (type) {
      case 'price_alert': return '💰';
      case 'signal': return '📈';
      case 'news': return '📰';
      case 'system': return '⚙️';
      default: return '📊';
    }
  }

  /**
   * Get priority color
   */
  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#4f46e5';
      case 'low': return '#059669';
      default: return '#4f46e5';
    }
  }

  /**
   * Map priority to email header
   */
  private mapPriorityToHeader(priority: string): string {
    switch (priority) {
      case 'critical': return '1 (Highest)';
      case 'high': return '2 (High)';
      case 'medium': return '3 (Normal)';
      case 'low': return '4 (Low)';
      default: return '3 (Normal)';
    }
  }

  /**
   * Send test email
   */
  public async sendTestEmail(userEmail: string, userName?: string): Promise<boolean> {
    try {
      if (!this.isReady()) {
        logger.debug('Email service not ready, skipping test email');
        return false;
      }

      const mailOptions = {
        from: `"Crypto Intelligence Engine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject: '🧪 Test Email - Crypto Intelligence Engine',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
        .header { text-align: center; color: #4f46e5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Email Successful!</h1>
        </div>
        <p>Hello ${userName || 'User'}!</p>
        <p>This is a test email to verify that your email notification settings are working correctly.</p>
        <p>You will receive notifications for:</p>
        <ul>
            <li>🚨 Critical price alerts</li>
            <li>📈 Trading signals</li>
            <li>📰 Important news updates</li>
            <li>⚙️ System notifications</li>
        </ul>
        <p>You can manage your notification preferences in the settings page.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
            Crypto Intelligence Engine<br>
            Real-time cryptocurrency monitoring and alerts
        </p>
    </div>
</body>
</html>`,
        text: `
Test Email - Crypto Intelligence Engine

Hello ${userName || 'User'}!

This is a test email to verify that your email notification settings are working correctly.

You will receive notifications for:
- Critical price alerts
- Trading signals  
- Important news updates
- System notifications

You can manage your notification preferences in the settings page.

---
Crypto Intelligence Engine
Real-time cryptocurrency monitoring and alerts
`,
      };

      await this.transporter!.sendMail(mailOptions);
      logger.info(`Test email sent successfully to ${userEmail}`);
      return true;
    } catch (error) {
      logger.error('Failed to send test email:', error);
      return false;
    }
  }
}

export default EmailService.getInstance(); 