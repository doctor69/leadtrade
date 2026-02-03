/**
 * Support Email Templates
 */

export interface SupportInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
}

export function getSupportInquiryTemplate(inquiry: SupportInquiry): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Support Inquiry Received</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${inquiry.name},</p>
    
    <p style="font-size: 16px;">Thank you for contacting LeadTrade support. We've received your inquiry and will respond within 24 hours.</p>
    
    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #667eea;">Your Message:</h3>
      <p style="margin: 0; white-space: pre-wrap;">${inquiry.message}</p>
    </div>
    
    <p style="font-size: 14px; color: #666;">Reference: ${inquiry.subject}</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">If you need immediate assistance, please reply to this email or visit our help center.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Support Inquiry Received

Hi ${inquiry.name},

Thank you for contacting LeadTrade support. We've received your inquiry and will respond within 24 hours.

Your Message:
${inquiry.message}

Reference: ${inquiry.subject}

If you need immediate assistance, please reply to this email or visit our help center.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}

export function getSupportResponseTemplate(
  userName: string,
  originalMessage: string,
  response: string
): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Support Response</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">Thank you for your patience. Here's our response to your inquiry:</p>
    
    <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; white-space: pre-wrap;">${response}</p>
    </div>
    
    <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #666; margin: 0;"><strong>Your original message:</strong></p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0 0; white-space: pre-wrap;">${originalMessage}</p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any additional questions, feel free to reply to this email.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Support Response

Hi ${userName},

Thank you for your patience. Here's our response to your inquiry:

${response}

---
Your original message:
${originalMessage}

If you have any additional questions, feel free to reply to this email.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}
