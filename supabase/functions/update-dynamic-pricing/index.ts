import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get optional course_id from request body
    let courseId: string | null = null;
    try {
      const body = await req.json();
      courseId = body.course_id || null;
    } catch {
      // No body, update all courses
    }

    if (courseId) {
      // Update single course
      const { data, error } = await supabase.rpc('update_course_dynamic_pricing', { 
        course_uuid: courseId 
      });

      if (error) {
        console.error('Error updating course price:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get updated course data
      const { data: course } = await supabase
        .from('courses')
        .select('current_price, min_price, max_price, last_price_update')
        .eq('id', courseId)
        .single();

      return new Response(
        JSON.stringify({ success: true, course }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update all courses
      const { data, error } = await supabase.rpc('update_all_dynamic_prices');

      if (error) {
        console.error('Error updating all prices:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, updated_count: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in update-dynamic-pricing:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});