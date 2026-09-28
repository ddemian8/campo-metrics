import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileType, mimeType } = await req.json();

    if (!fileBase64) {
      return new Response(JSON.stringify({ success: false, error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const extractionPrompt = `You are a GPS football performance data extraction specialist.
Extract ALL players' GPS performance metrics from this ${fileType === "pdf" ? "PDF document" : "screenshot/image"}.

This file likely contains a TEAM report with data for MULTIPLE players in a table format.

Look for these specific metrics per player (they may be labeled differently across platforms like STATSports, Catapult, gpexe, Polar, Playertek):
- Player/Athlete name
- Duration (session length in mm:ss or minutes)
- Total Distance (in meters or km)
- Max Speed / Top Speed (in km/h or m/s)
- Average Speed (in km/h)
- Sprint events / Sprint count
- HMLD / High Metabolic Load Distance (in meters)
- Distance in Speed Zone 4 (in meters)
- Distance in Speed Zone 4+ (in meters)
- Distance in Speed Zone 5 / Sprint Distance (in meters)
- Acceleration events count
- Deceleration events count
- High Speed Running distance / HSR (in meters)
- Minutes played

Common alternative labels:
- "High Intensity Distance" = HMLD
- "HSR" or "High Speed Running" = dist_sp_z5 or similar
- "Sprints" = sp_ev
- "Max Vel" or "Peak Speed" = max_sp
- "Tot. Dist" or "Total Dist." = distance

Return ONLY a valid JSON object with this exact structure:
{
  "multi_player": true_or_false,
  "platform_detected": "STATSports|Catapult|gpexe|Polar|Playertek|unknown",
  "players": [
    {
      "athlete_name": "Player Full Name",
      "duration": "mm:ss format string or null",
      "distance": number_in_meters_or_null,
      "max_sp": number_in_kmh_or_null,
      "av_sp": number_in_kmh_or_null,
      "sp_ev": number_or_null,
      "hmld": number_in_meters_or_null,
      "dist_sp_z4": number_in_meters_or_null,
      "dist_sp_z4plus": number_in_meters_or_null,
      "dist_sp_z5": number_in_meters_or_null,
      "acc_ev": number_or_null,
      "dec_ev": number_or_null,
      "minutes_played": number_or_null
    }
  ]
}

IMPORTANT:
- Convert km to meters if distance is in km (multiply by 1000)
- Convert m/s to km/h if speed is in m/s (multiply by 3.6)
- If the document contains data for MULTIPLE players (a team report), include ALL players in the "players" array and set "multi_player" to true
- If only ONE player's data is found, still use the "players" array with one entry and set "multi_player" to false
- Extract the full name of each player exactly as shown in the document
- Return ONLY the JSON, no markdown, no explanation`;

    let mediaType = mimeType || "image/png";
    const isPdf = fileType === "pdf" || mediaType === "application/pdf";
    
    const content: any[] = [{ type: "text", text: extractionPrompt }];
    
    if (isPdf) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: fileBase64,
        },
      });
    } else {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) {
        mediaType = "image/png";
      }
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: fileBase64,
        },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        messages: [
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic extraction error:", response.status, errText);
      return new Response(JSON.stringify({ success: false, error: "Failed to extract data from file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const textContent = aiResult.content?.[0]?.text;

    if (!textContent) {
      return new Response(JSON.stringify({ success: false, error: "No data could be extracted from the file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extracted;
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse extraction result:", textContent);
      return new Response(JSON.stringify({ success: false, error: "Could not parse extracted data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate we got players array
    const players = extracted.players;
    if (!Array.isArray(players) || players.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No GPS metrics found in the file" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count usable metrics across all players
    const usableFields = ["distance", "max_sp", "av_sp", "sp_ev", "hmld", "dist_sp_z4", "dist_sp_z5", "acc_ev", "dec_ev", "duration"];
    const totalFound = players.reduce((sum: number, p: any) => {
      return sum + usableFields.filter((f) => p[f] !== null && p[f] !== undefined).length;
    }, 0);

    if (totalFound === 0) {
      return new Response(JSON.stringify({ success: false, error: "No GPS metrics found in the file" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      multi_player: extracted.multi_player || players.length > 1,
      platform_detected: extracted.platform_detected || "unknown",
      players,
      metricsFound: totalFound,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-gps-data error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
