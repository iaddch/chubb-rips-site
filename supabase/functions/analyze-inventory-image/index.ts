const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const systemPrompt = `You are an expert Pokémon TCG scanner. Identify the Pokémon card or product in the image.

**Identification & Formatting Guidelines:**
1. Identify the card name and artwork.
2. Look for the collector number on the card (e.g., '125/197', 'GG35/GG70', or '043'). If the camera quality is too blurry to read it, use your knowledge of the card artwork to provide the correct real-world collector number for that printing.
3. Do NOT include the Set Name or expansion name (like 'Obsidian Flames' or '151') in the output.

**Output Rules:**
Respond ONLY with a raw JSON object containing the name formatted as 'Name [Space] Collector Number':
{
  "name": "Charizard ex 125/197" (or "Pikachu 043" / "Sealed Product Name"),
  "type": "Card" | "Sealed Product"
}`

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const verifyCardAgainstCatalog = async (name: string) => {
  const match = name.match(/^(.+?)\s+([a-zA-Z]*\d+(?:\/[a-zA-Z]*\d+)?)\s*$/)
  if (!match) return false

  const [, cardName, fullCollectorNumber] = match
  const collectorNumber = fullCollectorNumber.split('/')[0].trim()
  if (!collectorNumber) return false

  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`number:${collectorNumber}`)}&pageSize=250`,
  )
  if (!response.ok) throw new Error('The card catalog could not be reached.')

  const catalog = await response.json()
  return Array.isArray(catalog.data) && catalog.data.some((card: { name?: string; number?: string }) => {
    const isNameMatch = normalize(card.name || '') === normalize(cardName)
    const isNumberMatch = normalize(card.number || '') === normalize(collectorNumber)
    return isNameMatch && isNumberMatch
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const { image } = await request.json()

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ error: 'Please provide a valid image capture.' }, 400)
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY is not configured.')
      return json({ error: 'Image recognition is temporarily unavailable.' }, 500)
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify the Pokémon product in this image.' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
      }),
    })

    if (!openAiResponse.ok) {
      console.error('OpenAI Vision request failed:', openAiResponse.status)
      return json({ error: 'Image recognition is temporarily unavailable. Please try again.' }, 502)
    }

    const openAiData = await openAiResponse.json()
    const content = openAiData.choices?.[0]?.message?.content
    let result: { name?: unknown; type?: unknown }

    try {
      result = JSON.parse(content)
    } catch {
      return json({ error: 'We could not identify a Pokémon product in that image.' }, 400)
    }

    const name = typeof result.name === 'string' ? result.name.trim() : ''
    const type = result.type
    if (!name || (type !== 'Card' && type !== 'Sealed Product')) {
      return json({ error: 'We could not identify a Pokémon product in that image.' }, 400)
    }

    if (type === 'Card') {
      const isVerified = await verifyCardAgainstCatalog(name)
      if (!isVerified) {
        return json({ error: 'The card name and collector number could not be verified. Please scan again.' }, 400)
      }
    }

    return json({ name, type })
  } catch (error) {
    if (error instanceof Error && error.message === 'The card catalog could not be reached.') {
      console.error('Pokémon TCG catalog request failed:', error)
      return json({ error: 'Card verification is temporarily unavailable. Please try again.' }, 502)
    }
    console.error('Inventory image analysis failed:', error)
    return json({ error: 'Unable to analyze this image. Please try again.' }, 500)
  }
})
