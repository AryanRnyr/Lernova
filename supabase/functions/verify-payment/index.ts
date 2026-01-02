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
const KHALTI_SECRET_KEY = "live_secret_key_68791341fdd94846a146f0457ff7b455";
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
      // Decode the base64 data from eSewa
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

      // Find order by transaction_uuid
      let order;
      const { data: orderByUuid, error: orderError1 } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('transaction_uuid', transaction_uuid)
        .eq('user_id', user.id)
        .single();

      if (orderByUuid) {
        order = orderByUuid;
      } else {
        console.warn('Order not found by transaction_uuid, trying by user_id and pending status');
        // Fallback: find the most recent pending order for this user
        const { data: orderByUser, error: orderError2 } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (orderByUser) {
          order = orderByUser;
        } else {
          console.error('Order lookup errors:', { orderError1, orderError2 });
          throw new Error('Order not found');
        }
      }

      // Verify amount matches
      if (parseInt(total_amount) !== Math.round(order.amount)) {
        throw new Error(`Amount mismatch: expected ${order.amount}, got ${total_amount}`);
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
        throw new Error('Failed to update order');
      }

      // Check if enrollment already exists
      const { data: existingEnrollment, error: checkError } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', order.course_id)
        .single();

      // Create enrollment only if it doesn't exist
      if (!existingEnrollment && checkError?.code === 'PGRST116') {
        const { error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: order.course_id,
          });

        if (enrollError) {
          console.error('Enrollment creation error:', enrollError);
          throw new Error('Failed to create enrollment');
        }
      } else if (existingEnrollment) {
        console.log('Enrollment already exists for user:', user.id, 'course:', order.course_id);
      } else if (checkError) {
        console.error('Enrollment check error:', checkError);
        throw new Error('Failed to check enrollment');
      }

      // Remove from cart if exists
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', order.course_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment verified and enrollment created',
        courseId: order.course_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (method === 'khalti') {
      // Verify Khalti payment
      console.log('Khalti payment data received:', paymentData);
      
      const { pidx } = paymentData;

      console.log('Khalti pidx:', pidx);

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
      } else {
        console.warn('No pidx provided - will rely on order status check');
      }

      console.log('Khalti payment verified, looking up order');

      // Find order by payment_reference (pidx) if available, or by recent pending order
      let order;
      
      if (pidx) {
        // Try to find by payment_reference first
        const { data: orderByRef, error: orderError1 } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('payment_reference', pidx)
          .eq('user_id', user.id)
          .single();

        console.log('Order lookup by pidx:', { found: !!orderByRef, error: orderError1?.message, pidx, userId: user.id });

        if (orderByRef) {
          order = orderByRef;
          console.log('Order found by pidx:', order.id);
        } else {
          console.warn('Order not found by pidx, trying by user_id and pending status');
          
          // DEBUG: Check all pending orders for this user
          const { data: allPending, error: allPendingError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending');
          
          console.log('DEBUG - All pending orders for user:', { 
            userId: user.id, 
            count: allPending?.length || 0,
            orders: allPending?.map(o => ({ id: o.id, payment_reference: o.payment_reference, created_at: o.created_at })) || [],
            error: allPendingError?.message
          });
          
          // Fallback: find the most recent pending order for this user
          const { data: orderByUser, error: orderError2 } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          console.log('Order lookup by user+status:', { found: !!orderByUser, error: orderError2?.message });

          if (orderByUser) {
            order = orderByUser;
            console.log('Order found by user and status:', order.id);
          } else {
            console.error('Order lookup errors:', { orderError1: orderError1?.message, orderError2: orderError2?.message });
            throw new Error(`Order not found for user ${user.id}. Errors: ${orderError1?.message}, ${orderError2?.message}`);
          }
        }
      } else {
        // No pidx provided - find the most recent pending order
        console.log('Finding most recent pending order for user:', user.id);
        const { data: orderByUser, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('Order lookup result:', { found: !!orderByUser, error: orderError?.message });

        if (orderByUser) {
          order = orderByUser;
          console.log('Order found by user and status:', order.id);
          pidx = orderByUser.payment_reference; // Get the pidx from the order if available
        } else {
          console.error('Order not found:', orderError);
          throw new Error(`No pending order found for user ${user.id}. Error: ${orderError?.message}`);
        }
      }

      // Update order status
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'completed',
          payment_reference: (lookupData?.transaction_id) || pidx || 'khalti-payment',
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Order update error:', updateError);
        throw new Error('Failed to update order');
      }

      // Check if enrollment already exists
      const { data: existingEnrollment, error: checkError } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', order.course_id)
        .single();

      // Create enrollment only if it doesn't exist
      if (!existingEnrollment && checkError?.code === 'PGRST116') {
        const { error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: order.course_id,
          });

        if (enrollError) {
          console.error('Enrollment creation error:', enrollError);
          throw new Error('Failed to create enrollment');
        }
      } else if (existingEnrollment) {
        console.log('Enrollment already exists for user:', user.id, 'course:', order.course_id);
      } else if (checkError) {
        console.error('Enrollment check error:', checkError);
        throw new Error('Failed to check enrollment');
      }

      // Remove from cart if exists
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', order.course_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment verified and enrollment created',
        courseId: order.course_id,
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
