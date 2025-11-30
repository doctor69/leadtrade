# Deploy Edge Functions to Supabase

The functions need to be redeployed with the fixed code. Here's how to do it:

## 🚀 Quick Deploy (Recommended)

If you have Supabase CLI installed:

```bash
# Deploy specific functions that are having issues
npx supabase functions deploy signup
npx supabase functions deploy create-alpaca-account

# Or deploy all functions
npx supabase functions deploy
```

## 🔧 If you don't have Supabase CLI

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref bfbqlzpbkivyrnjkvqgl
   ```

4. **Deploy functions**:
   ```bash
   supabase functions deploy
   ```

## 🐛 What was fixed

The functions were failing because:
1. ✅ **Fixed Supabase client creation** - Added proper auth configuration
2. ✅ **Environment variables** - Functions now use the correct Supabase env vars (provided automatically)
3. ✅ **Alpaca API integration** - Fixed environment variable names to match your setup

## 🧪 Test after deployment

After deploying, test the functions:

```bash
# Test if functions are working
npm run test:after-setup

# Test signup flow specifically
npm run test:signup
```

## 📋 Expected Results

After deployment, you should see:
- ✅ **signup function**: 400 status (validation error, but function is working)
- ✅ **create-alpaca-account function**: 400 status (validation error, but function is working)
- ❌ **No more 503 boot errors**

## 🔗 Alternative: Manual Deployment

If CLI doesn't work, you can also:
1. Go to Supabase Dashboard → Edge Functions
2. Create new functions manually
3. Copy the code from the files in `supabase/functions/`

But CLI deployment is much easier and recommended.

## 🎯 What happens after deployment

Once deployed with the fixed code:
1. Functions will start properly (no more 503 errors)
2. Signup form will work in your app
3. Alpaca account creation will work
4. You can test the complete signup flow