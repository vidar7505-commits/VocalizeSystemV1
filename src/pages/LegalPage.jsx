import React, { useState, useEffect } from 'react';
import { LEGAL_CONTENT } from '@/constants/legalTexts';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export default function LegalPage({ type }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { i18n } = useTranslation();
    const lang = i18n.language?.split('-')[0] || 'tr';

    // Check if we came from Auth registration
    const fromAuth = searchParams.get('from') === 'auth';
    const [accepted, setAccepted] = useState(false);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleBack = () => {
        if (fromAuth) {
            // Redirect back to Landing with AuthModal open
            navigate('/?openAuth=true');
        } else {
            navigate(-1);
        }
    };

    const handleConfirm = () => {
        if (accepted) {
            localStorage.setItem('vocalize_legal_accepted', 'true');
            navigate('/?openAuth=true');
        }
    };

    // Fallback if content for language is missing
    const contentSet = LEGAL_CONTENT[lang] || LEGAL_CONTENT['tr'];
    const { title, content } = contentSet[type] || { title: 'Not Found', content: '' };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 md:p-12 selection:bg-teal-500/30">
            <div className="max-w-3xl mx-auto">
                {/* Clean Back Button - No glow */}
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-8 text-slate-400 hover:text-white hover:bg-slate-800/50 -ml-4 transition-all"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {lang === 'tr' ? 'Geri Dön' : 'Back'}
                </Button>

                <div className="bg-slate-900 shadow-2xl rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 md:p-10">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 pb-4 border-b border-slate-800">
                            {title}
                        </h1>

                        <div className="prose prose-invert max-w-none">
                            <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base text-slate-300">
                                {content}
                            </div>
                        </div>
                    </div>

                    {/* Registration Flow Confirmation Section */}
                    {fromAuth && (
                        <div className="bg-slate-800/50 border-t border-slate-700 p-6 md:p-10 space-y-6">
                            <div
                                className="flex items-start space-x-3 cursor-pointer group"
                                onClick={() => setAccepted(!accepted)}
                            >
                                <Checkbox
                                    id="legal-confirm"
                                    checked={accepted}
                                    onCheckedChange={setAccepted}
                                    className="mt-1 border-slate-500 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                                />
                                <label
                                    htmlFor="legal-confirm"
                                    className="text-sm md:text-base text-slate-300 cursor-pointer group-hover:text-white transition-colors"
                                >
                                    {lang === 'tr'
                                        ? 'Bu metni okudum, anladım ve içeriğini onaylıyorum.'
                                        : 'I have read, understood and approve of this document.'}
                                </label>
                            </div>

                            <Button
                                disabled={!accepted}
                                onClick={handleConfirm}
                                className={cn(
                                    "w-full py-6 text-lg font-semibold transition-all duration-300",
                                    accepted
                                        ? "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                {lang === 'tr' ? 'Okudum, Onaylıyorum' : 'Read and Approved'}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center text-slate-500 text-xs">
                    © 2025 Vocalize Global. {lang === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
                </div>
            </div>
        </div>
    );
}
