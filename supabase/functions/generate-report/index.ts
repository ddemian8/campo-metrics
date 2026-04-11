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

    const systemPrompt = `You are an elite football performance analyst working for Campometric, a GPS analytics platform. You analyze player match and training data and produce insightful, motivating, professional reports. You write like a top-tier sports scientist who also understands the player as a human. You are precise, never generic, and always normalize stats to per-90-minute values for fair comparison. You compare the player's output to elite benchmarks for their position. You identify ONE standout strength and ONE clear area for improvement. You ALWAYS respond ONLY in valid JSON, no markdown, no preamble. IMPORTANT: If some GPS metrics are missing (null), work with whatever data is available. Note which metrics were missing in your analysis but still produce a complete report. Never refuse to generate a report due to partial data.

Calculate a Campometric Performance Index (CPI) score from 0-100 based on the player's GPS data. The CPI is a weighted composite score comparing the player's per-90 normalized metrics against elite benchmarks for their specific position.

Weights by position zone:
- DEF (CB, RB, LB, RWB, LWB): Distance/90 20%, HSR/90 15%, Sprint Distance/90 15%, Top Speed 10%, Accelerations/90 20%, Decelerations/90 20%
- MID (CDM, CM, CAM, RM, LM): Distance/90 25%, HSR/90 20%, Sprint Distance/90 15%, Top Speed 10%, Accelerations/90 15%, Decelerations/90 15%
- FWD (ST, SS, RW, LW, CF): Distance/90 15%, HSR/90 20%, Sprint Distance/90 25%, Top Speed 20%, Accelerations/90 10%, Decelerations/90 10%
- GK: Distance/90 10%, HSR/90 10%, Sprint Distance/90 10%, Top Speed 15%, Accelerations/90 25%, Decelerations/90 30%

CPI Scoring scale:
90-100 = Elite (top 5% professional level)
75-89 = Excellent
60-74 = Good
45-59 = Average
30-44 = Below average
0-29 = Needs improvement

Return the CPI as 'cpi' in the JSON response. Do NOT include 'performanceScore' or 'trainingRecommendation' in the response.`;

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

    const userMessage = `The following GPS data is for ONE specific player extracted from a team session PDF or entered manually. Analyze ONLY this player's individual performance.

Analyze this match/training performance and return a JSON object with this exact structure:

{
  "headline": "A short punchy 6-10 word headline capturing the performance",
  "executiveSummary": "2-3 sentences summarizing the session in a motivating tone",
  "cpi": <number 0-100>,
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
  "positionalContext": "1-2 sentences comparing to elite players in same position",
  "motivationalClose": "One powerful closing sentence the player will remember"
}

IMPORTANT: If some metrics are null/missing, still generate the report using available data. For missing metrics, use "N/A" as the value and "insufficient data" as the rating. Note any data gaps in the executive summary.

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
        model: "claude-sonnet-4-5-20250514",
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
