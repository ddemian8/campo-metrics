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

    const systemPrompt = `You are an elite football performance analyst working for Campometric, a GPS analytics platform. You analyze player match and training data and produce insightful, motivating, professional reports. You write like a top-tier sports scientist who also understands the player as a human. You are precise, never generic, and always normalize stats to per-90-minute values for fair comparison. You compare the player's output to elite benchmarks for their position. You ALWAYS respond ONLY in valid JSON, no markdown, no preamble. IMPORTANT: If some GPS metrics are missing (null), work with whatever data is available. Note which metrics were missing in your analysis but still produce a complete report. Never refuse to generate a report due to partial data.

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

Return the CPI as 'cpi' in the JSON response. Do NOT include 'performanceScore' or 'trainingRecommendation' in the response.

BENCHMARK VALUES for semi-professional level (use these for comparison):
DEFENDERS (CB, RB, LB, RWB, LWB): Distance 9.8 km/90, HSR 520 m/90, Sprint Distance 180 m/90, Top Speed 30.5 km/h, Accelerations 45/90, Decelerations 42/90
MIDFIELDERS (CDM, CM, CAM, RM, LM): Distance 10.5 km/90, HSR 620 m/90, Sprint Distance 210 m/90, Top Speed 30.0 km/h, Accelerations 52/90, Decelerations 48/90
FORWARDS (ST, CF, SS, RW, LW): Distance 9.5 km/90, HSR 680 m/90, Sprint Distance 280 m/90, Top Speed 31.5 km/h, Accelerations 48/90, Decelerations 44/90
GOALKEEPER (GK): Distance 5.5 km/90, HSR 120 m/90, Sprint Distance 50 m/90, Top Speed 24.0 km/h, Accelerations 20/90, Decelerations 18/90

For metric_ratings, rate each metric as one of: "elite", "above_average", "average", "below_average", "needs_improvement" based on how the player's per-90 value compares to the benchmarks above.
- elite: 20%+ above benchmark
- above_average: 5-20% above benchmark
- average: within 5% of benchmark
- below_average: 5-20% below benchmark
- needs_improvement: 20%+ below benchmark

ANOMALY DETECTION: Before generating the report, check if the GPS data seems realistic for the player's stated position and minutes played. Flag any suspicious metrics in a new field 'dataFlags' in your JSON response.

Examples of flags:
- A goalkeeper with 12km total distance in 90 minutes → flag: 'Unusually high distance for GK'
- A player with 35+ km/h top speed in a lower league → flag: 'Top speed unusually high — verify data source'
- Sprint distance higher than 20% of total distance → flag: 'Sprint-to-distance ratio unusually high'
- 0 accelerations but high sprint count → flag: 'Inconsistent acceleration vs sprint data'

Return dataFlags as an array of strings. If no anomalies, return empty array [].`;

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
  "quick_summary": "3-4 short, clear sentences that a 16-year-old football player would understand. No jargon. Be specific about the numbers. Example: 'You covered a lot of ground today — more than most midfielders at your level. Your top speed was impressive, reaching 31.2 km/h. You could improve your high-intensity sprints — you had fewer than average for your position. Overall, this was a GOOD session. Keep working on explosive movements to reach EXCELLENT.'",
  "keyMetrics": [
    {"label": "Total Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "elite|above_average|average|below_average|needs_improvement"},
    {"label": "Sprint Distance", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Top Speed", "value": "...", "per90": "N/A", "benchmark": "...", "rating": "..."},
    {"label": "High-Speed Running", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Accelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."},
    {"label": "Decelerations", "value": "...", "per90": "...", "benchmark": "...", "rating": "..."}
  ],
  "metric_ratings": {
    "Total Distance": "elite|above_average|average|below_average|needs_improvement",
    "High-Speed Running": "...",
    "Sprint Distance": "...",
    "Top Speed": "...",
    "Accelerations": "...",
    "Decelerations": "..."
  },
  "standoutStrength": {"title": "...", "explanation": "2-3 sentences"},
  "areaToImprove": {"title": "...", "explanation": "2-3 sentences"},
  "strength_details": [
    {"metric": "metric name", "explanation": "Why it's a strength (1 sentence)", "tip": "One encouraging tip"}
  ],
  "improvement_details": [
    {"metric": "metric name", "explanation": "Why it matters (1 sentence)", "tip": "One actionable training tip"}
  ],
  "percentile_estimate": <number 0-100, estimated percentile for this position based on the data>,
  "positionalContext": "1-2 sentences comparing to elite players in same position",
  "motivationalClose": "One powerful closing sentence the player will remember",
  "dataFlags": ["array of anomaly flag strings, or empty array if none"]
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
