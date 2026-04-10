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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const systemPrompt = `You are an elite football performance analyst working for Campometric, a GPS analytics platform. You analyze player match and training data and produce insightful, motivating, professional reports. You write like a top-tier sports scientist who also understands the player as a human. You are precise, never generic, and always normalize stats to per-90-minute values for fair comparison. You compare the player's output to elite benchmarks for their position. You identify ONE standout strength and ONE clear area for improvement. You finish with one specific, actionable training recommendation for the next session. You ALWAYS respond ONLY in valid JSON, no markdown, no preamble.`;

    const gpsData = JSON.stringify({
      duration: playerData.duration || null,
      total_distance_m: playerData.distance || null,
      max_speed_kmh: playerData.maxSpeed || null,
      avg_speed_kmh: playerData.avSpeed || null,
      sprint_events: playerData.spEv || null,
      hmld_m: playerData.hmld || null,
      dist_speed_zone_4_m: playerData.distSpZ4 || null,
      dist_speed_zone_4plus_m: playerData.distSpZ4Plus || null,
      dist_speed_zone_5_m: playerData.distSpZ5 || null,
      accelerations: playerData.accEv || null,
      decelerations: playerData.decEv || null,
    });

    const userMessage = `Analyze this match/training performance and return a JSON object with this exact structure:

{
  "headline": "A short punchy 6-10 word headline capturing the performance",
  "executiveSummary": "2-3 sentences summarizing the session in a motivating tone",
  "performanceScore": <number 0-100>,
  "keyMetrics": [
    {"label": "Total Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "elite|good|average|below"},
    {"label": "Sprint Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Top Speed", "value": "...", "per90": "N/A", "benchmark": "...", "rating": "..."},
    {"label": "High Speed Running", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Accelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Decelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."}
  ],
  "standoutStrength": {"title": "...", "explanation": "2-3 sentences"},
  "areaToImprove": {"title": "...", "explanation": "2-3 sentences"},
  "trainingRecommendation": {"title": "...", "drill": "specific drill name and description", "duration": "e.g. 20 minutes", "intensity": "e.g. 75% max HR"},
  "positionalContext": "1-2 sentences comparing to elite players in same position",
  "motivationalClose": "One powerful closing sentence the player will remember"
}

PLAYER: ${playerData.fullName || 'Unknown'}
POSITION: ${playerData.positionSpecific || playerData.position || 'Unknown'} (${playerData.position || 'Unknown'})
SESSION TYPE: ${playerData.sessionType || 'match'}
TRAINING DAY: ${playerData.mdDay || 'N/A'}
MATCH: ${playerData.opponent || 'N/A'}
MINUTES PLAYED: ${playerData.minutesPlayed || playerData.duration || 'N/A'}
GPS DATA: ${gpsData}

Return ONLY the JSON object, nothing else.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
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
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.content?.[0]?.text;

    let report;
    try {
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
