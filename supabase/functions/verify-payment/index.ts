import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Khalti Configuration
const KHALTI_SECRET_KEY = "live_secret_key_68791341fdd94846a146f0457ff7b455";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";

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
      
      const { transaction_uuid, status, total_amount, transaction_code } = decodedData;

      if (status !== 'COMPLETE') {
        throw new Error('Payment not completed');
      }

      // Find order by transaction_uuid
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('transaction_uuid', transaction_uuid)
        .eq('user_id', user.id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Update order status
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'completed',
          payment_reference: transaction_code,
        })
        .eq('id', order.id);

      // Create enrollment
      await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: order.course_id,
        });

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
      const { pidx } = paymentData;

      const lookupResponse = await fetch(KHALTI_LOOKUP_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      });

      const lookupData = await lookupResponse.json();

      if (!lookupResponse.ok || lookupData.status !== 'Completed') {
        throw new Error('Payment verification failed');
      }

      // Find order by payment_reference (pidx)
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('payment_reference', pidx)
        .eq('user_id', user.id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Update order status
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'completed',
          payment_reference: lookupData.transaction_id || pidx,
        })
        .eq('id', order.id);

      // Create enrollment
      await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: order.course_id,
        });

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
