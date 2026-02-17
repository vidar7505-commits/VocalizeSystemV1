import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { TERMS_CONTENT, KVKK_CONTENT } from '@/constants/legalTexts';

const LegalModal = ({ legalModal, setLegalModal, t, lang }) => {
    const currentLang = lang.startsWith('tr') ? 'tr' : 'en';
    return (
        <Dialog
            open={legalModal.isOpen}
            onOpenChange={(open) => setLegalModal((prev) => ({ ...prev, isOpen: open }))}
        >
            <DialogContent className="w-[93vw] sm:max-w-[600px] bg-[#0f172a] border-slate-700 text-white max-h-[85vh] overflow-y-auto rounded-lg sm:rounded-xl">
                <DialogHeader>
                    <DialogTitle>
                        {legalModal.type === 'terms' ? t('landing.footer.terms') : t('landing.footer.kvkk')}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {legalModal.type === 'terms' ? t('landing.footer.terms') : t('landing.footer.kvkk')}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify">
                    {legalModal.type === 'terms' ? TERMS_CONTENT[currentLang] : KVKK_CONTENT[currentLang]}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setLegalModal({ ...legalModal, isOpen: false })}
                        className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white hover:text-white"
                    >
                        {t('common.close', { defaultValue: lang === 'tr' ? 'Kapat' : 'Close' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LegalModal;
