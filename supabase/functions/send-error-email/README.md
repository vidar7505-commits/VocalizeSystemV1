# Supabase Edge Function: send-error-email

This function sends email notifications for critical errors to support@vocalize.global using Resend.

## Setup

1. **Get Resend API Key:**
   - Sign up at https://resend.com (free tier: 100 emails/day)
   - Get your API key from the dashboard

2. **Set Supabase Secret:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

3. **Deploy Function:**
   ```bash
   supabase functions deploy send-error-email
   ```

## Features

- Rate limiting: Max 10 emails per hour
- HTML formatted emails with error details
- Stack trace included
- User information (if available)
- Automatic cleanup of old rate limit entries

## Usage

This function is automatically called by `ErrorLogger.js` when a CRITICAL error occurs.
