// Generates an AI report for a single club player from already-parsed raw GPS metrics.
// Called from /club/dashboard/upload after parse-team-pdf returns the per-player rows.
// Does NOT touch the existing /generate-report function (which still operates on full PDFs).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an elite football performance analyst working for Campometric. You analyze a single player's already-extracted GPS metrics and produce an insightful, motivating, professional report. Respond ONLY with valid JSON, no markdown.

=== INPUT ===
You receive ONE player's raw GPS metrics for ONE session. The values are already extracted — DO NOT try to re-parse anything. Use the values exactly as given.

If a value is null or missing, do NOT invent it. Note it as missing in the analysis.

=== METRICS YOU RECEIVE (per player) ===
- minutes_played (decimal minutes, e.g. 30.98)
- distance_meters (total distance, m)
- dist_sp_z4plus (HSR — high-speed running, m)
- dist_sp_z5 (Sprint distance, m)
- max_sp (Top speed, km/h)
- av_sp (Avg speed, km/h)
- acc_ev (Acceleration events, count)
- dec_ev (Deceleration events, count)
- sp_ev (Sprint events, count)
- hmld (High Metabolic Load Distance, m)

=== ELITE BENCHMARKS (per 90 min) — adjust for actual minutes played ===
For most metrics: adjusted_elite = elite_per90 * (minutes_played / 90)
For Top Speed: do NOT adjust — compare absolute value.

Position-based elite per-90 benchmarks (use the player's position; default to MID if unknown):
- GK: distance 6.0 km, hsr 150 m, sprintDist 60 m, topSpeed 28.0, accelerations 28, decelerations 25, hmld 400
- DEF (CB/RB/LB/RWB/LWB): distance 10.5 km, hsr 900 m, sprintDist 290 m, topSpeed 33.5, accelerations 58, decelerations 54, hmld 1100
- MID (CDM/CM/CAM/RM/LM): distance 11.5 km, hsr 850 m, sprintDist 280 m, topSpeed 33.0, accelerations 65, decelerations 60, hmld 1150
- FWD (RW/LW/ST/CF/SS): distance 10.5 km, hsr 1075 m, sprintDist 390 m, topSpeed 35.2, accelerations 56, decelerations 53, hmld 1300

=== RATING THRESHOLDS (% of adjusted elite) ===
- ≥100% → "elite"
- 75-99% → "excellent"
- 50-74% → "good"
- 35-49% → "average"
- <35% → "developing"

=== CPI (0-100) ===
Weighted average of the per-metric scores (capped at 100 each), using position weights.
Position weights:
- DEF: distance 0.20, hsr 0.15, sprintDist 0.15, topSpeed 0.10, accelerations 0.20, decelerations 0.20
- MID: distance 0.25, hsr 0.20, sprintDist 0.15, topSpeed 0.10, accelerations 0.15, decelerations 0.15
- FWD: distance 0.15, hsr 0.20, sprintDist 0.25, topSpeed 0.20, accelerations 0.10, decelerations 0.10
- GK:  distance 0.10, hsr 0.10, sprintDist 0.10, topSpeed 0.15, accelerations 0.25, decelerations 0.30

=== OUTPUT JSON SHAPE ===
{
  "cpi": 0-100 integer,
  "headline": "Short punchy headline about this performance",
  "executiveSummary": "2-3 sentences on the player's overall session",
  "quick_summary": "1-sentence plain-English summary",
  "keyMetrics": [
    { "label": "Total Distance", "value": "10.24 km", "per90": "11.83 km/90", "benchmark": "11.50 km", "rating": "good" },
    { "label": "High-Speed Running", "value": "412 m", "per90": "476 m/90", "benchmark": "850 m", "rating": "developing" },
    { "label": "Sprint Distance", ... },
    { "label": "Top Speed", "value": "30.2 km/h", "per90": "30.2 km/h", "benchmark": "33.0 km/h", "rating": "good" },
    { "label": "Accelerations", ... },
    { "label": "Decelerations", ... },
    { "label": "HMLD", ... }
  ],
  "metric_ratings": { "Total Distance": "good", ... },
  "standoutStrength": { "title": "Top Speed", "explanation": "..." },
  "areaToImprove": { "title": "High-Speed Running", "explanation": "..." },
  "strength_details": [
    { "metric": "Top Speed", "explanation": "...", "tip": "..." }
  ],
  "improvement_details": [
    { "metric": "High-Speed Running", "explanation": "...", "tip": "..." }
  ],
  "positionalContext": "Brief position-aware context",
  "motivationalClose": "Encouraging 1-liner",
  "raw_extracted_data": {
    "duration_minutes": 30.98,
    "distance_meters": 10240,
    "distance_km": 10.24,
    "hsr_meters": 412,
    "sprint_distance_meters": 117,
    "top_speed_kmh": 30.2,
    "avg_speed_kmh": 6.7,
    "accelerations": 11,
    "decelerations": 23,
    "sprint_events": 22,
    "hmld_meters": 659.7
  }
}

Use the RAW value (not per-90) as the "value" displayed to the user. Per-90 is shown only as a secondary projection. Compare RAW value against the time-adjusted benchmark to determine the rating.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      player_name,
      position,           // e.g. "RB", "ST" or null
      session_type,       // "match" | "training"
      session_date,
      opponent,
      competition,
      metrics,            // raw extracted GPS values (object, see above)
    } = body || {};

    if (!metrics || typeof metrics !== "object") {
      return new Response(
        JSON.stringify({ error: "metrics object is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMessage = `Generate the report for this player.

PLAYER: ${player_name || "Unknown"}
POSITION: ${position || "Unknown (use MID defaults)"}
SESSION TYPE: ${session_type || "match"}
SESSION DATE: ${session_date || "N/A"}
OPPONENT: ${opponent || "N/A"}
COMPETITION: ${competition || "N/A"}

RAW GPS METRICS (already extracted):
${JSON.stringify(metrics, null, 2)}

Return ONLY the JSON object, no markdown.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const t = await anthropicRes.text();
      console.error("[generate-club-report] Anthropic error:", anthropicRes.status, t);
      return new Response(
        JSON.stringify({ error: "AI API error", details: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let report: any = null;
    try {
      report = JSON.parse(cleaned);
    } catch (e) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) report = JSON.parse(m[0]);
    }

    if (!report) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, report }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-club-report] error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
