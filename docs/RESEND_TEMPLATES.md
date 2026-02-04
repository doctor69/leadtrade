# Resend Email Templates

This document describes the Resend email templates used for trading notifications in LeadTrade.

## Template Setup

Create these templates in your Resend dashboard at https://resend.com/emails/templates

### Template IDs

Update these in `supabase/functions/_shared/email-helper.ts`:

```typescript
export const RESEND_TEMPLATES = {
  LEADER_TRADE: 'leader-trade-executed',
  FOLLOWER_COPY_TRADE: 'follower-copy-trade',
}
```

## Template 1: Leader Trade Executed

**Template ID**: `leader-trade-executed`

**Subject**: `Trade Executed - {{side}} {{symbol}}`

**Description**: Sent to leaders when their trade is executed and copied to followers.

### Variables

```typescript
{
  userName: string;        // Leader's name
  symbol: string;          // Stock symbol (e.g., "AAPL")
  side: string;            // "BUY" or "SELL"
  quantity: number;        // Number of shares
  followerCount: number;   // Number of followers who copied
  sideColor: string;       // "#10b981" for buy, "#ef4444" for sell
}
```

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trade Executed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Trade Executed</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hi {{userName}},</p>
              
              <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
                Your trade has been executed and copied to <strong>{{followerCount}}</strong> follower{{#if (gt followerCount 1)}}s{{/if}}:
              </p>
              
              <!-- Trade Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px solid {{sideColor}}; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    
                    <!-- Action -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="font-weight: 600; color: #6b7280; font-size: 14px;">Action:</td>
                        <td align="right" style="font-weight: 700; color: {{sideColor}}; font-size: 20px;">{{side}}</td>
                      </tr>
                    </table>
                    
                    <!-- Symbol -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Symbol:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{symbol}}</td>
                      </tr>
                    </table>
                    
                    <!-- Quantity -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Quantity:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{quantity}}</td>
                      </tr>
                    </table>
                    
                    <!-- Followers Copied -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Followers Copied:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{followerCount}}</td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6;">
                Your followers are automatically copying your trades based on their allocation settings. You can view your complete trading history in your LeadTrade dashboard.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                <a href="https://leadtrade.app/dashboard" style="color: #667eea; text-decoration: none; font-weight: 600;">View Dashboard</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © 2026 LeadTrade. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Template 2: Follower Copy Trade

**Template ID**: `follower-copy-trade`

**Subject**: `Copy Trade Executed - {{symbol}}`

**Description**: Sent to followers when a leader's trade is copied to their account.

### Variables

```typescript
{
  followerName: string;       // Follower's name
  leaderName: string;         // Leader's name
  symbol: string;             // Stock symbol (e.g., "AAPL")
  side: string;               // "BUY" or "SELL"
  quantity: string;           // Number of shares (formatted with decimals)
  portfolioPercentage: string; // Portfolio percentage (e.g., "2.5000")
  sideColor: string;          // "#10b981" for buy, "#ef4444" for sell
}
```

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copy Trade Executed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Copy Trade Executed</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hi {{followerName}},</p>
              
              <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
                A trade from <strong>{{leaderName}}</strong> has been copied to your account:
              </p>
              
              <!-- Trade Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px solid {{sideColor}}; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    
                    <!-- Leader Badge -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center" style="background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                          <span style="font-size: 14px; color: #6b7280;">Following: <strong style="color: #111827;">{{leaderName}}</strong></span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Action -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="font-weight: 600; color: #6b7280; font-size: 14px;">Action:</td>
                        <td align="right" style="font-weight: 700; color: {{sideColor}}; font-size: 20px;">{{side}}</td>
                      </tr>
                    </table>
                    
                    <!-- Symbol -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Symbol:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{symbol}}</td>
                      </tr>
                    </table>
                    
                    <!-- Quantity -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Quantity:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{quantity}}</td>
                      </tr>
                    </table>
                    
                    <!-- Portfolio Percentage -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Portfolio %:</td>
                        <td align="right" style="font-weight: 600; color: #111827; font-size: 14px;">{{portfolioPercentage}}%</td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6;">
                You can manage your copy trading settings and view all trades in your dashboard.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                <a href="https://leadtrade.app/dashboard" style="color: #667eea; text-decoration: none; font-weight: 600;">View Dashboard</a> · 
                <a href="https://leadtrade.app/settings/copy-trading" style="color: #667eea; text-decoration: none; font-weight: 600;">Manage Settings</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © 2026 LeadTrade. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Usage in Code

### Leader Trade Notification

```typescript
import { queueEmail } from '../_shared/email-queue-helper.ts'
import { RESEND_TEMPLATES } from '../_shared/email-helper.ts'

await queueEmail({
  category: 'trading',
  to: leaderEmail,
  templateId: RESEND_TEMPLATES.LEADER_TRADE,
  templateData: {
    userName: 'John Doe',
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 100,
    followerCount: 5,
    sideColor: '#10b981', // Green for buy
  }
})
```

### Follower Copy Trade Notification

```typescript
await queueEmail({
  category: 'trading',
  to: followerEmail,
  templateId: RESEND_TEMPLATES.FOLLOWER_COPY_TRADE,
  templateData: {
    followerName: 'Jane Smith',
    leaderName: 'John Doe',
    symbol: 'AAPL',
    side: 'BUY',
    quantity: '25.000000000',
    portfolioPercentage: '2.5000',
    sideColor: '#10b981', // Green for buy
  }
})
```

## Testing Templates

### In Resend Dashboard

1. Go to https://resend.com/emails/templates
2. Create a new template
3. Use the "Send Test Email" feature
4. Provide sample variables

### In Development

```typescript
// Test leader trade email
const result = await queueEmail({
  category: 'trading',
  to: 'test@example.com',
  templateId: RESEND_TEMPLATES.LEADER_TRADE,
  templateData: {
    userName: 'Test User',
    symbol: 'TSLA',
    side: 'SELL',
    quantity: 50,
    followerCount: 3,
    sideColor: '#ef4444',
  }
})

console.log('Email queued:', result.queueId)
```

## Template Best Practices

1. **Mobile Responsive**: Use tables for layout (email clients don't support modern CSS)
2. **Inline Styles**: All styles must be inline
3. **Safe Colors**: Use hex colors, not CSS variables
4. **Test Everywhere**: Test in Gmail, Outlook, Apple Mail, etc.
5. **Plain Text**: Always provide a text version as fallback
6. **Unsubscribe**: Include unsubscribe link (required by law)

## Fallback to HTML

If templates aren't set up yet, the system falls back to HTML content:

```typescript
await queueEmail({
  category: 'trading',
  to: email,
  subject: 'Trade Executed',
  html: generateTradeEmailHtml({...}),
  text: 'Your trade was executed...'
})
```

## Migration Path

1. **Phase 1**: Create templates in Resend dashboard
2. **Phase 2**: Update template IDs in code
3. **Phase 3**: Switch to template-based emails
4. **Phase 4**: Remove old HTML generation functions (optional, keep as fallback)
