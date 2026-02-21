// Supabase Edge Function: send-error-email
// Deploy with: supabase functions deploy send-error-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Global 24h Throttling Check
const shouldSendEmail = async (errorCode, currentTimestamp) => {
  try {
    // Calculate 24h ago
    const oneDayAgo = new Date(new Date(currentTimestamp).getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Count CRITICAL errors with same code, created between (now-24h) and (current_error_time)
    // We look for ANY error that happened BEFORE this one but within the window.
    // If found, we skip sending email.
    const { count, error } = await supabase
      .from('client_errors')
      .select('*', { count: 'exact', head: true })
      .eq('error_code', errorCode)
      .eq('severity', 'CRITICAL')
      .gt('created_at', oneDayAgo)
      .lt('created_at', currentTimestamp) // Strictly older than current

    if (error) {
      console.error('Db check error:', error)
      return true // Fail checking -> Send email to be safe (or false to be safe? Default to send)
    }

    // If count > 0, it means there was a previous error in the window. Throttle.
    return count === 0
  } catch (e) {
    console.error('Throttling check failed:', e)
    return true
  }
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const {
      errorCode,
      message,
      stack,
      url,
      userAgent,
      userId,
      timestamp,
      to
    } = await req.json()

    // Validate required fields
    if (!errorCode || !message || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format email body
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .error-code { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
          .stack { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px; }
          .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #3b82f6; }
          .label { font-weight: bold; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Kritik Hata: ${errorCode}</h1>
          </div>
          <div class="content">
            <div class="error-code">
              Hata Kodu: ${errorCode}
            </div>
            
            <div class="info-row">
              <span class="label">Mesaj:</span><br/>
              ${message}
            </div>
            
            <div class="info-row">
              <span class="label">Sayfa:</span><br/>
              <a href="${url}">${url}</a>
            </div>
            
            ${userId ? `
              <div class="info-row">
                <span class="label">Kullanıcı ID:</span><br/>
                ${userId}
              </div>
            ` : ''}
            
            <div class="info-row">
              <span class="label">Zaman:</span><br/>
              ${new Date(timestamp).toLocaleString('tr-TR')}
            </div>
            
            <div class="info-row">
              <span class="label">User Agent:</span><br/>
              ${userAgent}
            </div>
            
            ${stack ? `
              <div class="info-row">
                <span class="label">Stack Trace:</span><br/>
                <div class="stack">${stack.replace(/\n/g, '<br/>')}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Vocalize Error Monitor <errors@vocalize.global>',
        to: [to],
        subject: `🚨 Kritik Hata: ${errorCode}`,
        html: emailHtml
      })
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Resend API error:', error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-error-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
