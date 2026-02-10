// Error Code Definitions with Turkish and English messages
export const ERROR_CODES = {
    // Authentication Errors (ERR_AUTH_XXX)
    AUTH_SESSION_EXPIRED: {
        code: 'ERR_AUTH_001',
        severity: 'CRITICAL',
        tr: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
        en: 'Your session has expired. Please log in again.'
    },
    AUTH_INVALID_CREDENTIALS: {
        code: 'ERR_AUTH_002',
        severity: 'RECOVERABLE',
        tr: 'Giriş bilgileri hatalı.',
        en: 'Invalid login credentials.'
    },
    AUTH_SIGNUP_FAILED: {
        code: 'ERR_AUTH_003',
        severity: 'RECOVERABLE',
        tr: 'Kayıt işlemi başarısız oldu.',
        en: 'Registration failed.'
    },
    AUTH_PASSWORD_RESET_FAILED: {
        code: 'ERR_AUTH_004',
        severity: 'RECOVERABLE',
        tr: 'Şifre sıfırlama başarısız oldu.',
        en: 'Password reset failed.'
    },

    // Database Errors (ERR_DB_XXX)
    DB_CONNECTION_FAILED: {
        code: 'ERR_DB_001',
        severity: 'CRITICAL',
        tr: 'Bağlantı hatası oluştu. Lütfen sayfayı yenileyin.',
        en: 'Connection error occurred. Please refresh the page.'
    },
    DB_QUERY_FAILED: {
        code: 'ERR_DB_002',
        severity: 'RECOVERABLE',
        tr: 'Veri yüklenemedi. Lütfen tekrar deneyin.',
        en: 'Failed to load data. Please try again.'
    },
    DB_INSERT_FAILED: {
        code: 'ERR_DB_003',
        severity: 'RECOVERABLE',
        tr: 'Kayıt eklenemedi. Lütfen tekrar deneyin.',
        en: 'Failed to save. Please try again.'
    },
    DB_UPDATE_FAILED: {
        code: 'ERR_DB_004',
        severity: 'RECOVERABLE',
        tr: 'Güncelleme başarısız oldu.',
        en: 'Update failed.'
    },
    DB_DELETE_FAILED: {
        code: 'ERR_DB_005',
        severity: 'RECOVERABLE',
        tr: 'Silme işlemi başarısız oldu.',
        en: 'Delete operation failed.'
    },

    // Upload Errors (WARN_UPLOAD_XXX)
    UPLOAD_SIZE_EXCEEDED: {
        code: 'WARN_UPLOAD_001',
        severity: 'MINOR',
        tr: 'Dosya çok büyük. Maksimum 5MB yükleyebilirsiniz.',
        en: 'File too large. Maximum 5MB allowed.'
    },
    UPLOAD_FAILED: {
        code: 'WARN_UPLOAD_002',
        severity: 'RECOVERABLE',
        tr: 'Yükleme başarısız oldu. Lütfen tekrar deneyin.',
        en: 'Upload failed. Please try again.'
    },
    UPLOAD_LIMIT_EXCEEDED: {
        code: 'WARN_UPLOAD_003',
        severity: 'MINOR',
        tr: 'Maksimum dosya sayısına ulaştınız.',
        en: 'Maximum file count reached.'
    },
    UPLOAD_INVALID_TYPE: {
        code: 'WARN_UPLOAD_004',
        severity: 'MINOR',
        tr: 'Geçersiz dosya türü.',
        en: 'Invalid file type.'
    },

    // Network Errors (ERR_NET_XXX)
    NET_OFFLINE: {
        code: 'ERR_NET_001',
        severity: 'RECOVERABLE',
        tr: 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.',
        en: 'No internet connection. Please check your connection.'
    },
    NET_TIMEOUT: {
        code: 'ERR_NET_002',
        severity: 'RECOVERABLE',
        tr: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
        en: 'Request timed out. Please try again.'
    },
    NET_SERVER_ERROR: {
        code: 'ERR_NET_003',
        severity: 'CRITICAL',
        tr: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
        en: 'Server error occurred. Please try again later.'
    },

    // Validation Errors (WARN_VAL_XXX)
    VAL_REQUIRED_FIELD: {
        code: 'WARN_VAL_001',
        severity: 'MINOR',
        tr: 'Lütfen gerekli alanları doldurun.',
        en: 'Please fill in required fields.'
    },
    VAL_INVALID_EMAIL: {
        code: 'WARN_VAL_002',
        severity: 'MINOR',
        tr: 'Geçersiz e-posta adresi.',
        en: 'Invalid email address.'
    },
    VAL_INVALID_PHONE: {
        code: 'WARN_VAL_003',
        severity: 'MINOR',
        tr: 'Geçersiz telefon numarası.',
        en: 'Invalid phone number.'
    },
    VAL_PASSWORD_TOO_SHORT: {
        code: 'WARN_VAL_004',
        severity: 'MINOR',
        tr: 'Şifre en az 6 karakter olmalıdır.',
        en: 'Password must be at least 6 characters.'
    },

    // Component Errors (ERR_COMP_XXX)
    COMP_RENDER_FAILED: {
        code: 'ERR_COMP_001',
        severity: 'CRITICAL',
        tr: 'Sayfa yüklenirken bir hata oluştu.',
        en: 'An error occurred while loading the page.'
    },
    COMP_DATA_MISSING: {
        code: 'ERR_COMP_002',
        severity: 'RECOVERABLE',
        tr: 'Gerekli veri bulunamadı.',
        en: 'Required data not found.'
    },

    // Generic Errors
    UNKNOWN_ERROR: {
        code: 'ERR_000',
        severity: 'CRITICAL',
        tr: 'Beklenmeyen bir sorun oluştu. Lütfen sayfayı yenileyin.',
        en: 'An unexpected error occurred. Please refresh the page.'
    },
    CHUNK_LOAD_ERROR: {
        code: 'ERR_001',
        severity: 'CRITICAL',
        tr: 'Sayfa yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.',
        en: 'Error loading page. Please refresh.'
    }
};

