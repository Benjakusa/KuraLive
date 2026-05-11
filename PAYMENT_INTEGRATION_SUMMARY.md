# KuraLive Payment Integration - Complete Implementation

## Files Modified/Created:

### 1. Frontend Files Modified:
- `frontend/src/pages/admin/AdminSettings.jsx`
  - Integrated with global ThemeContext for dark/light mode
  - Removed separate admin-theme state management

- `frontend/src/contexts/SubscriptionContext.jsx`
  - Added M-Pesa payment integration
  - `upgradePlan()` now initiates STK Push for paid plans
  - Added `completeUpgrade()` function
  - Free trial limited to 14 days

- `frontend/src/components/UpgradeModal.jsx`
  - Added M-Pesa phone number input
  - Multi-step payment flow (Select → Pay → Confirm)
  - Payment status messages

- `frontend/src/pages/manager/ManagerDashboardHome.jsx`
  - Added subscription status banner
  - Current plan display card
  - "Manage Subscription" button

### 2. New Files Created:
- `frontend/src/services/daraja.js`
  - Daraja API service for M-Pesa STK Push
  - Uses consumer key: `PLQLwc9qnUTD8KkGUosPkO51DclAew9Af7jZ0Yc1Umk7ZAWj`
  - Uses consumer secret: `AAuznv7sUvU5CfBlpGCl8q33Cw1aqE0qtADnHT4lT4DuDKssQ9VBmTPdGC5HDsBm`
  - Callback URL: `https://fagrcpwucxtuqquoeusr.supabase.co/functions/v1/daraja-callback`

- `supabase/functions/daraja-callback/index.ts`
  - Edge Function to handle M-Pesa callbacks
  - Verifies payment and updates subscription status
  - Handles both success (ResultCode 0) and failure

- `subscriptions-setup.sql` (updated)
  - Added payment fields: `pending_payment`, `pending_plan`, `checkout_request_id`, `payment_phone`, `updated_at`
  - Added indexes and triggers

- `test-payment-flow.sql`
  - SQL scripts to test expiry and reset subscriptions

- `test-mpesa-payment.js`
  - Browser console test script for payment flow

## Deployment Steps:

### 1. Database Setup:
```bash
# In Supabase SQL Editor, run:
# Copy and paste contents of subscriptions-setup.sql
```

### 2. Deploy Edge Function:
```bash
cd /home/benjakusa/KuraLive
supabase login
supabase link --project-ref fagrcpwucxtuqquoeusr
supabase functions deploy daraja-callback
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### 3. Update Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Testing:

### Test 1: Free Trial
1. Sign up as Manager
2. Verify subscription created with 14-day trial
3. Check Supabase `subscriptions` table

### Test 2: Trial Expiry
```sql
-- In Supabase SQL Editor:
UPDATE subscriptions
SET trial_expires_at = NOW() - INTERVAL '1 day'
WHERE manager_id = 'your_manager_id';
```
4. Refresh dashboard - should see "Trial Expired" banner
5. Click "Upgrade Now"

### Test 3: M-Pesa Payment (Sandbox)
1. Enter phone: `254708374149` (Safaricom test number)
2. Click "Pay via M-Pesa"
3. Check phone for STK Push prompt
4. Enter M-Pesa PIN (use 123456 for sandbox)
5. Verify subscription updates to "active"

## Pricing:
- **Free Trial**: KSh 0 (14 days, 2 agents, 5 stations)
- **Standard**: KSh 4,999/year (20 agents, 50 stations)
- **Enterprise**: KSh 11,999/year (Unlimited)

## Still Needed:
1. ⏳ **Passkey and Short Code** from Safaricom for production
2. ⏳ **Update `daraja.js`** with actual Passkey and Short Code
3. ⏳ **Production testing** with real M-Pesa credentials
4. ⏳ **Email/SMS notifications** for payment confirmation

## Security Notes:
- Service Role Key is set as Supabase secret (not in frontend code)
- Edge Function validates callback from Daraja
- All payment processing happens server-side
- Frontend only initiates payment, never handles sensitive data

## Troubleshooting:
- Check Edge Function logs: `supabase functions logs daraja-callback`
- Check Supabase realtime logs for subscription updates
- Verify callback URL is accessible: `https://fagrcpwucxtuqquoeusr.supabase.co/functions/v1/daraja-callback`
