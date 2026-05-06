# Setting Up Donations for LEADTRADE

## GitHub Sponsor Button

The `.github/FUNDING.yml` file adds a "Sponsor" button to your repo. Here's how to set it up:

## Recommended Platforms (Easiest)

### 1. **GitHub Sponsors** (Best - 0% fees!)

**Pros:**
- ✅ 0% fees (GitHub pays processing fees)
- ✅ Integrated into GitHub
- ✅ One-time or recurring donations
- ✅ Professional and trusted

**Setup:**
1. Go to https://github.com/sponsors
2. Click "Join the waitlist" or "Set up GitHub Sponsors"
3. Fill out tax forms (W-9 for US, W-8BEN for non-US)
4. Add bank account or use Stripe
5. Create sponsor tiers (optional)
6. Wait for approval (usually 1-2 days)

**Then update FUNDING.yml:**
```yaml
github: [doctor69]
```

### 2. **Buy Me a Coffee** (Easiest)

**Pros:**
- ✅ Super easy setup (5 minutes)
- ✅ No approval needed
- ✅ 5% fee
- ✅ One-time donations

**Setup:**
1. Go to https://buymeacoffee.com
2. Sign up with email
3. Choose username (e.g., "doctor" or "leadtrade")
4. Add payment method (Stripe/PayPal)
5. Done!

**Then update FUNDING.yml:**
```yaml
buy_me_a_coffee: doctor
```

### 3. **Ko-fi** (Similar to Buy Me a Coffee)

**Pros:**
- ✅ Easy setup
- ✅ 0% fees on donations (5% on memberships)
- ✅ One-time or recurring

**Setup:**
1. Go to https://ko-fi.com
2. Sign up
3. Choose username
4. Add payment method
5. Done!

**Then update FUNDING.yml:**
```yaml
ko_fi: doctor
```

## My Recommendation

**Start with these 2:**

1. **GitHub Sponsors** (apply now, takes 1-2 days)
   - 0% fees
   - Professional
   - Integrated

2. **Buy Me a Coffee** (set up now, takes 5 minutes)
   - Instant setup
   - Easy for donors
   - Low fees

**FUNDING.yml:**
```yaml
github: [doctor69]
buy_me_a_coffee: doctor
custom: ['https://leadtrade.app/donate']
```

## How to Enable

1. **Sign up for platforms** (GitHub Sponsors + Buy Me a Coffee)
2. **Update `.github/FUNDING.yml`** with your usernames
3. **Commit and push:**
   ```bash
   git add .github/FUNDING.yml
   git commit -m "Add funding options"
   git push
   ```
4. **"Sponsor" button appears** on your repo!

## Next Steps

1. ✅ Apply for GitHub Sponsors (do this now)
2. ✅ Sign up for Buy Me a Coffee (takes 5 min)
3. ✅ Update `.github/FUNDING.yml`
4. ✅ Add support section to README
5. ✅ Commit and push
6. ✅ "Sponsor" button appears!

Good luck! 🚀