// Helper function to get error by code
export const getErrorByCode = (code) => {
    return Object.values(ERROR_CODES).find(err => err.code === code) || ERROR_CODES.UNKNOWN_ERROR;
};

// Helper function to get error message in specific language
export const getErrorMessage = (errorCode, language = 'tr') => {
    const error = getErrorByCode(errorCode);
    return language === 'en' ? error.en : error.tr;
};

// Helper function to find error by pattern matching
export const findErrorByMessage = (errorMessage) => {
    const msg = errorMessage.toLowerCase();

    // Upload errors (check first, before generic patterns)
    if (msg.includes('upload') && (msg.includes('limit') || msg.includes('exceeded'))) {
        return ERROR_CODES.UPLOAD_LIMIT_EXCEEDED;
    }
    if (msg.includes('upload') && msg.includes('size')) {
        return ERROR_CODES.UPLOAD_SIZE_EXCEEDED;
    }
    if (msg.includes('upload') && msg.includes('failed')) {
        return ERROR_CODES.UPLOAD_FAILED;
    }
    if (msg.includes('invalid') && msg.includes('file')) {
        return ERROR_CODES.UPLOAD_INVALID_TYPE;
    }

    // Authentication errors
    if (msg.includes('session') || msg.includes('expired') || msg.includes('unauthorized')) {
        return ERROR_CODES.AUTH_SESSION_EXPIRED;
    }
    if (msg.includes('invalid') && msg.includes('credentials')) {
        return ERROR_CODES.AUTH_INVALID_CREDENTIALS;
    }

    // Database errors
    if (msg.includes('database') || msg.includes('postgres') || msg.includes('supabase')) {
        return ERROR_CODES.DB_CONNECTION_FAILED;
    }

    // Network errors
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) {
        return ERROR_CODES.NET_OFFLINE;
    }
    if (msg.includes('timeout')) {
        return ERROR_CODES.NET_TIMEOUT;
    }

    // Chunk loading errors (common in React apps)
    if (msg.includes('chunk') || msg.includes('loading chunk')) {
        return ERROR_CODES.CHUNK_LOAD_ERROR;
    }

    // Component errors
    if (msg.includes('render') || msg.includes('component')) {
        return ERROR_CODES.COMP_RENDER_FAILED;
    }

    return ERROR_CODES.UNKNOWN_ERROR;
};
