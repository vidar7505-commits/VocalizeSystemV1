import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Lock, Mail, Phone, User, Building2, UserCheck, ArrowLeft, KeyRound, ArrowRight } from 'lucide-react';
import { TERMS_CONTENT, KVKK_CONTENT } from '@/constants/legalTexts';

const CUSTOMER_LOGO_URL = "faviconbeyaz.png";
const ADMIN_LOGO_URL = "faviconmain.png";

const translateError = (errorMsg) => {
  if (!errorMsg) return "Bir hata oluştu.";
  if (errorMsg.includes("Invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (errorMsg.includes("User already registered")) return "Bu e-posta adresi zaten kayıtlı.";
  if (errorMsg.includes("Password should be at least")) return "Şifre en az 6 karakter olmalıdır.";
  if (errorMsg.includes("manager code")) return "Geçersiz veya kullanılmış yönetici kodu.";
  return "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.";
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
function LegalModal({ open, onOpenChange, activeLegalTab, setActiveLegalTab, legalAccepted, setLegalAccepted }) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a] border-slate-700 text-white sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">Yasal Bilgilendirme</h3>
        </div>
        <Tabs value={activeLegalTab} onValueChange={setActiveLegalTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="terms" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Kullanım Koşulları
            </TabsTrigger>
            <TabsTrigger value="kvkk" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              KVKK & Gizlilik
            </TabsTrigger>
          </TabsList>
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify max-h-96 overflow-y-auto">
            {activeLegalTab === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
          </div>
        </Tabs>
        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-slate-600 hover:bg-slate-800 text-white hover:text-white"
          >
            Kapat
          </Button>
          <Button 
            onClick={() => {
              setLegalAccepted(true);
              onOpenChange(false);
            }} 
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Okudum, Onaylıyorum
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ✅ Main AuthModal
export default function AuthModal({ 
  isOpen, 
  onClose, 
  defaultTab = "login", 
  defaultRole = "customer", 
  showGuestOption = false,
  onGuestContinue
}) {
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
  const { loginAsGuest } = useAuth();

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

  const handleGuestLogin = () => {
    if (onGuestContinue) {
      onGuestContinue();
    } else {
      loginAsGuest();
      localStorage.setItem('vocalize_guest_mode', 'true');
      
      toast({ 
        title: "Misafir Girişi Başarılı", 
        description: "Yönlendiriliyorsunuz...",
        className: "bg-teal-600 text-white border-none"
      });
      
      onClose();
      
      setTimeout(() => {
        navigate('/customer-panel?guest=true', { replace: true });
      }, 300);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast({ title: "Hata", description: "Lütfen e-posta adresinizi girin.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      
      toast({ 
        title: "E-posta Gönderildi", 
        description: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen spam kutunuzu da kontrol edin.",
        className: "bg-teal-600 text-white border-none"
      });
      
      setViewMode('auth');
      setActiveTab('login');
      setFormData(prev => ({ ...prev, email: '' }));
    } catch (error) {
      console.error("Password reset error:", error);
      toast({ title: "Hata", description: translateError(error.message), variant: "destructive" });
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
          title: "Giriş Başarılı", 
          description: "Hoş geldiniz! Yönlendiriliyorsunuz...",
          className: "bg-teal-600 text-white border-none"
        });

        onClose();
        setTimeout(() => {
          if (data.user?.user_metadata?.user_type === 'manager') {
            navigate('/admin-panel', { replace: true });
          } else {
            navigate('/customer-panel', { replace: true });
          }
        }, 300);
      } 
      else {
        if (!legalAccepted) {
          toast({ title: "Hata", description: "Lütfen yasal metinleri onaylayınız.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validateFullName(formData.fullName)) {
          toast({ title: "Hata", description: "Lütfen isim ve soyisim giriniz (örn: Emir Yılmaz).", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validatePassword(formData.password)) {
          toast({ title: "Hata", description: "Şifre 6-12 karakter arasında olmalıdır.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!validatePhone(formData.phone)) {
          toast({ title: "Hata", description: "Telefon numarası 05xxxxxxxxx formatında olmalıdır (11 haneli).", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const { first, last } = splitName(formData.fullName);
        // 🟢 Formatlı adı gönder
        const formattedFullName = toTitleCase(formData.fullName);

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formattedFullName,
              first_name: first,
              last_name: last,
              phone: formData.phone,
              user_type: activeRole,
              ...(activeRole === 'manager' && { manager_code: formData.managerCode })
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
            if (activeRole === 'manager') {
              navigate('/admin-panel', { replace: true });
            } else {
              navigate('/customer-panel', { replace: true });
            }
          }, 800);
        } else {
          toast({ 
            title: "Kayıt Başarılı", 
            description: "Lütfen e-posta adresinizi doğrulayın. Gelen kutunuzu kontrol edin.",
            className: "bg-teal-600 text-white border-none"
          });
          onClose();
        }
      }
    } catch (error) {
      toast({ title: "Hata", description: translateError(error.message), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#0f172a] border-slate-700 text-white sm:max-w-md p-0 max-h-[95vh] flex flex-col">
          <div className="relative flex-shrink-0">
            {/* Header: Mobilde Küçültüldü (h-28), Masaüstünde Normal (h-40) */}
            <div className="relative h-28 md:h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
              </div>
              <img 
                src={activeRole === 'customer' ? CUSTOMER_LOGO_URL : ADMIN_LOGO_URL}
                alt="Logo"
                className="h-16 md:h-20 relative z-10 transition-all duration-300"
                style={activeRole === 'manager' ? {
                  filter: 'brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(402%) hue-rotate(132deg) brightness(95%) contrast(91%)'
                } : {}}
              />
            </div>

            {/* Content Container - Scrollable Area */}
            <div className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto">
              {viewMode === 'forgot-password' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <button 
                    type="button"
                    onClick={() => setViewMode('auth')} 
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Geri Dön
                  </button>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      name="email" 
                      type="email" 
                      placeholder="E-posta Adresi" 
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
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" /> 
                        Sıfırlama Bağlantısı Gönder
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <>
                  <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full mb-4">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 p-1">
                      <TabsTrigger value="customer" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-colors duration-300">Müşteri</TabsTrigger>
                      <TabsTrigger value="manager" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-colors duration-300">Yönetici</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex bg-slate-800 rounded-lg p-1 gap-1 mb-4">
                    <button onClick={() => setActiveTab('login')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'login' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Giriş</button>
                    <button onClick={() => setActiveTab('register')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'register' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Kayıt Ol</button>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    


                    {/* 🟢 GÜNCELLEME: Misafir Girişi Kutusu - HEM LOGIN HEM REGISTER SEKMELERİNDE */}
                    {showGuestOption && activeRole === 'customer' && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-4 shadow-lg mb-6 flex flex-col gap-3">
                          {/* Üst Kısım: Soru ve Buton */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-slate-300 font-medium leading-tight">
                              Üyelikle uğraşmak <br className="hidden sm:block"/> istemiyor musun?
                            </div>
                            <Button 
                              type="button" 
                              onClick={handleGuestLogin} 
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all duration-200 whitespace-nowrap h-10 px-5 shadow-md shadow-teal-900/20 shrink-0"
                            >
                              Misafir Girişi <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          </div>

                          {/* Alt Kısım: Pasif Yasal Onay Metni */}
                          <div className="border-t border-slate-700/50 pt-2">
                            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                              Devam ederek <span className="cursor-pointer hover:text-teal-400 underline decoration-slate-600 underline-offset-2 transition-colors" onClick={(e) => { e.preventDefault(); openLegal('terms'); }}>Kullanım Koşulları</span> ve <span className="cursor-pointer hover:text-teal-400 underline decoration-slate-600 underline-offset-2 transition-colors" onClick={(e) => { e.preventDefault(); openLegal('kvkk'); }}>KVKK Metni</span>'ni kabul etmiş sayılırsınız.
                            </p>
                          </div>
                        </div>
                        
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
                          {/* 🟢 DINAMIK AYRAÇ: Aktif tabı belli et */}
                          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="bg-[#0f172a] px-3 text-slate-500">
                              {activeTab === 'login' ? 'Veya Kayıt Ol' : 'Veya Giriş Yap'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'register' && (
                      <div className="space-y-3">
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            name="fullName" placeholder="İsim Soyisim" 
                            className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                            value={formData.fullName} 
                            onChange={handleInputChange}
                            onBlur={(e) => {
                              // 🟢 Focus çıkarken tam Title Case formatla
                              const formatted = toTitleCase(e.target.value);
                              setFormData(prev => ({ ...prev, fullName: formatted }));
                            }}
                            required />
                        </div>
                        {activeRole === 'manager' && (
                          <div className="relative">
                            <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input 
                              name="managerCode" placeholder="Yönetici Kodu (MGR_...)" 
                              className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                              value={formData.managerCode} onChange={handleInputChange} required />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                          name="email" type="email" placeholder="E-posta Adresi" 
                          className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                          value={formData.email} onChange={handleInputChange} required />
                      </div>
                      {activeTab === 'register' && (
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            name="phone" type="tel" placeholder="Telefon (05...)" 
                            className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                            value={formData.phone} onChange={handleInputChange} required pattern="05[0-9]{9}" title="Telefon numarası 05 ile başlamalı ve 11 haneli olmalıdır." />
                        </div>
                      )}
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                          name="password" type="password" placeholder="Şifre (6-12 karakter)" 
                          className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                          value={formData.password} onChange={handleInputChange} required minLength="6" maxLength="12" />
                      </div>
                    </div>

                    {activeTab === 'login' && (
                      <div className="flex justify-end pt-2">
                        <button type="button" onClick={() => setViewMode('forgot-password')} className={`text-xs text-slate-400 transition-colors flex items-center gap-1 ${activeRole === 'customer' ? 'hover:text-orange-500' : 'hover:text-teal-500'}`}><KeyRound className="w-3 h-3" /> Şifremi Unuttum?</button>
                      </div>
                    )}

                    {activeTab === 'register' && (
                      <div className="flex items-start space-x-2 my-4 pt-2">
                        <Checkbox 
                          id="legal-check" checked={legalAccepted} onCheckedChange={setLegalAccepted} 
                          className={`mt-1 border-slate-500 ${activeRole === 'customer' ? 'data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600' : 'data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600'}`} />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="legal-check" className="text-xs text-slate-400 font-medium leading-relaxed">
                            Kayıt olarak <span className={`cursor-pointer hover:underline transition-colors ${activeRole === 'customer' ? 'text-orange-500 hover:text-orange-400' : 'text-teal-500 hover:text-teal-400'}`} onClick={(e) => { e.preventDefault(); openLegal('terms'); }}>Kullanım Koşulları</span> ve <span className={`cursor-pointer hover:underline transition-colors ${activeRole === 'customer' ? 'text-orange-500 hover:text-orange-400' : 'text-teal-500 hover:text-teal-400'}`} onClick={(e) => { e.preventDefault(); openLegal('kvkk'); }}>KVKK Aydınlatma Metni</span>'ni okuduğumu ve kabul ettiğimi onaylıyorum.
                          </label>
                        </div>
                      </div>
                    )}

                    <Button type="submit" disabled={isLoading} className={`w-full h-11 text-white font-bold py-2 mt-2 transition-all duration-200 ${activeRole === 'customer' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {activeTab === 'login' ? 'Giriş Yapılıyor...' : 'Hesap Oluşturuluyor...'}
                        </>
                      ) : (
                        activeTab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LegalModal 
        open={showLegalModal}
        onOpenChange={setShowLegalModal}
        activeLegalTab={activeLegalTab}
        setActiveLegalTab={setActiveLegalTab}
        legalAccepted={legalAccepted}
        setLegalAccepted={setLegalAccepted}
      />
    </>
  );
}