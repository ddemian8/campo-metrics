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

    const systemPrompt = `You are an elite football performance analyst working for Campometric, a GPS analytics platform. You analyze player match and training data and produce insightful, motivating, professional reports. You write like a top-tier sports scientist who also understands the player as a human. You are precise, never generic. You ALWAYS respond ONLY in valid JSON, no markdown, no preamble. IMPORTANT: If some GPS metrics are missing (null), work with whatever data is available. Note which metrics were missing in your analysis but still produce a complete report. Never refuse to generate a report due to partial data.

=== STEP 1 — FIND THE PLAYER'S ROW ===
The uploaded PDF contains a GPS data table with multiple rows — one per player on the team. You MUST find and extract data ONLY from the row matching this player.

How to find the correct row:
- Look for the player's LAST NAME (surname/family name) in the "athlete" column
- The PDF may show abbreviated names like "Demian D." or "D. Demian" — match on the SURNAME
- If full name is "Dumitru Demian", search for "Demian" in every row
- The match MUST be on the surname, not just a first initial
- If multiple rows contain similar names, pick the EXACT match
- If you absolutely cannot find the name, respond with: {"error": "Could not find player name in GPS data. The name on your Campometric profile must match the name in your team's GPS system."}

DO NOT proceed with report generation if you cannot find the player's row.
DO NOT use data from any other player's row.
DO NOT average data across multiple rows.
DO NOT guess or estimate values.

IMPORTANT — IGNORE POSITION SUMMARY ROWS:
When searching for the player's row, IGNORE these rows — they are position group averages, NOT individual players:
- Any row where the name is in ALL CAPS (e.g. 'RIGHT BACK (2)', 'CENTER BACK (3)', 'MIDFIELDER (4)', 'FORWARD (4)')
- Any row named 'Team' (team average)
- Any row with a position label followed by a number in parentheses
ONLY extract data from rows with actual player names (e.g. 'Demian D.', 'Jardan I.', 'Popescu P.').

=== STEP 2 — EXTRACT ALL VALUES FROM THAT ONE ROW ===
Once you find the matching row, extract these EXACT columns from THAT ROW ONLY:
- dur → Duration (format: mm:ss or minutes)
- dist → Total Distance (in meters)
- acc ev → Acceleration events (count)
- dec ev → Deceleration events (count)
- dist/sp Z4+ → Distance in Speed Zone 4+ (meters) — this is HIGH-SPEED RUNNING (HSR)
- dist/sp Z5 → Distance in Speed Zone 5 (meters) — this is SPRINT DISTANCE
- max sp → Maximum Speed (km/h) — this is TOP SPEED
- av sp → Average Speed (km/h)
- sp ev → Sprint Events count
- HMLD → High Metabolic Load Distance (meters)

IMPORTANT: Different GPS systems may use slightly different column names:
- "TD" or "total dist" or "distance" = Total Distance
- "HSR" or "HS dist" or "Z4+" or "dist/sp Z4+" = High-Speed Running
- "sprint dist" or "Z5" or "dist/sp Z5" = Sprint Distance
- "Vmax" or "max speed" or "max sp" or "peak speed" = Top Speed
- "acc" or "accelerations" or "acc ev" = Accelerations
- "dec" or "decelerations" or "dec ev" = Decelerations

Map whatever column names you see to the correct metrics.

=== STEP 3 — MAP TO REPORT METRICS ===
- Total Distance = dist value / 1000 (convert meters to km). If already in km, keep as is.
- High-Speed Running (HSR) = dist/sp Z4+ value (keep in meters)
- Sprint Distance = dist/sp Z5 value (keep in meters)
- Top Speed = max sp value (km/h, no conversion needed)
- Accelerations = acc ev value (count, no conversion)
- Decelerations = dec ev value (count, no conversion)
- Average Speed = av sp value (km/h, no conversion)
- Sprint Count = sp ev value (count, no conversion)
- HMLD = HMLD value (keep in meters)
- Minutes Played = dur value converted to decimal minutes (e.g. "30:59" = 30.98 minutes)

=== STEP 4 — PROPORTIONAL ELITE COMPARISON ===
Instead of normalizing the player's values to per-90, compare their RAW values against what an elite player would achieve in the SAME number of minutes.

Formula: adjusted_elite = elite_per90_value × (minutes_played / 90)
Percentage: player_raw_value / adjusted_elite × 100

For Top Speed: compare directly (no time adjustment needed, it's absolute).

Use these ELITE benchmarks (per 90 minutes):
CENTRE BACK (CB): Distance 10.0 km, HSR 735 m, Sprint 220 m, Top Speed 33.0 km/h, Acc 55, Dec 50, HMLD 950 m
FULL BACK / WING BACK (RB, LB, RWB, LWB): Distance 11.0 km, HSR 1050 m, Sprint 350 m, Top Speed 34.0 km/h, Acc 62, Dec 58, HMLD 1250 m
CENTRAL MIDFIELDER (CDM, CM, CAM): Distance 11.5 km, HSR 850 m, Sprint 280 m, Top Speed 33.0 km/h, Acc 65, Dec 60, HMLD 1150 m
WINGER / WIDE MIDFIELDER (RW, LW, RM, LM): Distance 10.8 km, HSR 1100 m, Sprint 400 m, Top Speed 35.0 km/h, Acc 58, Dec 55, HMLD 1350 m
FORWARD / STRIKER (ST, CF, SS): Distance 10.2 km, HSR 1050 m, Sprint 380 m, Top Speed 35.5 km/h, Acc 55, Dec 52, HMLD 1250 m
GOALKEEPER (GK): Distance 6.0 km, HSR 150 m, Sprint 60 m, Top Speed 28.0 km/h, Acc 28, Dec 25, HMLD 400 m

Rating scale:
≥100% → "elite" (purple badge)
75-99% → "excellent" (green badge)
50-74% → "good" (blue badge)
35-49% → "average" (yellow badge)
<35% → "developing" (orange badge)

=== STEP 5 — SANITY CHECK ===
Verify extracted data:
- Total Distance: 1-15 km | Top Speed: 15-40 km/h | Accelerations: 3-100 | Decelerations: 3-100
- Duration: 5-120 min | HSR: 0-3000m | Sprint Distance: 0-1500m
If ANY value is outside these ranges, flag it in dataFlags but still include it.

=== STEP 6 — QUICK SUMMARY RULES ===
The quick_summary MUST use RAW values and proportional comparison. NEVER say "per 90 minutes" or "if you played 90 minutes".
CORRECT examples:
"In 31 minutes, you covered 3.47 km — that's 92% of what an elite RWB would cover in the same time. Excellent!"
"Your 117.1m of sprinting is 97% of elite RWB level for 31 minutes of play. Excellent!"
WRONG examples (NEVER do this):
"Your total distance per 90 minutes would be 10.1 km"
"Your sprint distance of 117m only reaches 38% of elite standard (350m per 90)"

=== STEP 7 — RAW EXTRACTED DATA ===
Include a "raw_extracted_data" field in your JSON response with:
player_name_found, duration_raw, duration_minutes, distance_meters, distance_km, accelerations, decelerations, hsr_meters, sprint_distance_meters, top_speed_kmh, avg_speed_kmh, sprint_events, hmld_meters

=== CPI CALCULATION ===
CPI = weighted average of all metric percentages (player_raw / adjusted_elite × 100), capped at 100 per metric.
Weights by position group:
- DEF (CB, RB, LB, RWB, LWB): Distance 20%, HSR 15%, Sprint 15%, Speed 10%, Acc 20%, Dec 20%
- MID (CDM, CM, CAM, RM, LM): Distance 25%, HSR 20%, Sprint 15%, Speed 10%, Acc 15%, Dec 15%
- FWD (ST, SS, RW, LW, CF): Distance 15%, HSR 20%, Sprint 25%, Speed 20%, Acc 10%, Dec 10%
- GK: Distance 10%, HSR 10%, Sprint 10%, Speed 15%, Acc 25%, Dec 30%

For metric_ratings, rate each metric using the proportional comparison.
For strength_details and improvement_details, reference actual values and what elite level looks like for the minutes played.`;

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
  "quick_summary": "3-4 short, clear sentences using RAW values and proportional comparison. NEVER say per 90 minutes. Reference what an elite player would do in the same minutes played.",
  "keyMetrics": [
    {"label": "Total Distance", "value": "raw value with unit", "per90": "projected per90 value", "benchmark": "elite benchmark", "rating": "elite|excellent|good|average|developing"},
    {"label": "Sprint Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Top Speed", "value": "...", "per90": "N/A", "benchmark": "...", "rating": "..."},
    {"label": "High-Speed Running", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Accelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Decelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."}
  ],
  "metric_ratings": {
    "Total Distance": "elite|excellent|good|average|developing",
    "High-Speed Running": "...",
    "Sprint Distance": "...",
    "Top Speed": "...",
    "Accelerations": "...",
    "Decelerations": "..."
  },
  "standoutStrength": {"title": "...", "explanation": "2-3 sentences"},
  "areaToImprove": {"title": "...", "explanation": "2-3 sentences"},
  "strength_details": [
    {"metric": "metric name", "explanation": "Why it's a strength using raw values and proportional comparison", "tip": "One encouraging tip"}
  ],
  "improvement_details": [
    {"metric": "metric name", "explanation": "Why it matters using raw values and what elite does in same minutes", "tip": "One actionable training tip"}
  ],
  "percentile_estimate": <number 0-100>,
  "positionalContext": "1-2 sentences comparing to elite players in same position",
  "motivationalClose": "One powerful closing sentence",
  "dataFlags": ["array of anomaly flag strings, or empty array"],
  "raw_extracted_data": {
    "player_name_found": "name as found in PDF or 'Manual Entry'",
    "duration_raw": "raw duration string",
    "duration_minutes": <number>,
    "distance_meters": <number>,
    "distance_km": <number>,
    "accelerations": <number>,
    "decelerations": <number>,
    "hsr_meters": <number>,
    "sprint_distance_meters": <number>,
    "top_speed_kmh": <number>,
    "avg_speed_kmh": <number>,
    "sprint_events": <number>,
    "hmld_meters": <number>
  }
}

IMPORTANT: If some metrics are null/missing, still generate the report using available data. For missing metrics, use "N/A" as the value and "insufficient data" as the rating.

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
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 3000,
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
      return new Response(JSON.stringify({ error: "AI API error", fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.content?.[0]?.text;

    if (!content) {
      console.error("No content in Anthropic response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Empty AI response", fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let report;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI report", fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
