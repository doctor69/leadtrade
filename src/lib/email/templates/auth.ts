/**
 * Authentication Email Templates
 */

export function getWelcomeEmailTemplate(userName: string, verificationUrl?: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Welcome to LeadTrade</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">Welcome to LeadTrade! Your account has been successfully created.</p>
    
    ${verificationUrl ? `
    <p style="font-size: 16px;">Please verify your email address by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:<br>
    <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a></p>
    ` : ''}
    
    <p style="font-size: 16px;">You can now start trading, follow successful traders, and build your portfolio.</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't create this account, please ignore this email.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Welcome to LeadTrade!

Hi ${userName},

Welcome to LeadTrade! Your account has been successfully created.

${verificationUrl ? `Please verify your email address by visiting: ${verificationUrl}\n\n` : ''}

You can now start trading, follow successful traders, and build your portfolio.

If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}

export function getPasswordResetTemplate(userName: string, resetUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Password Reset</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">We received a request to reset your password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:<br>
    <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a></p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 1 hour.</p>
    
    <p style="font-size: 14px; color: #666;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Password Reset

Hi ${userName},

We received a request to reset your password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}

export function getEmailVerificationTemplate(userName: string, verificationUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">Please verify your email address to complete your LeadTrade account setup:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:<br>
    <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a></p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't create this account, please ignore this email.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Verify Your Email

Hi ${userName},

Please verify your email address to complete your LeadTrade account setup:

${verificationUrl}

If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}
