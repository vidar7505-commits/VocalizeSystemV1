import * as React from 'react';
import { useState } from 'react';
import { Mail, KeyRound, Shield, AlertOctagon, Trash2, Loader2, Send, LogOut, UserPlus, Settings, Phone, User as UserIcon } from 'lucide-react';
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
    userProfile,
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

    // Profile updates
    const [phone, setPhone] = useState(userProfile?.phone || '');
    const [ageGroup, setAgeGroup] = useState(userProfile?.age_group || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    const AGE_GROUPS = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const isAgeAlreadySet = !!userProfile?.age_group;
    const isPhoneAlreadySet = !!userProfile?.phone;

    const [isEditingPhone, setIsEditingPhone] = useState(false);

    const hasMissingInfo = !userProfile?.phone || !userProfile?.age_group;

    const handleUpdateProfile = async () => {
        // Determine the effective phone to save
        const effectivePhone = isEditingPhone ? phone : (userProfile?.phone || '');
        // Determine effective age group (existing or newly chosen)
        const effectiveAge = isAgeAlreadySet ? userProfile.age_group : ageGroup;

        if (isEditingPhone && !effectivePhone.trim()) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Telefon numarasını giriniz' : 'Please enter a phone number',
                variant: "destructive"
            });
            return;
        }

        if (!isAgeAlreadySet && !effectiveAge) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Lütfen yaş grubunuzu seçiniz' : 'Please select your age group',
                variant: "destructive"
            });
            return;
        }

        if (isEditingPhone || !isPhoneAlreadySet) {
            const phoneRegex = /^05\d{9}$/;
            if (!phoneRegex.test(effectivePhone.replace(/\s/g, ''))) {
                toast({
                    title: language === 'tr' ? 'Hata' : 'Error',
                    description: language === 'tr' ? 'Telefon numarası 05xxxxxxxxx formatında olmalıdır.' : 'Phone must be in 05xxxxxxxxx format.',
                    variant: "destructive"
                });
                return;
            }
        }

        setIsUpdatingProfile(true);
        try {
            const { error } = await supabase
                .from('customer_profiles')
                .upsert({
                    user_id: user.id,
                    email: user.email,
                    phone: effectivePhone.replace(/\s/g, ''),
                    age_group: effectiveAge,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Update local userProfile state so UI reflects change immediately
            setIsEditingPhone(false);

            toast({
                title: language === 'tr' ? 'Başarılı' : 'Success',
                description: language === 'tr' ? 'Profil başarıyla güncellendi' : 'Profile successfully updated',
                className: "bg-teal-600 text-white border-none"
            });
        } catch (err) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail.trim()) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Lütfen tüm alanları doldurunuz' : 'Please fill in all fields',
                variant: "destructive"
            });
            return;
        }
        setIsUpdatingEmail(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            toast({
                title: language === 'tr' ? 'Başarılı' : 'Success',
                description: language === 'tr' ? 'E-posta başarıyla güncellendi' : 'Email successfully updated',
                className: "bg-teal-600 text-white border-none"
            });
            setNewEmail('');
        } catch (err) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
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
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Lütfen tüm alanları doldurunuz' : 'Please fill in all fields',
                variant: "destructive"
            });
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match',
                variant: "destructive"
            });
            return;
        }
        if (newPassword.length < 6) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Şifre en az 6 karakter olmalı' : 'Password must be at least 6 characters',
                variant: "destructive"
            });
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({
                title: language === 'tr' ? 'Başarılı' : 'Success',
                description: language === 'tr' ? 'Şifre başarıyla güncellendi' : 'Password successfully updated',
                className: "bg-teal-600 text-white border-none"
            });
            setNewPassword('');
            setNewPasswordConfirm('');
        } catch (err) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
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
                        {language === 'tr' ? 'Ayarlar' : 'Settings'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm sr-only">
                        {language === 'tr' ? 'Hesap ve uygulama ayarlarınızı buradan yönetebilirsiniz.' : 'Manage your account and application settings here.'}
                    </DialogDescription>
                </DialogHeader>

                {!isGuest ? (
                    <>
                        <div className="flex gap-2 px-6 pt-4 flex-shrink-0 border-b border-slate-800">
                            <button
                                onClick={() => setSettingsTab('profile')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 relative ${settingsTab === 'profile'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <Mail className="h-4 w-4" />
                                {language === 'tr' ? 'Profil' : 'Profile'}
                                {hasMissingInfo && (
                                    <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-slate-900" title={language === 'tr' ? 'Profilinizi tamamlayın' : 'Complete your profile'} />
                                )}
                            </button>
                            <button
                                onClick={() => setSettingsTab('security')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${settingsTab === 'security'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <KeyRound className="h-4 w-4" />
                                {language === 'tr' ? 'Güvenlik' : 'Security'}
                            </button>
                            <button
                                onClick={() => setSettingsTab('account')}
                                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${settingsTab === 'account'
                                    ? 'text-teal-400 border-teal-500'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                            >
                                <Shield className="h-4 w-4" />
                                {language === 'tr' ? 'Hesap' : 'Account'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {settingsTab === 'profile' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {language === 'tr' ? 'Mevcut E-posta' : 'Current Email'}
                                        </label>
                                        <Input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            autoComplete="email"
                                            className="bg-slate-800 border-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Phone Number - with inline edit button */}
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-teal-500" />
                                            {language === 'tr' ? 'Telefon Numarası' : 'Phone Number'}
                                        </label>
                                        {isPhoneAlreadySet && !isEditingPhone ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="tel"
                                                    value={userProfile?.phone || ''}
                                                    disabled
                                                    className="bg-slate-800 border-slate-700 text-slate-300 opacity-60 cursor-not-allowed flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsEditingPhone(true); setPhone(userProfile?.phone || ''); }}
                                                    className="px-3 py-2 text-xs font-semibold text-teal-400 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 hover:border-teal-500/50 transition-colors whitespace-nowrap"
                                                >
                                                    {language === 'tr' ? 'Değiştir' : 'Edit'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="tel"
                                                    placeholder="05XX XXX XX XX"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    autoComplete="tel"
                                                    className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20 flex-1"
                                                />
                                                {isPhoneAlreadySet && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsEditingPhone(false); setPhone(userProfile?.phone || ''); }}
                                                        className="px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors whitespace-nowrap"
                                                    >
                                                        {language === 'tr' ? 'İptal' : 'Cancel'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Age Group - locked after first selection */}
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 flex items-center gap-2">
                                            <UserIcon className="h-3.5 w-3.5 text-teal-500" />
                                            {language === 'tr' ? 'Yaş Grubu' : 'Age Group'}
                                        </label>
                                        {isAgeAlreadySet ? (
                                            <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                                                <span className="text-sm font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full">
                                                    {userProfile.age_group}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {language === 'tr' ? 'Yaş grubu değiştirilemez.' : 'Age group cannot be changed.'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {AGE_GROUPS.map((age) => (
                                                    <button
                                                        key={age}
                                                        type="button"
                                                        onClick={() => setAgeGroup(age)}
                                                        className={`h-10 rounded-lg border text-xs font-medium transition-all duration-200 ${ageGroup === age
                                                            ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/30'
                                                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-teal-600/20 hover:border-teal-500/50'
                                                            }`}
                                                    >
                                                        {age}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            onClick={handleUpdateProfile}
                                            disabled={isUpdatingProfile || (!isEditingPhone && isPhoneAlreadySet && isAgeAlreadySet) || (isEditingPhone && !phone.trim()) || (!isAgeAlreadySet && !ageGroup)}
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-900/20"
                                        >
                                            {isUpdatingProfile ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    {language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {language === 'tr' ? 'Profili Kaydet' : 'Save Profile'}
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="my-6 border-t border-slate-800 pt-6">
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {language === 'tr' ? 'Yeni E-posta' : 'New Email'}
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="yeni@email.com"
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
                                            {language === 'tr' ? 'Yeni Şifre' : 'New Password'}
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 font-semibold mb-2 block">
                                            {language === 'tr' ? 'Şifreyi Onayla' : 'Confirm Password'}
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
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
                                                {language === 'tr' ? 'Tehlikeli Bölge' : 'Danger Zone'}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-4">
                                            {language === 'tr'
                                                ? 'Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir ve geri getirilemez.'
                                                : 'Deleting your account is permanent. All your data will be lost.'}
                                        </p>

                                        <Button
                                            onClick={() => setShowDeleteConfirmModal(true)}
                                            variant="destructive"
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {language === 'tr' ? 'Hesabı Silme İşlemini Başlat' : 'Start Account Deletion'}
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
                                            {language === 'tr' ? 'Güncelleniyor...' : 'Updating...'}
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            {language === 'tr' ? 'E-postayı Güncelle' : 'Update Email'}
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
                                            {language === 'tr' ? 'Güncelleniyor...' : 'Updating...'}
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="h-4 w-4 mr-2" />
                                            {language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}
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
                                    {language === 'tr' ? "Vocalize'a Bildir" : "Feedback to Vocalize"}
                                </Button>

                                <Button
                                    onClick={handleLogout}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {language === 'tr' ? 'Çıkış Yap' : 'Logout'}
                                </Button>
                            </div>

                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full text-slate-500 hover:text-slate-300 hover:bg-transparent h-8 text-xs"
                            >
                                {language === 'tr' ? 'Pencereyi Kapat' : 'Close Window'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="bg-slate-800/80 p-8 rounded-full inline-flex mb-6">
                            <UserPlus className="h-12 w-12 text-teal-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white text-center mb-3">
                            {language === 'tr' ? 'Daha Fazla Özellik Açın' : 'Unlock More Features'}
                        </h3>
                        <p className="text-slate-400 text-center max-w-sm mb-6">
                            {language === 'tr'
                                ? 'Geri bildirimlerinizi takip edin, istatistiklerinizi görün and daha fazla özelliği kullanın.'
                                : 'Track your feedback, view statistics and unlock more features.'}
                        </p>
                        <Button
                            onClick={() => { handleRegisterClick(); onClose(); }}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-base mb-4"
                        >
                            <UserPlus className="mr-2 h-5 w-5" />
                            {t.register}
                        </Button>

                        <DialogFooter className="w-full mt-auto pt-6 border-t border-slate-800 flex-shrink-0 flex flex-col gap-3">
                            <Button
                                onClick={() => { onClose(); setSupportModalOpen(true); }}
                                variant="outline"
                                className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600 text-teal-400 hover:text-teal-300"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {language === 'tr' ? "Vocalize'a Bildir" : "Feedback to Vocalize"}
                            </Button>

                            <Button
                                onClick={handleLogout}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                {language === 'tr' ? 'Çıkış Yap' : 'Logout'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

export default SettingsModal;
