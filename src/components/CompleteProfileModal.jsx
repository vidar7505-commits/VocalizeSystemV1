import * as React from 'react';
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Phone, User, Loader2, UserCircle2 } from 'lucide-react';

const AGE_GROUPS = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];

// Translations embedded - matching customerTranslations pattern
const TEXTS = {
    tr: {
        title: 'İletişim Bilginizi Tamamlayın',
        description: 'İşletmelerin geri bildirimlerinize hızlıca dönüş yapabilmesi, olası aksaklıkları telafi edebilmesi ve size özel fırsatları ulaştırabilmesi için lütfen bilgilerinizi tamamlayın.',
        phoneLabel: 'Telefon Numarası',
        phonePlaceholder: '05XX XXX XX XX',
        ageLabel: 'Yaş Grubu',
        ageDesc: 'Hizmet kalitemizi artırmak için yaş grubunuzu öğrenebilir miyiz?',
        save: 'Kaydet ve Devam Et',
        saving: 'Kaydediliyor...',
        skip: 'Daha Sonra',
        phoneError: 'Telefon numarası 05xxxxxxxxx formatında olmalıdır (11 haneli).',
        saveError: 'Bir hata oluştu, lütfen tekrar deneyin.',
        ageRequired: 'Lütfen yaş grubunuzu seçin.',
    },
    en: {
        title: 'Complete Your Contact Information',
        description: 'Please complete your information so businesses can quickly respond to your feedback, compensate for any issues, and deliver special opportunities to you.',
        phoneLabel: 'Phone Number',
        phonePlaceholder: '05XX XXX XX XX',
        ageLabel: 'Age Group',
        ageDesc: 'Can we learn your age group to improve our service quality?',
        save: 'Save & Continue',
        saving: 'Saving...',
        skip: 'Skip for Now',
        phoneError: 'Phone must be in 05xxxxxxxxx format (11 digits).',
        saveError: 'An error occurred, please try again.',
        ageRequired: 'Please select your age group.',
    }
};

const validatePhone = (phone) => /^05\d{9}$/.test(phone.replace(/\s/g, ''));

const CompleteProfileModal = React.memo(({
    isOpen,
    user,          // authUser from SupabaseAuthContext
    language = 'tr',
    missingPhone,  // bool: phone eksik mi?
    missingAge,    // bool: age_group eksik mi?
    onComplete,    // (updatedProfile) => void - modal kapandıktan sonra
    onSkip,        // () => void - optional
}) => {
    const { toast } = useToast();
    const t = TEXTS[language] || TEXTS.tr;

    const [phone, setPhone] = useState('');
    const [selectedAge, setSelectedAge] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = useCallback(async () => {
        // Validasyon
        if (missingPhone && !validatePhone(phone)) {
            toast({ title: t.phoneError, variant: 'destructive' });
            return;
        }
        if (missingAge && !selectedAge) {
            toast({ title: t.ageRequired, variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            if (user) {
                const updates = {
                    user_id: user.id,
                    email: user.email,
                    updated_at: new Date().toISOString(),
                };
                if (missingPhone) updates.phone = phone.replace(/\s/g, '');
                if (missingAge) updates.age_group = selectedAge;

                const { error } = await supabase
                    .from('customer_profiles')
                    .upsert(updates, { onConflict: 'user_id', ignoreDuplicates: false });

                if (error) throw error;

                // 🟢 Retroactive: Geçmiş feedbacklere age_group uygula
                if (missingAge && selectedAge && user.email) {
                    supabase
                        .from('feedbacks')
                        .update({ customer_age_group: selectedAge })
                        .eq('customer_email', user.email)
                        .is('customer_age_group', null)
                        .then(({ error: retErr }) => {
                            if (retErr) console.warn('[CompleteProfileModal] Retroactive age update failed:', retErr);
                        });
                }
            } else {
                // Guest mode: Save to localStorage
                if (missingPhone) localStorage.setItem('vocalize_customer_phone', phone.replace(/\s/g, ''));
                if (missingAge) localStorage.setItem('vocalize_customer_age_group', selectedAge);
            }

            onComplete?.({
                phone: missingPhone ? phone.replace(/\s/g, '') : undefined,
                age_group: missingAge ? selectedAge : undefined
            });
        } catch (err) {
            console.error('[CompleteProfileModal] Save error:', err);
            toast({ title: t.saveError, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [missingPhone, missingAge, phone, selectedAge, user, t, onComplete, toast]);

    if (!isOpen || (!missingPhone && !missingAge)) return null;

    // Prevent closing
    const handleOpenChange = (open) => {
        if (!open) return; // Block close
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="bg-[#0f172a] border-slate-700 text-white w-[92vw] max-w-sm p-6 rounded-2xl focus:outline-none"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                hideCloseButton={true}
            >
                <div className="sr-only">
                    <DialogTitle>{t.title}</DialogTitle>
                    <DialogDescription>{t.description}</DialogDescription>
                </div>

                {/* Header */}
                <div className="text-center mb-5">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                        <UserCircle2 className="h-8 w-8 text-orange-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white leading-tight">{t.title}</h2>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{t.description}</p>
                </div>

                <div className="space-y-5">
                    {/* Phone Input */}
                    {missingPhone && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-orange-400" />
                                {t.phoneLabel}
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    type="tel"
                                    placeholder={t.phonePlaceholder}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    autoComplete="tel"
                                    className="pl-10 h-11 bg-slate-800 border-slate-700 text-white focus-visible:ring-orange-500 focus-visible:border-orange-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Age Group */}
                    {missingAge && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-teal-400" />
                                {t.ageLabel}
                            </label>
                            <p className="text-xs text-slate-500">{t.ageDesc}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {AGE_GROUPS.map((age) => (
                                    <button
                                        key={age}
                                        type="button"
                                        onClick={() => setSelectedAge(age)}
                                        className={`h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${selectedAge === age
                                            ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/30'
                                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-teal-600/20 hover:border-teal-500/50'
                                            }`}
                                    >
                                        {age}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t.saving}
                            </>
                        ) : t.save}
                    </Button>
                    {onSkip && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="w-full text-xs text-slate-500 hover:text-slate-400 transition-colors py-1.5"
                        >
                            {t.skip}
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
});

CompleteProfileModal.displayName = 'CompleteProfileModal';
export default CompleteProfileModal;
