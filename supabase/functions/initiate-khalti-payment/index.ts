import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Khalti Sandbox Configuration
const KHALTI_SECRET_KEY = "live_secret_key_68791341fdd94846a146f0457ff7b455";
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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { courseId, amount, courseName, successUrl, failureUrl } = await req.json();

    if (!courseId || !amount) {
      throw new Error('Missing required fields');
    }

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
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Initiate Khalti payment
    const khaltiResponse = await fetch(KHALTI_INITIATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: successUrl || `${origin}/payment/success?method=khalti`,
        website_url: origin,
        amount: amountInPaisa,
        purchase_order_id: order.id,
        purchase_order_name: courseName || 'Course Purchase',
        customer_info: {
          name: user.user_metadata?.full_name || 'Customer',
          email: user.email,
        },
      }),
    });

    const khaltiData = await khaltiResponse.json();

    if (!khaltiResponse.ok) {
      console.error('Khalti API error:', khaltiData);
      throw new Error(khaltiData.detail || 'Khalti payment initiation failed');
    }

    // Update order with Khalti pidx
    await supabase
      .from('orders')
      .update({ payment_reference: khaltiData.pidx })
      .eq('id', order.id);

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
