import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { CheckCircle, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const CustomerOnboardingModal = () => {
    const { t } = useTranslation('common');
    const { hasSeenOnboarding, updateOnboardingStatus } = useAuth();
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        if (!hasSeenOnboarding) {
            setShow(true);
        }
    }, [hasSeenOnboarding]);

    const handleDismiss = async () => {
        setShow(false);
        await updateOnboardingStatus(true);
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
                >
                    {/* Header Image/Pattern */}
                    <div className="h-32 bg-gradient-to-br from-teal-500/20 to-sky-500/20 flex items-center justify-center relative overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        <div className="p-4 bg-slate-900 rounded-full border border-slate-800 shadow-xl relative z-10">
                            <Sparkles className="w-10 h-10 text-teal-400" />
                        </div>
                    </div>

                    <div className="p-8 pt-6 text-center">
                        <h2 className="text-2xl font-bold text-white mb-3">
                            {t('onboarding.customer_modal_title')}
                        </h2>
                        <p className="text-slate-400 leading-relaxed mb-8">
                            {t('onboarding.customer_modal_desc')}
                        </p>

                        <Button
                            onClick={handleDismiss}
                            className="w-full h-12 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                        >
                            {t('onboarding.btn_finish')}
                        </Button>

                        <button
                            onClick={handleDismiss}
                            className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest font-bold"
                        >
                            {t('onboarding.btn_skip')}
                        </button>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CustomerOnboardingModal;
