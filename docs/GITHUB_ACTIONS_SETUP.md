# GitHub Actions Setup for Email Queue

The email queue processor runs automatically via GitHub Actions every minute.

## Add Required Secrets

Go to your GitHub repository settings and add these secrets:

1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

2. Add these two secrets:

### SUPABASE_URL
- Name: `SUPABASE_URL`
- Value: Your Supabase project URL (e.g., `https://bfbqlzpbkivyrnjkvqgl.supabase.co`)
- Find it in: Supabase Dashboard → Project Settings → API

### SUPABASE_SERVICE_ROLE_KEY
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Your service role key (starts with `eyJ...`)
- Find it in: Supabase Dashboard → Project Settings → API → service_role key
- ⚠️ **Keep this secret!** Never commit it to git or share it publicly

## Verify Setup

1. After adding secrets, go to **Actions** tab in your GitHub repo
2. Find the "Email Queue Processor" workflow
3. Click **Run workflow** to test manually
4. Check the logs to ensure it runs successfully

## Workflow Details

- **File**: `.github/workflows/email-queue-processor.yml`
- **Schedule**: Every minute (`* * * * *`)
- **What it does**: Calls the email-queue edge function to process pending emails
- **Timeout**: 2 minutes max

## Monitoring

Check workflow runs:
- GitHub → Actions → Email Queue Processor
- View logs for each run
- Check for failures

## Troubleshooting

### Workflow not running
- Check that secrets are added correctly
- Ensure workflow file is in `main` branch
- GitHub Actions must be enabled for the repo

### 401 Unauthorized
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check it's the service_role key, not anon key

### 404 Not Found
- Verify `SUPABASE_URL` is correct
- Ensure email-queue function is deployed

### Manual trigger
You can also trigger manually:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/email-queue" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```
