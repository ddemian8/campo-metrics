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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const extractionPrompt = `You are a GPS football performance data extraction specialist. 
Extract ALL GPS performance metrics you can find from this ${fileType === "pdf" ? "PDF document" : "screenshot/image"}.

Look for these specific metrics (they may be labeled differently across platforms like STATSports, Catapult, gpexe, Polar, Playertek):
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
- Heart rate max / avg (if available)
- Player/Athlete name (if visible)

Common alternative labels:
- "High Intensity Distance" = HMLD
- "HSR" or "High Speed Running" = dist_sp_z5 or similar
- "Sprints" = sp_ev
- "Max Vel" or "Peak Speed" = max_sp
- "Tot. Dist" or "Total Dist." = distance

Return ONLY a valid JSON object with this exact structure (use null for any metric you cannot find):
{
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
  "athlete_name": "string or null",
  "extracted_metrics_count": number_of_non_null_metrics,
  "platform_detected": "STATSports|Catapult|gpexe|Polar|Playertek|unknown"
}

IMPORTANT: 
- Convert km to meters if distance is in km (multiply by 1000)
- Convert m/s to km/h if speed is in m/s (multiply by 3.6)
- If a table has multiple players, try to extract data for ALL visible players and return the FIRST player's data
- Return ONLY the JSON, no markdown, no explanation`;

    // Use Lovable AI Gateway with Gemini vision model
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "application/octet-stream"};base64,${fileBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI extraction error:", response.status, errText);
      return new Response(JSON.stringify({ success: false, error: "Failed to extract data from file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ success: false, error: "No data could be extracted from the file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extracted;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse extraction result:", content);
      return new Response(JSON.stringify({ success: false, error: "Could not parse extracted data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we got any usable metrics
    const usableFields = ["distance", "max_sp", "av_sp", "sp_ev", "hmld", "dist_sp_z4", "dist_sp_z5", "acc_ev", "dec_ev", "duration"];
    const foundCount = usableFields.filter((f) => extracted[f] !== null && extracted[f] !== undefined).length;

    if (foundCount === 0) {
      return new Response(JSON.stringify({ success: false, error: "No GPS metrics found in the file" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: extracted, metricsFound: foundCount }), {
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
