import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required', difficulty: 'Medium' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    
    if (!HUGGINGFACE_API_KEY) {
      console.warn('HUGGINGFACE_API_KEY not configured, using fallback');
      return new Response(
        JSON.stringify({ difficulty: 'Medium', confidence: 0, message: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const courseText = `${title}. ${description || ''}`.trim();
    
    // Use zero-shot classification with BART
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: courseText,
          parameters: {
            candidate_labels: ['beginner level easy introductory', 'intermediate level moderate', 'advanced level hard complex expert'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ difficulty: 'Medium', confidence: 0, message: 'AI service temporarily unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    
    // Map the classification to difficulty levels
    const labels = result.labels || [];
    const scores = result.scores || [];
    
    let difficulty = 'Medium';
    let confidence = 0;
    
    if (labels.length > 0 && scores.length > 0) {
      const topLabel = labels[0].toLowerCase();
      confidence = Math.round(scores[0] * 100);
      
      if (topLabel.includes('beginner') || topLabel.includes('easy')) {
        difficulty = 'Easy';
      } else if (topLabel.includes('advanced') || topLabel.includes('hard') || topLabel.includes('expert')) {
        difficulty = 'Hard';
      } else {
        difficulty = 'Medium';
      }
    }

    return new Response(
      JSON.stringify({ difficulty, confidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error predicting difficulty:', error);
    return new Response(
      JSON.stringify({ difficulty: 'Medium', confidence: 0, message: 'Error processing request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});