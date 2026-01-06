import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Khalti Sandbox Configuration
const KHALTI_SECRET_KEY = "58cdd238e8394b71ae1e51aa1505c09d";
const KHALTI_INITIATE_URL = "https://a.khalti.com/api/v2/epayment/initiate/";

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // User client for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for operations that bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { courseId, amount, courseName, successUrl, failureUrl } = await req.json();

    if (!courseId || !amount) {
      throw new Error('Missing required fields');
    }

    // Validate user has required info for Khalti
    if (!user.email) {
      throw new Error('Email is required for Khalti payment');
    }

    console.log('User info for Khalti:', {
      email: user.email,
      phone: user.phone || user.user_metadata?.phone,
      name: user.user_metadata?.full_name
    });

    // Generate unique transaction UUID
    const transactionUuid = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        course_id: courseId,
        amount: amount,
        payment_method: 'khalti',
        status: 'pending',
        transaction_uuid: transactionUuid,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('Failed to create order');
    }

    // Convert amount to paisa (Khalti expects amount in paisa)
    const amountInPaisa = Math.round(amount * 100);
    const origin = req.headers.get('origin') || 'http://localhost:8080';

    console.log('Initiating Khalti payment:', {
      amount: amountInPaisa,
      orderId: order.id,
      customerEmail: user.email
    });

    // Initiate Khalti payment
    const khaltiResponse = await fetch(KHALTI_INITIATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: `http://localhost:8080/payment/success`,
        website_url: 'http://localhost:8080',
        amount: amountInPaisa,
        purchase_order_id: order.id,
        purchase_order_name: courseName || 'Course Purchase',
        customer_info: {
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          phone: user.phone || user.user_metadata?.phone || '9800000000',
        },
      }),
    });

    const khaltiData = await khaltiResponse.json();

    console.log('Khalti API response:', { 
      status: khaltiResponse.status, 
      ok: khaltiResponse.ok,
      data: khaltiData 
    });

    if (!khaltiResponse.ok) {
      console.error('Khalti API error:', khaltiData);
      throw new Error(khaltiData.detail || 'Khalti payment initiation failed');
    }

    // Check if pidx exists in response
    if (!khaltiData.pidx) {
      console.error('No pidx in Khalti response:', khaltiData);
      throw new Error('Khalti did not return a payment ID (pidx)');
    }

    console.log('About to update order with pidx:', { orderId: order.id, pidx: khaltiData.pidx });

    // Update order with Khalti pidx using admin client to bypass RLS
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ payment_reference: khaltiData.pidx })
      .eq('id', order.id)
      .select()
      .single();

      
    
    if (updateError) {
      console.error('Failed to update order with pidx:', updateError);
      throw new Error('Failed to save payment reference');
    }
    
    console.log('Order update result:', { 
      success: !updateError, 
      orderId: updatedOrder?.id,
      payment_reference: updatedOrder?.payment_reference,
      pidx: khaltiData.pidx
    });

    // Verify the update worked
    if (!updatedOrder || updatedOrder.payment_reference !== khaltiData.pidx) {
      console.error('Update verification failed:', {
        expected: khaltiData.pidx,
        actual: updatedOrder?.payment_reference
      });
      throw new Error('Payment reference was not saved correctly');
    }
    
    console.log('✓ Order updated successfully with pidx:', khaltiData.pidx);

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      paymentUrl: khaltiData.payment_url,
      pidx: khaltiData.pidx,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Khalti initiation error:', error);
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
