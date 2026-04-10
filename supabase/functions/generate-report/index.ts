import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { playerData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional football performance analyst. Generate a structured performance report for a footballer based on their GPS session data. 

Write in a clear, professional but motivating tone — like a real performance report a club analyst would write. 

Structure your response as JSON with these exact fields:
{
  "performance_score": number (0-100),
  "score_label": string (e.g. "Strong Performance", "Excellent Output", "Below Average"),
  "headline": string (one sentence summary, max 15 words),
  "narrative": string (3-4 sentences, professional analysis of the session),
  "strengths": array of 2-3 strings (what the player did well),
  "areas_to_improve": array of 1-2 strings (constructive feedback),
  "position_ranking_percentile": number (0-100, estimated vs position average),
  "vs_team_average": string (e.g. "+14% above team average distance" or "-8% below team average sprints"),
  "md_context_note": string (short note about the MD day context),
  "next_session_recommendation": string (one sentence recommendation for the next training session)
}

Return ONLY the JSON. No markdown, no backticks, no explanation.`;

    const userMessage = `Player: ${playerData.fullName}, ${playerData.age} years old, ${playerData.height}cm${playerData.weight ? `, ${playerData.weight}kg` : ''}
Position: ${playerData.position}
Team: ${playerData.teamName}, ${playerData.league}
Session type: ${playerData.sessionType} — ${playerData.mdDay}
Date: ${playerData.sessionDate}

GPS Data:
- Duration: ${playerData.duration || 'N/A'}
- Total distance: ${playerData.distance || 'N/A'}m
- Max speed: ${playerData.maxSpeed || 'N/A'} km/h
- Average speed: ${playerData.avSpeed || 'N/A'} km/h
- Speed events (sprints): ${playerData.spEv || 'N/A'}
- HMLD (high metabolic load distance): ${playerData.hmld || 'N/A'}m
- Distance Speed Zone 4: ${playerData.distSpZ4 || 'N/A'}m
- Distance Speed Zone 4+: ${playerData.distSpZ4Plus || 'N/A'}m
- Distance Speed Zone 5: ${playerData.distSpZ5 || 'N/A'}m
- Acceleration events: ${playerData.accEv || 'N/A'}
- Deceleration events: ${playerData.decEv || 'N/A'}

Generate the performance report JSON as instructed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    let report;
    try {
      // Strip potential markdown code fences
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI report" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
