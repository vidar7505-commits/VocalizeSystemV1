import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AGE_GROUPS = [
    '18-', '18-24', '25-34', '35-44', '45-54', '55+'
];

export default function AgeSelectionModal({ isOpen, onSelect }) {
    const { t } = useTranslation();
    if (!isOpen) return null;

    // 🟢 MANDATORY: Prevent closing by clicking outside or pressing escape
    const handleOpenChange = (open) => {
        // Do nothing if trying to close
        if (!open) return;
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="bg-[#0f172a] border-slate-700 text-white w-[90vw] max-w-sm p-6 rounded-xl focus:outline-none"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                hideCloseButton={true}
            >
                <div className="sr-only">
                    <DialogTitle>{t('customer.ageModal.accessibleTitle')}</DialogTitle>
                    <DialogDescription>{t('customer.ageModal.description')}</DialogDescription>
                </div>

                <div className="text-center mb-6 space-y-2">
                    <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
                        <User className="h-8 w-8 text-teal-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('customer.ageModal.title')}</h2>
                    <p className="text-slate-400 text-sm">
                        {t('customer.ageModal.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {AGE_GROUPS.map((age) => (
                        <Button
                            key={age}
                            variant="outline"
                            onClick={() => onSelect(age)}
                            className="h-12 border-slate-700 bg-slate-800/50 hover:bg-teal-600 hover:text-white hover:border-teal-500 transition-all text-slate-300 font-medium"
                        >
                            {age}
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
