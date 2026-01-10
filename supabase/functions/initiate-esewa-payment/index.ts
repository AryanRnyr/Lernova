import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// eSewa Sandbox Configuration
const ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = "EPAYTEST";
const ESEWA_PAYMENT_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

async function generateSignature(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { courseId, amount, courses, totalAmount, successUrl, failureUrl } = await req.json();

    // Support both single course and multi-course payments
    const coursesToProcess = courses || [{ id: courseId, price: amount }];
    const paymentAmount = totalAmount || amount;

    if (coursesToProcess.length === 0 || !paymentAmount) {
      throw new Error('Missing required fields');
    }

    // Generate unique transaction UUID for the entire batch
    const transactionUuid = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Create orders for each course in the batch
    const orderPromises = coursesToProcess.map((course: { id: string; price: number }) => 
      supabase
        .from('orders')
        .insert({
          user_id: user.id,
          course_id: course.id,
          amount: course.price,
          payment_method: 'esewa',
          status: 'pending',
          transaction_uuid: transactionUuid,
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

    console.log('Created orders:', orderResults.map(r => r.data?.id));

    // Generate signature for eSewa using total amount
    const totalAmountStr = paymentAmount.toString();
    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const signatureMessage = `total_amount=${totalAmountStr},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = await generateSignature(signatureMessage, ESEWA_SECRET_KEY);

    console.log('eSewa payment initiated:', { 
      transactionUuid, 
      totalAmount: totalAmountStr, 
      coursesCount: coursesToProcess.length,
      signatureMessage
    });

    // Return payment form data
    return new Response(JSON.stringify({
      success: true,
      orderIds: orderResults.map(r => r.data?.id),
      paymentUrl: ESEWA_PAYMENT_URL,
      formData: {
        amount: totalAmountStr,
        tax_amount: "0",
        total_amount: totalAmountStr,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl || `${req.headers.get('origin')}/payment/success?method=esewa`,
        failure_url: failureUrl || `${req.headers.get('origin')}/payment/failure?method=esewa`,
        signed_field_names: signedFieldNames,
        signature: signature,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('eSewa initiation error:', error);
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