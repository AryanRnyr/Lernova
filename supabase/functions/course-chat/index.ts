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
    const { message, courseContext, chatHistory } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI Gateway instead of Hugging Face for better quality responses
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ 
          response: "I'm sorry, I'm unable to respond right now. The AI service is not configured.",
          error: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt with course context
    const systemPrompt = `You are a helpful Course Assistant for the course "${courseContext.title}". 

Course Description: ${courseContext.description || 'No description provided.'}

Course Curriculum:
${courseContext.sections?.map((s: any, i: number) => 
  `Section ${i + 1}: ${s.title}\n${s.subsections?.map((sub: any, j: number) => `  ${i + 1}.${j + 1} ${sub.title}`).join('\n') || ''}`
).join('\n') || 'No curriculum available.'}

Your role is to:
1. Answer questions about this specific course
2. Explain concepts that might be covered in the course
3. Help students understand what they'll learn
4. Provide study tips related to the course content

Keep responses concise (under 150 words) and helpful. If asked about topics outside this course, politely redirect to course-related questions.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []).slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "I'm receiving too many requests right now. Please try again in a moment.",
            error: true 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: "The AI service quota has been exceeded. Please try again later.",
            error: true 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          response: "I'm having trouble responding right now. Please try again.",
          error: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const assistantMessage = result.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in course chat:', error);
    return new Response(
      JSON.stringify({ 
        response: "An error occurred while processing your request. Please try again.",
        error: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});