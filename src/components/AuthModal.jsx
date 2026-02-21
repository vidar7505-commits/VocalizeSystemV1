import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Lock, Mail, Phone, User, Building2, ArrowLeft, KeyRound, ArrowRight } from 'lucide-react';
import { TERMS_CONTENT, KVKK_CONTENT } from '@/constants/legalTexts';
import { useTranslation } from 'react-i18next';

const CUSTOMER_LOGO_URL = "faviconbeyaz.png";
const ADMIN_LOGO_URL = "faviconmain.png";

const translateError = (errorMsg, t) => {
  if (!errorMsg) return t('auth.errors.generic');
  if (errorMsg.includes("Invalid login credentials")) return t('auth.errors.invalid_credentials');
  if (errorMsg.includes("User already registered")) return t('auth.errors.already_registered');
  if (errorMsg.includes("Password should be at least")) return t('auth.errors.password_too_short');
  if (errorMsg.includes("manager code")) return t('auth.errors.invalid_manager_code');
  if (errorMsg.includes("Database error")) return t('auth.errors.database_error');
  return t('auth.errors.process_error');
};

// 🟢 Title Case Dönüştürücü Fonksiyonu - Türkçe Karakterleri Destekler
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .replace(/^\s+/, '') // Başındaki boşlukları kaldır
    .toLowerCase()
    .split(/\s+/) // Boşluklara göre böl
    .map(word => {
      if (!word) return word; // Boş string'i koru
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' '); // Boşluklarla birleştir
};

