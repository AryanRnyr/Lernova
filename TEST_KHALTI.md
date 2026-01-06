# Khalti Payment Test Plan

## Pre-Test Checklist
1. ✅ Updated `initiate-khalti-payment` with proper logging
2. ✅ Using `supabaseAdmin` for updates (bypasses RLS)
3. ✅ Added verification that pidx is saved
4. ✅ Khalti payment option is visible in checkout

## Test Steps

### 1. Start Fresh Payment
- [ ] Clear all pending orders from database (or note the current count)
- [ ] Go to checkout page
- [ ] Select Khalti payment method
- [ ] Click "Place Order"

### 2. Check Lovable Logs (initiate-khalti-payment)
Look for these logs:
```
User info for Khalti: { email, phone, name }
Initiating Khalti payment: { amount, orderId, customerEmail }
Khalti API response: { status, ok, data }
About to update order with pidx: { orderId, pidx }
Order update result: { success, orderId, payment_reference, pidx }
✓ Order updated successfully with pidx: [pidx_value]
```

### 3. Expected Results After Initiation
- [ ] No errors in logs
- [ ] `Khalti API response` shows `ok: true`
- [ ] `pidx` value is present in response
- [ ] `Order update result` shows `payment_reference` equals `pidx`
- [ ] User is redirected to Khalti payment page

### 4. Complete Khalti Payment
- [ ] Enter test credentials on Khalti page
- [ ] Complete the payment
- [ ] Get redirected to success page

### 5. Check Database After Payment
Query: `SELECT id, payment_reference, status FROM orders WHERE payment_method = 'khalti' ORDER BY created_at DESC LIMIT 1;`

Expected:
- [ ] `payment_reference` is NOT NULL
- [ ] `payment_reference` contains the pidx from Khalti
- [ ] `status` is 'completed'

### 6. Check Lovable Logs (verify-payment)
Look for:
```
Khalti payment data received
Khalti pidx and purchaseOrderId
Khalti lookup response
Order found by purchase_order_id
```

## If Test Fails

### If pidx is still NULL in database:
1. Check Lovable logs for "Order update result" - does it show the pidx?
2. Check for any error in "Failed to update order with pidx"
3. Verify SUPABASE_SERVICE_ROLE_KEY is set in Lovable environment variables

### If Khalti API returns error:
1. Check "Khalti API response" in logs
2. Verify KHALTI_SECRET_KEY is correct (should be test key for sandbox)
3. Check customer_info fields are valid

### If payment completes but verification fails:
1. Check that `purchase_order_id` in URL matches the order ID
2. Verify `pidx` in URL matches what was saved in `payment_reference`
3. Check verify-payment logs for order lookup attempts
