// Parses a team GPS PDF and returns the list of detected players + their raw row data.
// Used by /club/dashboard/upload to know which players are in the session.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a GPS data extractor for football team performance PDFs.

The PDF contains a TABLE with one row per player. Your job is to extract EVERY player row.

CRITICAL RULES:
1. Find the data table. Skip the title, header, footer, position-group summary rows like "FORWARD (4)", "MIDFIELD (3)", "DEFENDER (4)", "GOALKEEPER (1)", and any "TEAM AVERAGE" / "TOTAL" rows.
2. For each real player row, extract these exact metrics. Use null when missing:
   - pdf_name: the name as printed (e.g. "Demian D.", "Jardan I.")
   - minutes_played: total minutes (integer)
   - distance: total distance in meters (number)
   - dist_sp_z4plus: high-speed running distance in meters (HSR, zone 4+)
   - dist_sp_z5: sprint distance in meters (zone 5)
   - max_sp: top speed in km/h
   - acc_ev: number of accelerations (integer)
   - dec_ev: number of decelerations (integer)
   - sp_ev: number of sprints (integer)
   - hmld: high metabolic load distance in meters
3. Try to detect the session_date (ISO format YYYY-MM-DD) and a session_type hint ("match" or "training") from headers, opponent text, or competition labels.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no commentary:
{
  "session_date": "YYYY-MM-DD" | null,
  "session_type": "match" | "training" | null,
  "opponent": string | null,
  "competition": string | null,
  "players": [
    { "pdf_name": "Demian D.", "minutes_played": 90, "distance": 10240, "dist_sp_z4plus": 412, "dist_sp_z5": 117, "max_sp": 30.2, "acc_ev": 11, "dec_ev": 23, "sp_ev": 8, "hmld": 659.7 }
  ]
}`;

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

    const { pdf_base64 } = await req.json();
    if (!pdf_base64 || typeof pdf_base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "pdf_base64 (string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdf_base64,
                },
              },
              {
                type: "text",
                text: "Extract every player row from this team GPS PDF. Return only the JSON object as specified.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[parse-team-pdf] Anthropic error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Claude API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text ?? "";

    // Extract JSON object from response (handle stray fenced code)
    let parsed: any = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[parse-team-pdf] JSON parse failed:", e, text);
      }
    }

    if (!parsed || !Array.isArray(parsed.players)) {
      return new Response(
        JSON.stringify({
          error: "Could not parse player data from PDF",
          raw_response: text,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[parse-team-pdf] error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
