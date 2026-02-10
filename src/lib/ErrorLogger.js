import { supabase } from '@/lib/customSupabaseClient';
import { findErrorByMessage } from '@/constants/errorCodes';

// Error deduplication cache (in-memory)
const errorCache = new Map();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// generateErrorHash removed - using inline simple hashing

/**
 * Check if error was recently logged (deduplication)
 */
const isRecentlyLogged = (errorHash) => {
    const lastLogged = errorCache.get(errorHash);
    if (!lastLogged) return false;

    const timeSinceLastLog = Date.now() - lastLogged;
    return timeSinceLastLog < DEDUP_WINDOW_MS;
};

/**
 * Mark error as logged
 */
const markAsLogged = (errorHash) => {
    errorCache.set(errorHash, Date.now());

    // Cleanup old entries
    if (errorCache.size > 100) {
        const now = Date.now();
        for (const [hash, timestamp] of errorCache.entries()) {
            if (now - timestamp > DEDUP_WINDOW_MS) {
                errorCache.delete(hash);
            }
        }
    }
};

/**
 * Log error to Supabase client_errors table
 */
const logToSupabase = async (errorData) => {
    try {
        const { error } = await supabase.from('client_errors').insert(errorData);

        if (error) {
            console.error('Failed to log error to Supabase:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error logging to Supabase:', err);
        return false;
    }
};

/**
 * Send email notification for critical errors via Supabase Edge Function
 */
const sendEmailNotification = async (errorData) => {
    try {
        const { data, error } = await supabase.functions.invoke('send-error-email', {
            body: {
                errorCode: errorData.error_code,
                message: errorData.message,
                stack: errorData.stack,
                url: errorData.url,
                userAgent: errorData.user_agent,
                userId: errorData.user_id,
                timestamp: errorData.created_at,
                to: 'support@vocalize.global'
            }
        });

        if (error) {
            console.error('Failed to send error email:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error sending email notification:', err);
        return false;
    }
};

/**
 * Main error logging function
 * 
 * @param {Error} error - The error object
 * @param {Object} context - Additional context (component, action, etc.)
 * @returns {Object} - { errorCode, severity, shouldNotifyUser }
 */
export const logError = async (error, context = {}) => {
    try {
        // Safe error message extraction
        const errorMessage = error?.message || 'Unknown error';
        const errorStack = error?.stack || '';

        // Generate error hash for deduplication
        // Use simple string concat instead of btoa to avoid encoding issues with Turkish chars
        const errorHash = `HASH_${errorMessage}_${errorStack.substring(0, 100)}_${context?.component || ''}`;

        // Check if this error was recently logged
        if (isRecentlyLogged(errorHash)) {
            console.warn(`[ErrorLogger] Duplicate error suppressed: ${errorMessage.substring(0, 50)}...`);
            // Return existing error info if known, or generic
            const errorInfo = findErrorByMessage(errorMessage);
            return {
                errorCode: errorInfo.code,
                severity: errorInfo.severity,
                shouldNotifyUser: false,
                isDuplicate: true
            };
        }

        // OPTIMISTIC DEDUPLICATION: Mark as logged BEFORE async work
        // This prevents race conditions where multiple identical errors fire rapidly
        markAsLogged(errorHash);

        // Find matching error code
        const errorInfo = findErrorByMessage(errorMessage);
        const { code: errorCode, severity } = errorInfo;

        // Get current session (safely)
        let session = null;
        try {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
        } catch (authErr) {
            console.warn("[ErrorLogger] Failed to get session:", authErr);
        }

        // Prepare error data
        const errorData = {
            error_code: errorCode,
            severity: severity,
            message: errorMessage,
            stack: errorStack,
            component: context.component || null,
            action: context.action || null,
            url: window.location.href,
            user_agent: navigator.userAgent,
            user_id: session?.user?.id || null,
            user_email: session?.user?.email || null,
            additional_data: context.additionalData ? JSON.stringify(context.additionalData) : null,
            created_at: new Date().toISOString()
        };

        // Log to Supabase (Non-blocking / Background)
        logToSupabase(errorData).then(logged => {
            if (logged && severity === 'CRITICAL') {
                sendEmailNotification(errorData).catch(err => {
                    console.error('Email notification failed:', err);
                });
            }
        });

        // Determine if user should be notified
        const shouldNotifyUser = severity === 'CRITICAL' || severity === 'RECOVERABLE';

        return {
            errorCode,
            severity,
            shouldNotifyUser,
            isDuplicate: false,
            logged: true // Optimistic
        };

    } catch (err) {
        // Failsafe: If logger itself crashes, just print to console and return generic critical error
        // Do NOT try to recursive log
        console.error('[ErrorLogger] CRITICAL LOGGER FAILURE:', err);
        return {
            errorCode: 'ERR_INTERNAL',
            severity: 'CRITICAL',
            shouldNotifyUser: true,
            isDuplicate: false,
            logged: false
        };
    }
};

/**
 * Log warning (non-error issues)
 */
export const logWarning = (message, context = {}) => {
    console.warn(`[Warning] ${message}`, context);

    // Optionally log warnings to Supabase as well
    // For now, just console.warn
};

/**
 * Clear error cache (useful for testing)
 */
export const clearErrorCache = () => {
    errorCache.clear();
};
