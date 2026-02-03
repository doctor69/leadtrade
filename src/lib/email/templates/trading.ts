/**
 * Trading Email Templates
 */

export interface TradeDetails {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  orderId: string;
}

export function getTradeConfirmationTemplate(
  userName: string,
  trade: TradeDetails
): { html: string; text: string } {
  const sideColor = trade.side === 'buy' ? '#10b981' : '#ef4444';
  const sideText = trade.side === 'buy' ? 'BUY' : 'SELL';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Trade Confirmation</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">Your trade has been executed successfully:</p>
    
    <div style="background: white; border: 2px solid ${sideColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <span style="font-weight: 600; color: #666;">Action:</span>
        <span style="font-weight: 700; color: ${sideColor}; font-size: 18px;">${sideText}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Symbol:</span>
        <span style="font-weight: 600;">${trade.symbol}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Quantity:</span>
        <span style="font-weight: 600;">${trade.quantity}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Price:</span>
        <span style="font-weight: 600;">$${trade.price.toFixed(2)}</span>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 600; color: #666;">Total:</span>
          <span style="font-weight: 700; font-size: 18px;">$${trade.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #666;">
          <div>Order ID: ${trade.orderId}</div>
          <div>Time: ${trade.timestamp}</div>
        </div>
      </div>
    </div>
    
    <p style="font-size: 14px; color: #666;">You can view your complete trading history in your LeadTrade dashboard.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Trade Confirmation

Hi ${userName},

Your trade has been executed successfully:

Action: ${sideText}
Symbol: ${trade.symbol}
Quantity: ${trade.quantity}
Price: $${trade.price.toFixed(2)}
Total: $${trade.total.toFixed(2)}

Order ID: ${trade.orderId}
Time: ${trade.timestamp}

You can view your complete trading history in your LeadTrade dashboard.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}

export function getCopyTradeNotificationTemplate(
  userName: string,
  leaderName: string,
  trade: TradeDetails
): { html: string; text: string } {
  const sideColor = trade.side === 'buy' ? '#10b981' : '#ef4444';
  const sideText = trade.side === 'buy' ? 'BUY' : 'SELL';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Copy Trade Executed</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    
    <p style="font-size: 16px;">A trade from <strong>${leaderName}</strong> has been copied to your account:</p>
    
    <div style="background: white; border: 2px solid ${sideColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: center;">
        <span style="font-size: 14px; color: #666;">Following: <strong>${leaderName}</strong></span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <span style="font-weight: 600; color: #666;">Action:</span>
        <span style="font-weight: 700; color: ${sideColor}; font-size: 18px;">${sideText}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Symbol:</span>
        <span style="font-weight: 600;">${trade.symbol}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Quantity:</span>
        <span style="font-weight: 600;">${trade.quantity}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #666;">Price:</span>
        <span style="font-weight: 600;">$${trade.price.toFixed(2)}</span>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 600; color: #666;">Total:</span>
          <span style="font-weight: 700; font-size: 18px;">$${trade.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
    
    <p style="font-size: 14px; color: #666;">You can manage your copy trading settings and view all trades in your dashboard.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} LeadTrade. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Copy Trade Executed

Hi ${userName},

A trade from ${leaderName} has been copied to your account:

Following: ${leaderName}
Action: ${sideText}
Symbol: ${trade.symbol}
Quantity: ${trade.quantity}
Price: $${trade.price.toFixed(2)}
Total: $${trade.total.toFixed(2)}

You can manage your copy trading settings and view all trades in your dashboard.

© ${new Date().getFullYear()} LeadTrade. All rights reserved.
  `.trim();

  return { html, text };
}