// ✅ Legal Modal Component
const LegalModal = React.memo(({ open, onOpenChange, activeLegalTab, setActiveLegalTab, legalAccepted, setLegalAccepted }) => {
  const { t } = useTranslation('admin');
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a] border-slate-700 text-white sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <div className="sr-only">
          <DialogTitle>{t('auth.legal.title')}</DialogTitle>
          <DialogDescription>{t('auth.legal.desc')}</DialogDescription>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">{t('auth.legal.title')}</h3>
        </div>
        <Tabs value={activeLegalTab} onValueChange={setActiveLegalTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="terms" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              {t('auth.legal.terms_tab')}
            </TabsTrigger>
            <TabsTrigger value="kvkk" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              {t('auth.legal.kvkk_tab')}
            </TabsTrigger>
          </TabsList>
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify max-h-96 overflow-y-auto">
            {activeLegalTab === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
          </div>
        </Tabs>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            {t('auth.legal.close')}
          </Button>
          <Button
            onClick={() => {
              setLegalAccepted(true);
              onOpenChange(false);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {t('auth.legal.accept')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

// ✅ Main AuthModal
const AuthModal = React.memo(({
  isOpen,
  onClose,
  defaultTab = "login",
  defaultRole = "customer",
  showGuestOption = false,
  onGuestContinue
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [viewMode, setViewMode] = useState('auth');
  const [activeRole, setActiveRole] = useState(defaultRole);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    managerCode: ''
  });

  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState('terms');

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation('admin');
  const { loginAsGuest } = useAuth();

  // 🟢 Memoize logo style
  const managerLogoStyle = useMemo(() => ({
    filter: 'brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(402%) hue-rotate(132deg) brightness(95%) contrast(91%)'
  }), []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setActiveRole(defaultRole);
      setViewMode('auth');
      setFormData({ fullName: '', email: '', phone: '', password: '', managerCode: '' });
      setLegalAccepted(false);
    }
  }, [isOpen, defaultTab, defaultRole]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // 🟢 fullName için: yazarken Title Case göster
    if (name === 'fullName') {
      // Eğer son karakteri boşluk ise, otomatik formatla
      if (value.endsWith(' ')) {
        // Boşluk eklendiyse, önceki kelimeyi Title Case yap
        const formatted = toTitleCase(value.slice(0, -1)); // Son boşluğu çıkar
        setFormData(prev => ({ ...prev, [name]: formatted + ' ' })); // Tekrar boşluk ekle
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePhone = (phone) => /^05\d{9}$/.test(phone.replace(/\s/g, ''));

  const validateFullName = (fullName) => {
    const parts = fullName.trim().split(' ').filter(p => p.length > 0);
    return parts.length >= 2;
  };

  const validatePassword = (password) => {
    return password.length >= 6 && password.length <= 12;
  };

  const splitName = (fullName) => {
    const parts = fullName.trim().split(' ').filter(p => p.length > 0);
    const last = parts.pop();
    const first = parts.join(' ');
    return { first, last };
  };

  const openLegal = (tab) => {
    setActiveLegalTab(tab);
    setShowLegalModal(true);
  };

  const handleGuestLogin = async () => {
    if (onGuestContinue) {
      onGuestContinue();
    } else {
      await loginAsGuest();

      toast({
        title: t('auth.login.guest_success_title'),
        description: t('auth.login.guest_success_desc'),
        className: "bg-teal-600 text-white border-none"
      });

      onClose();

      setTimeout(() => {
        navigate('/customer-panel?guest=true', { replace: true });
      }, 300);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        toast({ title: t('auth.errors.generic'), description: error.message, variant: 'destructive' });
      }
    } catch (err) {
      console.error('[Google SSO] Error:', err);
      toast({ title: t('auth.errors.generic'), description: err.message, variant: 'destructive' });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast({ title: t('auth.errors.generic'), description: t('auth.errors.empty_email'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      toast({
        title: t('auth.forgot_password.success_title'),
        description: t('auth.forgot_password.success_desc'),
        className: "bg-teal-600 text-white border-none"
      });

      setViewMode('auth');
      setActiveTab('login');
      setFormData(prev => ({ ...prev, email: '' }));
    } catch (error) {
      console.error("Password reset error:", error);
      toast({ title: t('auth.errors.generic'), description: translateError(error.message, t), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: t('auth.login.success_title'),
          description: t('auth.login.success_desc'),
          className: "bg-teal-600 text-white border-none"
        });

        onClose();
        // Hesaba giriş başarılı
        setTimeout(() => {
          const search = window.location.search;
          if (data.user?.user_metadata?.user_type === 'manager') {
            navigate(`/admin-panel${search}`, { replace: true });
          } else {
            navigate(`/customer-panel${search}`, { replace: true });
          }
        }, 300);
      }
      else {
        if (!legalAccepted) {
          toast({ title: t('auth.errors.generic'), description: t('auth.errors.legal_not_accepted'), variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validateFullName(formData.fullName)) {
          toast({ title: t('auth.errors.generic'), description: t('auth.errors.invalid_name'), variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validatePassword(formData.password)) {
          toast({ title: t('auth.errors.generic'), description: t('auth.errors.invalid_password_length'), variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validatePhone(formData.phone)) {
          toast({ title: t('auth.errors.generic'), description: t('auth.errors.invalid_phone'), variant: "destructive" });
          setIsLoading(false);
          return;
        }

        // AuthModal.jsx içindeki signUp kısmını bu kesin haliyle güncelleyin:
        const { first, last } = splitName(formData.fullName); // fullName'den ayırıyoruz

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: first, // splitName'den gelen
              last_name: last,   // splitName'den gelen
              full_name: formData.fullName,
              phone: formData.phone,
              user_type: activeRole, // "manager" olmalı
              invite_code: formData.managerCode
            }
          }
        });

        if (signupError) throw signupError;

        if (signupData.session) {
          toast({
            title: "Kayıt Başarılı",
            description: "Hesabınız oluşturuldu, yönlendiriliyorsunuz...",
            className: "bg-teal-600 text-white border-none"
          });

          onClose();
          setTimeout(() => {
            const search = window.location.search;
            if (activeRole === 'manager') {
              navigate(`/admin-panel${search}`, { replace: true });
            } else {
              navigate(`/customer-panel${search}`, { replace: true });
            }
          }, 800);
        } else {
          toast({
            title: t('auth.register.success_title'),
            description: t('auth.register.verify_email'),
            className: "bg-teal-600 text-white border-none"
          });
          onClose();
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({ title: t('auth.errors.generic'), description: translateError(error.message, t), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#0f172a] border-slate-700 text-white w-[95vw] max-w-md p-0 max-h-[85vh] flex flex-col rounded-xl md:rounded-lg overflow-hidden gap-0">
          <div className="sr-only">
            <DialogTitle>{activeTab === 'login' ? t('auth.login.title') : t('auth.register.title')}</DialogTitle>
            <DialogDescription>{activeTab === 'login' ? t('auth.login.success_desc') : t('auth.register.success_desc')}</DialogDescription>
          </div>
          <div className="relative flex-shrink-0">
            {/* Header: Mobilde Küçültüldü (h-28), Masaüstünde Normal (h-40) */}
            <div className="relative h-24 md:h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
              </div>
              <img
                src={activeRole === 'customer' ? CUSTOMER_LOGO_URL : ADMIN_LOGO_URL}
                alt="Logo"
                className="h-14 md:h-20 relative z-10 transition-all duration-300"
                style={activeRole === 'manager' ? managerLogoStyle : {}}
              />
            </div>
          </div>

          {/* Content Container - Scrollable Area */}
          <div className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto overscroll-y-contain">
            {viewMode === 'forgot-password' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setViewMode('auth')}
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.forgot_password.back')}
                </button>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    name="email"
                    type="email"
                    placeholder={t('auth.placeholders.email')}
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-800 border-slate-700 text-white focus-visible:ring-teal-500 transition-all"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('auth.forgot_password.sending')}
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      {t('auth.forgot_password.submit')}
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <>
                <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full mb-4">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 p-1">
                    <TabsTrigger value="customer" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-colors duration-300">{t('auth.register.customer_tab')}</TabsTrigger>
                    <TabsTrigger value="manager" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-colors duration-300">{t('auth.register.manager_tab')}</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex bg-slate-800 rounded-lg p-1 gap-1 mb-4">
                  <button onClick={() => setActiveTab('login')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'login' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t('auth.login.title')}</button>
                  <button onClick={() => setActiveTab('register')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'register' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t('auth.register.title')}</button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">

                  {/* Misafir Girişi Kutusu */}
                  {showGuestOption && activeRole === 'customer' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-4 shadow-lg mb-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-slate-300 font-medium leading-tight">
                            {t('auth.login.guest_title')}
                          </div>
                          <Button
                            type="button"
                            onClick={handleGuestLogin}
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all duration-200 whitespace-nowrap h-10 px-5 shadow-md shadow-teal-900/20 shrink-0"
                          >
                            {t('auth.login.guest_button')} <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        </div>
                        <div className="border-t border-slate-700/50 pt-2">
                          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                            {t('auth.register.legal_consent')}
                          </p>
                        </div>
                      </div>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                          <span className="bg-[#0f172a] px-3 text-slate-500">
                            {activeTab === 'login' ? t('auth.login.title') : t('auth.register.title')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google SSO Butonu - Sadece müşteri sekmesinde */}
                  {activeRole === 'customer' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-slate-600 bg-slate-800/60 hover:bg-slate-700 transition-all duration-200 text-white font-medium text-sm"
                      >
                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {activeTab === 'login' ? 'Google ile Devam Et' : 'Google ile Kayıt Ol'}
                      </button>

                      <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700/60" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">veya</span>
                        <div className="flex-1 h-px bg-slate-700/60" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'register' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          name="fullName" placeholder={t('auth.placeholders.full_name')}
                          className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`}
                          value={formData.fullName}
                          onChange={handleInputChange}
                          autoComplete="name"
                          onBlur={(e) => {
                            const formatted = toTitleCase(e.target.value);
                            setFormData(prev => ({ ...prev, fullName: formatted }));
                          }}
                          required />
                      </div>
                      {activeRole === 'manager' && (
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            name="managerCode" placeholder={t('auth.placeholders.manager_code')}
                            className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`}
                            value={formData.managerCode} onChange={handleInputChange}
                            autoComplete="off"
                            required />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        name="email" type="email" placeholder={t('auth.placeholders.email')}
                        autoComplete="username"
                        className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`}
                        value={formData.email} onChange={handleInputChange} required />
                    </div>
                    {activeTab === 'register' && (
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          name="phone" type="tel" placeholder={t('auth.placeholders.phone')}
                          autoComplete="tel"
                          className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`}
                          value={formData.phone} onChange={handleInputChange} required pattern="05[0-9]{9}" title={t('auth.errors.invalid_phone')} />
                      </div>
                    )}
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        name="password" type="password" placeholder={t('auth.placeholders.password')}
                        autoComplete={activeTab === 'register' ? "new-password" : "current-password"}
                        className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`}
                        value={formData.password} onChange={handleInputChange} required minLength="6" maxLength="12" />
                    </div>
                  </div>

                  {activeTab === 'login' && (
                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={() => setViewMode('forgot-password')} className={`text-xs text-slate-400 transition-colors flex items-center gap-1 ${activeRole === 'customer' ? 'hover:text-orange-500' : 'hover:text-teal-500'}`}><KeyRound className="w-3 h-3" /> {t('auth.login.forgot_password')}</button>
                    </div>
                  )}

                  {activeTab === 'register' && (
                    <div className="flex items-start space-x-2 my-4 pt-2">
                      <Checkbox
                        id="legal-check" checked={legalAccepted} onCheckedChange={setLegalAccepted}
                        className={`mt-1 border-slate-500 ${activeRole === 'customer' ? 'data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600' : 'data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600'}`} />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="legal-check" className="text-xs text-slate-400 font-medium leading-relaxed">
                          {t('auth.register.legal_consent')}
                        </label>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={isLoading} className={`w-full h-11 text-white font-bold py-2 mt-2 transition-all duration-200 ${activeRole === 'customer' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {activeTab === 'login' ? t('auth.login.logging_in') : t('auth.register.creating_account')}
                      </>
                    ) : (
                      activeTab === 'login' ? t('auth.login.button') : t('auth.register.button')
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog >

      {showLegalModal && (
        <LegalModal
          open={showLegalModal}
          onOpenChange={setShowLegalModal}
          activeLegalTab={activeLegalTab}
          setActiveLegalTab={setActiveLegalTab}
          legalAccepted={legalAccepted}
          setLegalAccepted={setLegalAccepted}
        />
      )}
    </>
  );
});

export default AuthModal;