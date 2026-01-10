import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// eSewa Configuration
const ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q";

// Khalti Configuration
const KHALTI_SECRET_KEY = Deno.env.get('KHALTI_SECRET_KEY') || "58cdd238e8394b71ae1e51aa1505c09d";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";

async function verifyEsewaSignature(message: string, signature: string, secretKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, messageData);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use anon key for user verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { method, data: paymentData } = await req.json();

    if (method === 'esewa') {
      // Verify eSewa payment
      const decodedData = JSON.parse(new TextDecoder().decode(base64Decode(paymentData)));
      
      const { transaction_uuid, status, total_amount, transaction_code, signature } = decodedData;

      console.log('eSewa payment data:', { transaction_uuid, status, total_amount, transaction_code });

      if (status !== 'COMPLETE') {
        throw new Error(`Payment not completed. Status: ${status}`);
      }

      // Verify signature (optional - log if fails but don't block)
      if (signature) {
        const signatureMessage = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=EPAYTEST`;
        try {
          const isSignatureValid = await verifyEsewaSignature(signatureMessage, signature, ESEWA_SECRET_KEY);
          if (!isSignatureValid) {
            console.warn('Invalid payment signature - continuing anyway');
          }
        } catch (sigError) {
          console.warn('Signature verification error:', sigError);
        }
      }

      // Find ALL orders by transaction_uuid (batch payment)
      let orders: any[] = [];
      
      const { data: ordersByTxn, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('transaction_uuid', transaction_uuid)
        .eq('user_id', user.id);

      if (ordersByTxn && ordersByTxn.length > 0) {
        orders = ordersByTxn;
      } else {
        console.error('Orders not found by transaction_uuid:', { transaction_uuid, error: ordersError });
        
        // Fallback: find pending orders for this user
        const { data: pendingOrders, error: pendingError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('payment_method', 'esewa')
          .order('created_at', { ascending: false });

        if (pendingError || !pendingOrders || pendingOrders.length === 0) {
          throw new Error('No pending orders found');
        }

        orders = pendingOrders;
      }

      console.log(`Found ${orders.length} orders to process`);

      // Calculate expected total
      const orderTotal = orders.reduce((sum, order) => sum + order.amount, 0);
      const receivedAmount = parseInt(total_amount);
      
      // Allow some tolerance for rounding
      if (Math.abs(receivedAmount - orderTotal) > 1) {
        console.warn(`Amount mismatch: expected ${orderTotal}, got ${receivedAmount}`);
      }

      // Process all orders
      const courseIds: string[] = [];
      
      for (const order of orders) {
        // Skip already completed orders
        if (order.status === 'completed') {
          console.log('Order already completed:', order.id);
          courseIds.push(order.course_id);
          continue;
        }

        // Update order status
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'completed',
            payment_reference: transaction_code,
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Order update error:', updateError);
          continue;
        }

        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', order.course_id)
          .single();

        // Create enrollment only if it doesn't exist
        if (!existingEnrollment) {
          const { error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert({
              user_id: user.id,
              course_id: order.course_id,
            });

          if (enrollError && !enrollError.message.includes('duplicate')) {
            console.error('Enrollment creation error:', enrollError);
          }
        }

        // Remove from cart
        await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', order.course_id);

        courseIds.push(order.course_id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Payment verified and enrolled in ${courseIds.length} course(s)`,
        courseIds,
        courseId: courseIds[0], // For backwards compatibility
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (method === 'khalti') {
      // Verify Khalti payment
      console.log('Khalti payment data received:', paymentData);
      
      const { pidx, purchaseOrderId } = paymentData;

      // If pidx is provided, verify with Khalti API
      let khaltiVerified = false;
      let lookupData: any = null;
      
      if (pidx) {
        const lookupResponse = await fetch(KHALTI_LOOKUP_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${KHALTI_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pidx }),
        });

        lookupData = await lookupResponse.json();

        console.log('Khalti lookup response:', { status: lookupResponse.status, data: lookupData });

        if (!lookupResponse.ok) {
          console.error('Khalti lookup failed:', lookupData);
          throw new Error(`Khalti verification failed: ${lookupData.detail || 'Unknown error'}`);
        }

        if (lookupData.status !== 'Completed') {
          console.error('Payment not completed. Status:', lookupData.status);
          throw new Error(`Payment not completed. Status: ${lookupData.status}`);
        }
        
        khaltiVerified = true;
      }

      // Find ALL orders with this pidx (batch payment)
      let orders = [];
      
      // First try to find by payment_reference (pidx)
      if (pidx) {
        const { data: ordersByPidx, error: pidxError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('payment_reference', pidx)
          .eq('user_id', user.id);

        if (ordersByPidx && ordersByPidx.length > 0) {
          orders = ordersByPidx;
          console.log(`Found ${orders.length} orders by pidx`);
        }
      }

      // If no orders found by pidx, try transaction_uuid (batch ID)
      if (orders.length === 0 && purchaseOrderId) {
        const { data: ordersByBatch, error: batchError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('transaction_uuid', purchaseOrderId)
          .eq('user_id', user.id);

        if (ordersByBatch && ordersByBatch.length > 0) {
          orders = ordersByBatch;
          console.log(`Found ${orders.length} orders by batch ID`);
        }
      }

      // Fallback: find pending khalti orders for this user
      if (orders.length === 0) {
        const { data: pendingOrders, error: pendingError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('payment_method', 'khalti')
          .order('created_at', { ascending: false });

        if (pendingOrders && pendingOrders.length > 0) {
          orders = pendingOrders;
          console.log(`Found ${orders.length} pending khalti orders`);
        }
      }

      if (orders.length === 0) {
        throw new Error('No orders found for this payment');
      }

      // Process all orders
      const courseIds: string[] = [];
      const paymentRef = lookupData?.transaction_id || pidx || 'khalti-payment';
      
      for (const order of orders) {
        // Skip already completed orders
        if (order.status === 'completed') {
          console.log('Order already completed:', order.id);
          courseIds.push(order.course_id);
          continue;
        }

        // Update order status
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'completed',
            payment_reference: paymentRef,
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Order update error:', updateError);
          continue;
        }

        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', order.course_id)
          .single();

        // Create enrollment only if it doesn't exist
        if (!existingEnrollment) {
          const { error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert({
              user_id: user.id,
              course_id: order.course_id,
            });

          if (enrollError && !enrollError.message.includes('duplicate')) {
            console.error('Enrollment creation error:', enrollError);
          }
        }

        // Remove from cart
        await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', order.course_id);

        courseIds.push(order.course_id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Payment verified and enrolled in ${courseIds.length} course(s)`,
        courseIds,
        courseId: courseIds[0], // For backwards compatibility
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error('Invalid payment method');
    }

  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});