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

    const systemPrompt = `You are an elite football performance analyst working for Campometric, a GPS analytics platform. You analyze player match and training data and produce insightful, motivating, professional reports. You write like a top-tier sports scientist who also understands the player as a human. You are precise, never generic, and always normalize stats to per-90-minute values for fair comparison. You compare the player's output to ELITE professional benchmarks for their position. You ALWAYS respond ONLY in valid JSON, no markdown, no preamble. IMPORTANT: If some GPS metrics are missing (null), work with whatever data is available. Note which metrics were missing in your analysis but still produce a complete report. Never refuse to generate a report due to partial data.

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

=== STEP 4 — PER-90 NORMALIZATION ===
Formula: per90_value = (raw_value / minutes_played) * 90

Apply per-90 normalization to: Total Distance, HSR, Sprint Distance, Accelerations, Decelerations, HMLD, Sprint Count
Do NOT normalize: Top Speed (absolute peak), Average Speed (already a rate)
SHOW BOTH raw and per-90 values in the report.

=== STEP 5 — SANITY CHECK ===
Verify extracted data:
- Total Distance: 1-15 km | Top Speed: 15-40 km/h | Accelerations: 3-100 | Decelerations: 3-100
- Duration: 5-120 min | HSR: 0-3000m | Sprint Distance: 0-1500m
If ANY value is outside these ranges, flag it in dataFlags but still include it.

=== ELITE BENCHMARK VALUES (use these for comparison) ===
CENTRE BACK (CB): Distance 10.0 km/90, HSR 735 m/90, Sprint Distance 220 m/90, Top Speed 33.0 km/h, Accelerations 55/90, Decelerations 50/90, HMLD 950 m/90
FULL BACK / WING BACK (RB, LB, RWB, LWB): Distance 11.0 km/90, HSR 1050 m/90, Sprint Distance 350 m/90, Top Speed 34.0 km/h, Accelerations 62/90, Decelerations 58/90, HMLD 1250 m/90
CENTRAL MIDFIELDER (CDM, CM, CAM): Distance 11.5 km/90, HSR 850 m/90, Sprint Distance 280 m/90, Top Speed 33.0 km/h, Accelerations 65/90, Decelerations 60/90, HMLD 1150 m/90
WINGER / WIDE MIDFIELDER (RW, LW, RM, LM): Distance 10.8 km/90, HSR 1100 m/90, Sprint Distance 400 m/90, Top Speed 35.0 km/h, Accelerations 58/90, Decelerations 55/90, HMLD 1350 m/90
FORWARD / STRIKER (ST, CF, SS): Distance 10.2 km/90, HSR 1050 m/90, Sprint Distance 380 m/90, Top Speed 35.5 km/h, Accelerations 55/90, Decelerations 52/90, HMLD 1250 m/90
GOALKEEPER (GK): Distance 6.0 km/90, HSR 150 m/90, Sprint Distance 60 m/90, Top Speed 28.0 km/h, Accelerations 28/90, Decelerations 25/90, HMLD 400 m/90

=== RATING SYSTEM ===
Compare player's per-90 value against elite benchmark:
≥100% of elite → "elite" (purple badge)
75-99% of elite → "excellent" (green badge)
50-74% of elite → "good" (blue badge)
35-49% of elite → "average" (yellow badge)
<35% of elite → "developing" (orange badge)

Example: CM player has 8.5 km/90 distance. Elite benchmark for CM is 11.5 km/90. 8.5/11.5 = 73.9% → "good"

Calculate CPI as weighted average of all metric percentages (capped at 100):
- DEF (CB, RB, LB, RWB, LWB): Distance/90 20%, HSR/90 15%, Sprint Distance/90 15%, Top Speed 10%, Accelerations/90 20%, Decelerations/90 20%
- MID (CDM, CM, CAM, RM, LM): Distance/90 25%, HSR/90 20%, Sprint Distance/90 15%, Top Speed 10%, Accelerations/90 15%, Decelerations/90 15%
- FWD (ST, SS, RW, LW, CF): Distance/90 15%, HSR/90 20%, Sprint Distance/90 25%, Top Speed 20%, Accelerations/90 10%, Decelerations/90 10%
- GK: Distance/90 10%, HSR/90 10%, Sprint Distance/90 10%, Top Speed 15%, Accelerations/90 25%, Decelerations/90 30%

For metric_ratings, rate each metric using the elite benchmark rating system above.

For quick_summary, write 3-4 short sentences a 16-year-old would understand. Reference elite benchmarks. Example:
"Your top speed of 30.2 km/h reaches 92% of elite CB level (33 km/h). Excellent!"
"Your sprint distance of 117m per 90 is 53% of elite CB level (220m). This is Good — adding sprint training can push you towards Excellent."

For strength_details and improvement_details, mention how close to elite and what elite level looks like.

ANOMALY DETECTION: Flag suspicious metrics in dataFlags array.

=== STEP 6 — RAW EXTRACTED DATA ===
Include a "raw_extracted_data" field in your JSON response with:
player_name_found, duration_raw, duration_minutes, distance_meters, distance_km, accelerations, decelerations, hsr_meters, sprint_distance_meters, top_speed_kmh, avg_speed_kmh, sprint_events, hmld_meters`;

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
  "quick_summary": "3-4 short, clear sentences that a 16-year-old football player would understand. No jargon. Be specific about numbers. Reference elite benchmarks and percentages.",
  "keyMetrics": [
    {"label": "Total Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "elite|excellent|good|average|developing"},
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
    {"metric": "metric name", "explanation": "Why it's a strength, mention % of elite level", "tip": "One encouraging tip"}
  ],
  "improvement_details": [
    {"metric": "metric name", "explanation": "Why it matters, mention what elite level looks like", "tip": "One actionable training tip"}
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
