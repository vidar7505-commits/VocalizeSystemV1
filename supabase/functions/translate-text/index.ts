import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, target_lang } = await req.json()

        if (!text) {
            return new Response(
                JSON.stringify({ error: 'Text is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const DEEPL_API_KEY = Deno.env.get('DEEPL_API_KEY')
        if (!DEEPL_API_KEY) {
            console.error('DEEPL_API_KEY is missing')
            return new Response(
                JSON.stringify({ error: 'DeepL configuration error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Determine API URL based on key format (Free keys end in :fx)
        const isFree = DEEPL_API_KEY.endsWith(':fx')
        const apiUrl = isFree
            ? 'https://api-free.deepl.com/v2/translate'
            : 'https://api.deepl.com/v2/translate'

        // DeepL API params
        const params = new URLSearchParams()
        params.append('auth_key', DEEPL_API_KEY)
        params.append('text', text)
        // DeepL uses 'EN-US' or 'EN-GB' for English, or just 'EN' (deprecated but works). 
        // We'll map 'en' -> 'EN-US' for safety if just 'en' is passed.
        let finalTargetLang = (target_lang || 'EN').toUpperCase()
        if (finalTargetLang === 'EN') finalTargetLang = 'EN-US'

        params.append('target_lang', finalTargetLang)

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('DeepL API Error:', data)
            return new Response(
                JSON.stringify({ error: 'Translation failed', details: data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
            )
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
