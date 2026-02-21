import React from 'react';
import { TERMS_CONTENT, KVKK_CONTENT } from '@/constants/legalTexts';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LegalPage({ type }) {
    const navigate = useNavigate();
    const isTerms = type === 'terms';
    const content = isTerms ? TERMS_CONTENT : KVKK_CONTENT;
    const title = isTerms ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni';

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="mb-8 text-slate-400 hover:text-white -ml-4"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Geri Dön
                </Button>

                <div className="bg-slate-900 shadow-2xl rounded-2xl border border-slate-800 p-6 md:p-10">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 pb-4 border-b border-slate-800">
                        {title}
                    </h1>

                    <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base text-slate-300">
                            {content}
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-slate-500 text-xs">
                    © {new Date().getFullYear()} Vocalize System. Tüm hakları saklıdır.
                </div>
            </div>
        </div>
    );
}
