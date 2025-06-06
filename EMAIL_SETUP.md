# Email Notification Setup Guide

This guide explains how to configure email notifications for the Crypto Intelligence Engine.

## Environment Variables

Add the following environment variables to your `.env` file in the server directory:

```env
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
```

## Supported Email Providers

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
3. **Configure Environment Variables**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@your-domain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@your-domain.com
```

## Email Templates

The system includes beautiful HTML email templates for:

- **Individual Notifications**: Price alerts, trading signals, news updates
- **Digest Emails**: Daily/weekly summaries of all notifications
- **Test Emails**: Verify email configuration

### Template Features

- Responsive design for mobile and desktop
- Priority-based styling (critical, high, medium, low)
- Type-specific icons and colors
- Personalized content with user name
- Action buttons for relevant notifications
- Unsubscribe and settings links

## Testing Email Notifications

1. **Check Email Service Status**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:5001/api/notifications/email/status
   ```

2. **Send Test Email**:
   - Use the notification settings page in the web app
   - Click "Test Email Notification" button
   - Or use the API directly:
   ```bash
   curl -X POST \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"testEmail": true}' \
        http://localhost:5001/api/notifications/email/test
   ```

## Email Notification Types

### Price Alerts
- Triggered when cryptocurrency prices hit user-defined thresholds
- Includes price change percentage and current value
- Critical priority for significant movements

### Trading Signals
- Generated by AI analysis of market data
- Includes signal strength and recommended actions
- Priority based on signal confidence

### News Updates
- Important cryptocurrency news affecting user's portfolio
- Sentiment analysis and impact assessment
- Grouped by relevance and time

### System Notifications
- Account security alerts
- System maintenance notices
- Feature updates and announcements

## Privacy and Security

- All emails are sent securely over encrypted connections
- Email addresses are never shared with third parties
- Users can unsubscribe at any time
- GDPR compliant data handling

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check that all SMTP environment variables are set
   - Verify SMTP credentials are correct
   - Ensure SMTP_HOST is accessible from your server

2. **"Authentication failed"**
   - For Gmail: Use app password, not regular password
   - Check if 2-factor authentication is enabled
   - Verify username and password are correct

3. **"Connection timeout"**
   - Check SMTP_HOST and SMTP_PORT values
   - Verify firewall allows outbound SMTP connections
   - Try different SMTP_SECURE settings (true/false)

4. **Emails not received**
   - Check spam/junk folder
   - Verify recipient email address
   - Check email provider's delivery logs

### Debug Logs

Enable debug logging to troubleshoot email issues:

```bash
# Check server logs for email-related messages
tail -f server/logs/app.log | grep -i email
```

### Test SMTP Connection

You can test SMTP connectivity manually:

```javascript
// In node.js REPL or test script
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP Error:', error);
  } else {
    console.log('SMTP Server ready');
  }
});
```

## Production Considerations

### Security
- Use environment variables for all sensitive data
- Consider using dedicated email service (SendGrid, AWS SES)
- Implement rate limiting to prevent abuse
- Monitor email delivery rates and bounces

### Performance
- Use email queues for high-volume sending
- Implement retry logic for failed deliveries
- Cache email templates for better performance
- Monitor SMTP connection pools

### Compliance
- Include unsubscribe links in all emails
- Respect user notification preferences
- Implement GDPR data deletion requests
- Log email activities for audit purposes

## Support

For additional help with email configuration:

1. Check the server logs for specific error messages
2. Test with a simple email provider like Gmail first
3. Verify all environment variables are properly set
4. Contact your email provider for specific SMTP settings 