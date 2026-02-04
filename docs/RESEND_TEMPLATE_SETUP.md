# Resend Template Setup - Quick Start

## Step 1: Create Templates in Resend

1. Go to https://resend.com/emails/templates
2. Click "Create Template"

### Template 1: Leader Trade

- **Name**: Leader Trade Executed
- **Template ID**: `leader-trade-executed`
- **Subject**: `Trade Executed - {{side}} {{symbol}}`
- **HTML**: Copy from `docs/RESEND_TEMPLATES.md` (Template 1)

### Template 2: Follower Copy Trade

- **Name**: Follower Copy Trade
- **Template ID**: `follower-copy-trade`
- **Subject**: `Copy Trade Executed - {{symbol}}`
- **HTML**: Copy from `docs/RESEND_TEMPLATES.md` (Template 2)

## Step 2: Update Template IDs in Code

Edit `supabase/functions/_shared/email-helper.ts`:

```typescript
export const RESEND_TEMPLATES = {
  LEADER_TRADE: 'leader-trade-executed',  // ← Your actual template ID
  FOLLOWER_COPY_TRADE: 'follower-copy-trade',  // ← Your actual template ID
}
```

## Step 3: Test Templates

### In Resend Dashboard

1. Open each template
2. Click "Send Test Email"
3. Fill in sample variables:

**Leader Trade Test Data:**
```json
{
  "userName": "John Doe",
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "followerCount": 5,
  "sideColor": "#10b981"
}
```

**Follower Copy Trade Test Data:**
```json
{
  "followerName": "Jane Smith",
  "leaderName": "John Doe",
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": "25.000000000",
  "portfolioPercentage": "2.5000",
  "sideColor": "#10b981"
}
```

### In Your App

```bash
# Deploy the updated functions
supabase functions deploy execute-copy-trades
supabase functions deploy email-queue

# Trigger a test copy trade
# The emails will use templates automatically
```

## Step 4: Apply Database Migration

```bash
cd supabase
supabase db push
```

This adds the `template_id` and `template_data` columns to the `email_queue` table.

## Verification

Check that templates are working:

```sql
-- View queued emails with templates
SELECT 
  id,
  "to",
  template_id,
  template_data,
  status,
  created_at
FROM email_queue
WHERE template_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Fallback Behavior

If templates aren't set up or fail, the system automatically falls back to HTML content. No emails will be lost!

## Template Variables Reference

### Leader Trade (`leader-trade-executed`)

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `userName` | string | "John Doe" | Leader's name |
| `symbol` | string | "AAPL" | Stock symbol |
| `side` | string | "BUY" or "SELL" | Trade action |
| `quantity` | number | 100 | Number of shares |
| `followerCount` | number | 5 | Followers who copied |
| `sideColor` | string | "#10b981" | Color for action |

### Follower Copy Trade (`follower-copy-trade`)

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `followerName` | string | "Jane Smith" | Follower's name |
| `leaderName` | string | "John Doe" | Leader's name |
| `symbol` | string | "AAPL" | Stock symbol |
| `side` | string | "BUY" or "SELL" | Trade action |
| `quantity` | string | "25.000000000" | Shares (formatted) |
| `portfolioPercentage` | string | "2.5000" | Portfolio % |
| `sideColor` | string | "#10b981" | Color for action |

## Color Reference

- **Buy**: `#10b981` (green)
- **Sell**: `#ef4444` (red)

## Troubleshooting

### Templates not found

**Error**: `Template not found: leader-trade-executed`

**Fix**: 
1. Check template ID in Resend dashboard
2. Update `RESEND_TEMPLATES` in `email-helper.ts`
3. Redeploy functions

### Variables not rendering

**Error**: Template shows `{{userName}}` instead of actual name

**Fix**:
1. Check variable names match exactly (case-sensitive)
2. Verify `templateData` is being passed correctly
3. Check Resend dashboard for template syntax errors

### Emails not sending

**Check**:
1. Resend API key is set: `echo $RESEND_API_KEY`
2. Queue is processing: Check GitHub Actions workflow
3. View logs: Supabase Dashboard → Edge Functions → email-queue

## Need Help?

- Full template HTML: `docs/RESEND_TEMPLATES.md`
- Email queue docs: `supabase/functions/email-queue/README.md`
- Resend docs: https://resend.com/docs/send-with-templates
