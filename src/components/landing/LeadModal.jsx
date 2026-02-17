import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const LeadModal = ({
    open,
    onOpenChange,
    t,
    leadType,
    leadForm,
    setLeadForm,
    leadLoading,
    onQuickOption,
    onSubmit
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[93vw] sm:max-w-[500px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto rounded-lg sm:rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {t('landing.leadModal.title')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {t('landing.leadModal.subtitle')}
                    </DialogDescription>
                </DialogHeader>

                {leadType === 'info_request' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                        {t('landing.leadModal.quickOptions', { returnObjects: true }).map((option, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onQuickOption(option)}
                                className="text-xs text-left p-2 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors flex items-center gap-1"
                            >
                                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                <span className="line-clamp-2">{option}</span>
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-200">
                            {t('landing.leadModal.nameLabel')} *
                        </label>
                        <Input
                            id="name"
                            placeholder={t('landing.leadModal.namePlaceholder')}
                            value={leadForm.name}
                            onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-200">
                            {t('landing.leadModal.emailLabel')} *
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('landing.leadModal.emailPlaceholder')}
                            value={leadForm.email}
                            onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="phone" className="text-sm font-medium text-slate-200">
                            {t('landing.leadModal.phoneLabel')}
                        </label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder={t('landing.leadModal.phonePlaceholder')}
                            value={leadForm.phone}
                            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="message" className="text-sm font-medium text-slate-200">
                            {t('landing.leadModal.messageLabel')} *
                        </label>
                        <textarea
                            id="message"
                            rows="4"
                            placeholder={t('landing.leadModal.messagePlaceholder')}
                            value={leadForm.message}
                            onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            required
                        />
                    </div>

                    <DialogFooter className="mt-2">
                        <Button
                            type="submit"
                            disabled={leadLoading}
                            className="bg-slate-700 hover:bg-slate-600 text-white w-full"
                        >
                            {leadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('landing.leadModal.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default LeadModal;
