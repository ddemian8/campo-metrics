import { corsHeaders } from '@supabase/supabase-js/cors'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const BodySchema = z.object({
  url: z.string().url().refine(u => u.includes('transfermarkt.com'), {
    message: 'URL must be from transfermarkt.com',
  }),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { url } = parsed.data

    // Try fetching the Transfermarkt page via ScraperAPI if available, otherwise direct
    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY')
    let fetchUrl: string

    if (scraperApiKey) {
      fetchUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}`
    } else {
      fetchUrl = url
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await response.text()

    // Parse club name - look for data-header-label or club info sections
    let club: string | null = null
    let league: string | null = null
    let nationality: string | null = null
    let marketValue: string | null = null

    // Try to extract current club
    const clubMatch = html.match(/<span class="hauptpunkt"[^>]*>([^<]+)<\/span>/) ||
      html.match(/<a[^>]*class="vereinprofil_tooltip"[^>]*>([^<]+)<\/a>/) ||
      html.match(/<span class="info-table__content info-table__content--bold"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/s)
    if (clubMatch) club = clubMatch[1].trim()

    // Try to extract league
    const leagueMatch = html.match(/<a[^>]*class="hauptlink"[^>]*>([^<]+)<\/a>/) ||
      html.match(/data-header-liga[^>]*>([^<]+)</)
    if (leagueMatch) league = leagueMatch[1].trim()

    // Try to extract nationality
    const natMatch = html.match(/<span class="info-table__content info-table__content--bold"[^>]*>\s*<img[^>]*title="([^"]+)"/) ||
      html.match(/<span itemprop="nationality"[^>]*>([^<]+)<\/span>/)
    if (natMatch) nationality = natMatch[1].trim()

    // Try to extract market value
    const mvMatch = html.match(/<a[^>]*class="data-header__market-value-wrapper"[^>]*>([^<]+)/)
    if (mvMatch) marketValue = mvMatch[1].trim()

    if (!club && !league) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract profile data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, club, league, nationality, market_value: marketValue }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching Transfermarkt:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Profile not found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
