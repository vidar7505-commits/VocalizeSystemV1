import React from 'react';
import { AlertTriangle, RefreshCw, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/constants/errorCodes';
import { useTranslation } from 'react-i18next';

/**
 * ErrorToast - Minimal, user-friendly error notification component
 * Shows only error code and minimal message, no technical details
 */
const ErrorToast = ({
    errorCode,
    severity,
    onRetry,
    onClose,
    autoReload = false,
    reloadDelay = 5000  // 5 saniye - kullanıcının okuyabilmesi için
}) => {
    const { t, i18n } = useTranslation();
    const language = i18n.language.split('-')[0] || 'tr';
    const [countdown, setCountdown] = React.useState(Math.floor(reloadDelay / 1000));

    React.useEffect(() => {
        if (autoReload) {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        window.location.reload();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [autoReload, reloadDelay]);

    const message = getErrorMessage(errorCode, language);

    const handleSupport = () => {
        const subject = language === 'tr'
            ? `Hata Bildirimi - ${errorCode}`
            : `Error Report - ${errorCode}`;
        const body = language === 'tr'
            ? `Hata Kodu: ${errorCode}%0D%0ASayfa: ${window.location.href}%0D%0A%0D%0ALütfen sorunu detaylı açıklayın:`
            : `Error Code: ${errorCode}%0D%0APage: ${window.location.href}%0D%0A%0D%0APlease describe the issue in detail:`;

        window.location.href = `mailto:support@vocalize.global?subject=${subject}&body=${body}`;
    };

    // Determine toast styling based on severity
    const getSeverityStyles = () => {
        switch (severity) {
            case 'CRITICAL':
                return {
                    bg: 'bg-red-950/90',
                    border: 'border-red-500/50',
                    icon: 'text-red-400',
                    text: 'text-red-200'
                };
            case 'RECOVERABLE':
                return {
                    bg: 'bg-orange-950/90',
                    border: 'border-orange-500/50',
                    icon: 'text-orange-400',
                    text: 'text-orange-200'
                };
            default:
                return {
                    bg: 'bg-slate-800/90',
                    border: 'border-slate-600',
                    icon: 'text-slate-400',
                    text: 'text-slate-200'
                };
        }
    };

    const styles = getSeverityStyles();

    return (
        <div
            className={`fixed top-4 left-4 right-4 md:left-auto md:w-full md:max-w-md z-[9999] animate-in slide-in-from-top-2 fade-in duration-300 ${styles.bg} ${styles.border} border-2 rounded-xl shadow-2xl backdrop-blur-sm`}
            role="alert"
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${styles.bg} border ${styles.border}`}>
                            <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm ${styles.text}`}>
                                {t('common.error')}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {language === 'tr' ? 'Hata Kodu' : 'Error Code'}: <span className="font-mono font-bold">{errorCode}</span>
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Message */}
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                    {message}
                </p>

                {/* Auto-reload countdown */}
                {autoReload && (
                    <div className="mb-4 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 text-center">
                            {language === 'tr'
                                ? `Sayfa ${countdown} saniye içinde yenilenecek...`
                                : `Page will reload in ${countdown} seconds...`}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {onRetry && !autoReload && (
                        <Button
                            onClick={onRetry}
                            size="sm"
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('common.retry')}
                        </Button>
                    )}
                    <Button
                        onClick={handleSupport}
                        size="sm"
                        variant="outline"
                        className={`flex-1 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white ${!onRetry || autoReload ? 'flex-1' : ''}`}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        {t('customer.supportItem')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ErrorToast;
