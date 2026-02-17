import React, { useState } from 'react';
import { Mail, KeyRound, Shield, AlertOctagon, Trash2, Loader2, Send, LogOut, UserPlus, Settings } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const SettingsModal = React.memo(({
    isOpen,
    onClose,
    user,
    isGuest,
    language,
    t,
    handleLogout,
    handleRegisterClick,
    setSupportModalOpen,
    setShowDeleteConfirmModal,
}) => {
    const { toast } = useToast();
    const [settingsTab, setSettingsTab] = useState('profile');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handleUpdateEmail = async () => {
        if (!newEmail.trim()) {
            toast({
                title: t('common.error'),
                description: t('customer.settings.errors.fillAll'),
                variant: "destructive"
            });
            return;
        }
        setIsUpdatingEmail(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            toast({
                title: t('common.success'),
                description: t('customer.settings.success.emailUpdated'),
                className: "bg-teal-600 text-white border-none"
            });
            setNewEmail('');
        } catch (err) {
            toast({
                title: t('common.error'),
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword.trim() || !newPasswordConfirm.trim()) {
            toast({
                title: t('common.error'),
                description: t('customer.settings.errors.fillAll'),
                variant: "destructive"
            });
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            toast({
                title: t('common.error'),
                description: t('customer.settings.errors.mismatch'),
                variant: "destructive"
            });
            return;
        }
        if (newPassword.length < 6) {
            toast({
                title: t('common.error'),
                description: t('customer.settings.errors.shortPassword'),
                variant: "destructive"
            });
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({
                title: t('common.success'),
                description: t('customer.settings.success.passwordUpdated'),
                className: "bg-teal-600 text-white border-none"
            });
            setNewPassword('');
            setNewPasswordConfirm('');
        } catch (err) {
            toast({
                title: t('common.error'),
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                        <Settings className="h-6 w-6 text-teal-500" />
                        {t('customer.settings.title')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm sr-only">
                        {t('customer.settings.description')}
                    </DialogDescription>
                </DialogHeader>

                {!isGuest ? (
                    <>
                        <div className="flex gap-2 px-6 pt-4 flex-shrink-0 border-b border-slate-800">
                            <button
                                onClick={() => setSettingsTab('profile')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${settingsTab === 'profile'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <Mail className="h-4 w-4" />
                                {t('customer.settings.tabs.profile')}
                            </button>
                            <button
                                onClick={() => setSettingsTab('security')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${settingsTab === 'security'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <KeyRound className="h-4 w-4" />
                                {t('customer.settings.tabs.security')}
                            </button>
                            <button
                                onClick={() => setSettingsTab('account')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${settingsTab === 'account'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <Shield className="h-4 w-4" />
                                {t('customer.settings.tabs.account')}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {settingsTab === 'profile' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {t('customer.settings.profile.currentEmail')}
                                        </label>
                                        <Input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            autoComplete="email"
                                            className="bg-slate-800 border-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {t('customer.settings.profile.newEmail')}
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder={t('customer.settings.profile.placeholder')}
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            autoComplete="email"
                                            className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'security' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {t('customer.settings.security.newPassword')}
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder={t('customer.settings.security.placeholder')}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {t('customer.settings.security.confirmPassword')}
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder={t('customer.settings.security.placeholder')}
                                            value={newPasswordConfirm}
                                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                            autoComplete="new-password"
                                            className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'account' && (
                                <div className="space-y-4">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertOctagon className="h-5 w-5 text-red-500" />
                                            <h3 className="font-bold text-red-400 text-sm">
                                                {t('customer.settings.account.dangerZone')}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-4">
                                            {t('customer.settings.account.deleteDescription')}
                                        </p>

                                        <Button
                                            onClick={() => setShowDeleteConfirmModal(true)}
                                            variant="destructive"
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('customer.settings.account.deleteStart')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0 flex flex-col gap-3">
                            {settingsTab === 'profile' && (
                                <Button
                                    onClick={handleUpdateEmail}
                                    disabled={isUpdatingEmail || !newEmail.trim()}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                                >
                                    {isUpdatingEmail ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            {t('customer.settings.updating')}
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            {t('customer.settings.profile.update')}
                                        </>
                                    )}
                                </Button>
                            )}

                            {settingsTab === 'security' && (
                                <Button
                                    onClick={handleUpdatePassword}
                                    disabled={isUpdatingPassword || !newPassword.trim() || !newPasswordConfirm.trim()}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                                >
                                    {isUpdatingPassword ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            {t('customer.settings.updating')}
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="h-4 w-4 mr-2" />
                                            {t('customer.settings.security.update')}
                                        </>
                                    )}
                                </Button>
                            )}

                            <div className="h-px bg-slate-800 w-full my-1"></div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={() => { onClose(); setSupportModalOpen(true); }}
                                    variant="outline"
                                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-teal-400 hover:text-teal-300"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    {t('customer.settings.vocalizeFeedback')}
                                </Button>

                                <Button
                                    onClick={handleLogout}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {t('customer.settings.logout')}
                                </Button>
                            </div>

                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full text-slate-500 hover:text-slate-300 hover:bg-transparent h-8 text-xs"
                            >
                                {t('customer.settings.close')}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="bg-slate-800/80 p-8 rounded-full inline-flex mb-6">
                            <UserPlus className="h-12 w-12 text-teal-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white text-center mb-3">
                            {t('customer.settings.unlockFeatures')}
                        </h3>
                        <p className="text-slate-400 text-center max-w-sm mb-6">
                            {t('customer.settings.unlockDescription')}
                        </p>
                        <Button
                            onClick={() => { handleRegisterClick(); onClose(); }}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-base mb-4"
                        >
                            <UserPlus className="mr-2 h-5 w-5" />
                            {t('customer.register')}
                        </Button>

                        <DialogFooter className="w-full mt-auto pt-6 border-t border-slate-800 flex-shrink-0 flex flex-col gap-3">
                            <Button
                                onClick={() => { onClose(); setSupportModalOpen(true); }}
                                variant="outline"
                                className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600 text-teal-400 hover:text-teal-300"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {t('customer.settings.vocalizeFeedback')}
                            </Button>

                            <Button
                                onClick={handleLogout}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                {t('customer.settings.logout')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

export default SettingsModal;
