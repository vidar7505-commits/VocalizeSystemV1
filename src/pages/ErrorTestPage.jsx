import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bug, Zap, Info } from 'lucide-react';

// Component that throws different types of errors based on errorType
// Moved outside to avoid "Cannot create components during render" error
const ErrorTrigger = ({ errorType }) => {
    if (errorType === 'critical') {
        throw new Error("Database connection failed");
    }
    if (errorType === 'recoverable') {
        throw new Error("Failed to fetch data");
    }
    if (errorType === 'minor') {
        throw new Error("Upload limit exceeded");
    }
    return null;
};

/**
 * ErrorTestPage - Test page for error handling system
 * This page has buttons to trigger different types of errors
 */
const ErrorTestPage = () => {
    const [errorType, setErrorType] = useState(null);

    const triggerCriticalError = () => {
        setErrorType('critical');
    };

    const triggerRecoverableError = () => {
        setErrorType('recoverable');
    };

    const triggerMinorError = () => {
        setErrorType('minor');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 bg-slate-800/50 px-6 py-3 rounded-full border border-slate-700 mb-6">
                        <Bug className="w-6 h-6 text-teal-400" />
                        <h1 className="text-2xl font-bold text-white">Hata Yönetim Test Sayfası</h1>
                    </div>
                    <p className="text-slate-400 text-lg">
                        Farklı hata türlerini test etmek için butonlara tıklayın
                    </p>
                </div>

                {/* Test Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Critical Error */}
                    <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-6 hover:border-red-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-500/10 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">KRİTİK HATA</h3>
                                <p className="text-xs text-red-400">ERR_DB_001</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Toast gösterir, 3 saniye sonra sayfa yenilenir, email gönderilir
                        </p>
                        <Button
                            onClick={triggerCriticalError}
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Kritik Hata Tetikle
                        </Button>
                    </div>

                    {/* Recoverable Error */}
                    <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">KURTARILABİLİR</h3>
                                <p className="text-xs text-orange-400">ERR_DB_002</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Toast + "Tekrar Dene" butonu, sayfa çalışmaya devam eder
                        </p>
                        <Button
                            onClick={triggerRecoverableError}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Bug className="w-4 h-4 mr-2" />
                            Recoverable Hata
                        </Button>
                    </div>

                    {/* Minor Error */}
                    <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6 hover:border-slate-500 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-slate-700 rounded-lg">
                                <Info className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">KÜÇÜK HATA</h3>
                                <p className="text-xs text-slate-400">WARN_001</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Sessizce loglanır, kullanıcı görmez
                        </p>
                        <Button
                            onClick={triggerMinorError}
                            variant="outline"
                            className="w-full border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                        >
                            <Info className="w-4 h-4 mr-2" />
                            Minor Hata
                        </Button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-12 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">📋 Test Talimatları</h3>
                    <ol className="space-y-3 text-slate-300">
                        <li className="flex gap-3">
                            <span className="text-teal-400 font-bold">1.</span>
                            <span>Browser Console'u açın (F12)</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-teal-400 font-bold">2.</span>
                            <span>Yukarıdaki butonlardan birine tıklayın</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-teal-400 font-bold">3.</span>
                            <span>Toast bildirimini ve davranışı gözlemleyin</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-teal-400 font-bold">4.</span>
                            <span>Supabase Dashboard → client_errors tablosunu kontrol edin</span>
                        </li>
                    </ol>
                </div>

                {/* Error Trigger Component (hidden) */}
                {errorType && <ErrorTrigger errorType={errorType} />}
            </div>
        </div>
    );
};

export default ErrorTestPage;
