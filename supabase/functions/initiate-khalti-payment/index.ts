import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Khalti Sandbox Configuration
const KHALTI_SECRET_KEY = Deno.env.get('KHALTI_SECRET_KEY') || "58cdd238e8394b71ae1e51aa1505c09d";
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

    const { courseId, amount, courseName, courses, totalAmount, successUrl, failureUrl } = await req.json();

    // Support both single course and multi-course payments
    const coursesToProcess = courses || [{ id: courseId, title: courseName, price: amount }];
    const paymentAmount = totalAmount || amount;

    if (coursesToProcess.length === 0 || !paymentAmount) {
      throw new Error('Missing required fields');
    }

    // Validate user has required info for Khalti
    if (!user.email) {
      throw new Error('Email is required for Khalti payment');
    }

    // Generate unique batch ID for multi-course orders
    const batchId = `batch-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Create orders for each course
    const orderPromises = coursesToProcess.map((course: { id: string; price: number }) => 
      supabase
        .from('orders')
        .insert({
          user_id: user.id,
          course_id: course.id,
          amount: course.price,
          payment_method: 'khalti',
          status: 'pending',
          transaction_uuid: batchId,
        })
        .select()
        .single()
    );

    const orderResults = await Promise.all(orderPromises);
    
    // Check for errors
    for (const result of orderResults) {
      if (result.error) {
        console.error('Order creation error:', result.error);
        throw new Error('Failed to create order');
      }
    }

    const orderIds = orderResults.map(r => r.data!.id);
    console.log('Created orders:', orderIds);

    // Convert amount to paisa (Khalti expects amount in paisa)
    const amountInPaisa = Math.round(paymentAmount * 100);
    const origin = req.headers.get('origin') || 'http://localhost:8080';

    // Use the batch ID as purchase_order_id for tracking
    const purchaseOrderName = coursesToProcess.length > 1 
      ? `${coursesToProcess.length} Courses` 
      : (coursesToProcess[0].title || 'Course Purchase');

    console.log('Initiating Khalti payment:', {
      amount: amountInPaisa,
      batchId,
      orderIds,
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
        return_url: successUrl || `${origin}/payment/success`,
        website_url: origin,
        amount: amountInPaisa,
        purchase_order_id: batchId, // Use batch ID to link all orders
        purchase_order_name: purchaseOrderName,
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

    // Update all orders with Khalti pidx
    const updatePromises = orderIds.map(orderId => 
      supabaseAdmin
        .from('orders')
        .update({ payment_reference: khaltiData.pidx })
        .eq('id', orderId)
    );

    await Promise.all(updatePromises);
    console.log('Updated all orders with pidx:', khaltiData.pidx);

    return new Response(JSON.stringify({
      success: true,
      orderIds,
      batchId,
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