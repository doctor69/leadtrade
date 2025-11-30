# Alpaca Account Creation Integration

## 🎯 Overview

I've integrated automatic Alpaca brokerage account creation into the user signup process. When users sign up for LEADTRADE, the system will now:

1. ✅ Create a Supabase user account
2. ✅ Create an Alpaca brokerage account
3. ✅ Store encrypted Alpaca credentials
4. ✅ Set up initial portfolio with $100k paper money
5. ✅ Link the accounts in the database

## 📁 Files Created/Modified

### **New Files:**
- ✅ `src/pages/api/alpaca/create-account.ts` - API endpoint for Alpaca account creation
- ✅ `add-alpaca-accounts-table.sql` - SQL to add missing alpaca_accounts table
- ✅ `test-alpaca-signup.js` - Test script for the integration

### **Modified Files:**
- ✅ `src/components/SupabaseSignUpForm.tsx` - Enhanced signup flow with Alpaca integration
- ✅ `check-database.js` - Added alpaca_accounts table to verification

## 🔧 Setup Required

### **Step 1: Add Missing Database Table**

Run this SQL in your Supabase dashboard:

```sql
-- Copy and paste the entire contents of add-alpaca-accounts-table.sql
```

### **Step 2: Verify Database Setup**

```bash
node check-database.js
```

You should now see:
- ✅ alpaca_accounts: exists and accessible

### **Step 3: Test the Integration**

```bash
# Make sure your dev server is running
npm run dev

# Test the API endpoint
node test-alpaca-signup.js
```

## 🚀 How It Works

### **User Signup Flow:**

1. **User fills out signup form** with:
   - Email, password, full name
   - Investment experience
   - Risk tolerance
   - Privacy preferences

2. **System creates Supabase account** with user data

3. **System calls Alpaca API** to create brokerage account:
   - Uses provided user information
   - Sets default values for missing KYC data
   - Creates account in paper trading mode

4. **System stores credentials**:
   - Encrypts Alpaca API tokens
   - Stores in user profile
   - Creates alpaca_accounts record

5. **System sets up portfolio**:
   - Creates user_portfolios record
   - Sets $100k starting balance
   - Enables paper trading mode

### **API Endpoint Details:**

**POST** `/api/alpaca/create-account`

**Request Body:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "investment_experience": "limited",
  "risk_tolerance": "moderate"
}
```

**Response:**
```json
{
  "success": true,
  "accountId": "alpaca-account-id",
  "accountNumber": "123456789",
  "status": "ACTIVE",
  "message": "Alpaca brokerage account created successfully"
}
```

## 🔒 Security Features

- ✅ **Encrypted credentials** - Alpaca tokens are encrypted before storage
- ✅ **Row Level Security** - Users can only access their own Alpaca accounts
- ✅ **Default paper trading** - All new accounts start in safe paper mode
- ✅ **Error handling** - Signup continues even if Alpaca creation fails

## 📊 Database Schema

### **alpaca_accounts table:**
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- alpaca_account_id (TEXT, unique)
- alpaca_account_number (TEXT, unique)
- alpaca_account_status (TEXT)
- account_type (TEXT, default 'paper')
- created_at, updated_at (timestamps)
```

### **profiles table additions:**
```sql
- alpaca_access_token (TEXT, encrypted)
- alpaca_refresh_token (TEXT, encrypted)
```

## 🧪 Testing

### **Manual Testing:**
1. Go to `/signup`
2. Fill out the form
3. Submit and watch browser console
4. Check Supabase database for new records
5. Verify Alpaca account creation in logs

### **API Testing:**
```bash
node test-alpaca-signup.js
```

### **Database Verification:**
```bash
node check-database.js
```

## 🎯 Production Considerations

### **KYC Data Collection:**
Currently using default values for:
- Date of birth
- SSN/Tax ID
- Phone number
- Address

**For production**, you'll need to:
1. Add KYC form fields to signup
2. Implement proper data validation
3. Handle KYC verification flow
4. Store sensitive data securely

### **Alpaca API Keys:**
- Ensure you have valid Alpaca Broker API credentials
- Test with Alpaca sandbox environment first
- Implement proper error handling for API failures

### **Error Handling:**
- Signup continues even if Alpaca creation fails
- Users can complete Alpaca setup later
- Graceful degradation for API outages

## 🔄 Next Steps

1. **Apply database migration** - Add alpaca_accounts table
2. **Test signup flow** - Create a new account and verify
3. **Check Alpaca dashboard** - Verify accounts appear in Alpaca
4. **Enhance KYC collection** - Add proper user data fields
5. **Implement account verification** - Handle Alpaca account status updates

The integration is now ready for testing! Users will automatically get both LEADTRADE and Alpaca accounts when they sign up.