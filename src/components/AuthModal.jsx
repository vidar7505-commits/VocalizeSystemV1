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
import { Loader2, Lock, Mail, Phone, User, Building2, UserCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { TERMS_CONTENT, KVKK_CONTENT } from '@/constants/legalTexts';

// ✅ CDN LOGO LİNKLERİ
const CUSTOMER_LOGO_URL = "faviconbeyaz.png"; // Beyaz
const ADMIN_LOGO_URL = "faviconmain.png";    // Koyu Turkuaz

const translateError = (errorMsg) => {
	if (!errorMsg) return "Bir hata oluştu.";
	if (errorMsg.includes("Invalid login credentials")) return "E-posta veya şifre hatalı.";
	if (errorMsg.includes("User already registered")) return "Bu e-posta adresi zaten kayıtlı.";
	if (errorMsg.includes("Password should be at least")) return "Şifre en az 6 karakter olmalıdır.";
	return "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.";
};

export default function AuthModal({ 
  isOpen, 
  onClose, 
  defaultTab = "login", 
  defaultRole = "customer", 
  showGuestOption = false,
  onGuestContinue // QRRedirector için eklendi
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePhone = (phone) => /^05\d{9}$/.test(phone.replace(/\s/g, ''));

  const splitName = (fullName) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
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
      // QRRedirector'dan çağrılıyorsa, kendi fonksiyonunu kullan
      onGuestContinue();
    } else {
      // Normal kullanım (LandingPage veya başka yerlerden)
      console.log('🎯 Misafir girişi başlatıldı...');
      loginAsGuest();
      localStorage.setItem('vocalize_guest_mode', 'true');
      
      toast({ 
        title: "Misafir Girişi Başarılı", 
        description: "Yönlendiriliyorsunuz...",
        className: "bg-teal-600 text-white border-none"
      });
      
      // Modal'ı kapat ve navigate yap
      onClose();
      
      // Navigate'i biraz geciktir (modal kapanma animasyonu için)
      setTimeout(() => {
        console.log('🚀 CustomerPanel\'e yönlendiriliyor...');
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
      // ✅ DÜZELTİLDİ: /reset-password -> /update-password
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      toast({ title: "E-posta Gönderildi", description: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
      setViewMode('auth');
      setActiveTab('login');
      setFormData(prev => ({ ...prev, email: '' }));
    } catch (error) {
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

        const userType = data.user.user_metadata.user_type;

        if (activeRole === 'customer' && userType !== 'customer') {
          await supabase.auth.signOut();
          throw new Error("Bu bir Yönetici hesabıdır. Lütfen Yönetici Girişi yapınız.");
        }
        if (activeRole === 'manager' && userType !== 'manager') {
          await supabase.auth.signOut();
          throw new Error("Bu bir Müşteri hesabıdır. Lütfen Müşteri Girişi yapınız.");
        }
        
        localStorage.removeItem('vocalize_guest_mode');

        toast({
          title: "Giriş Başarılı",
          description: `Hoş geldiniz${data.user.user_metadata.first_name ? ', ' + data.user.user_metadata.first_name : ''}!`,
          className: "bg-teal-600 text-white border-none"
        });

        onClose();

        if (userType === 'customer') navigate('/customer-panel', { replace: true });
        if (userType === 'manager') navigate('/admin-panel', { replace: true });

      } else {
        if (!legalAccepted) {
          toast({ title: "Hata", description: "Kullanım koşullarını ve KVKK metnini kabul etmelisiniz.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const phone = formData.phone.replace(/\s/g, '');
        if (!validatePhone(phone)) {
          toast({ title: "Hata", description: "Geçersiz telefon numarası. Format: 05XXXXXXXXX", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (activeRole === 'manager') {
          if (!formData.managerCode.startsWith('MGR_')) {
            toast({ title: "Hata", description: "Geçersiz yönetici kodu formatı.", variant: "destructive" });
            setIsLoading(false);
            return;
          }

          const { data: managerData, error: managerError } = await supabase
            .from('managers')
            .select('business_id, business_name')
            .eq('manager_code', formData.managerCode)
            .maybeSingle();

          if (managerError || !managerData) {
            toast({ title: "Hata", description: "Geçersiz yönetici kodu.", variant: "destructive" });
            setIsLoading(false);
            return;
          }

          const { first, last } = splitName(formData.fullName);

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: first,
                last_name: last,
                phone: phone,
                user_type: 'manager',
                manager_code: formData.managerCode,
                business_id: managerData.business_id
              }
            }
          });

          if (authError) throw authError;

          const { error: profileError } = await supabase.from('manager_profiles').insert({
            user_id: authData.user.id,
            name: formData.fullName,
            email: formData.email,
            phone: phone,
            manager_code: formData.managerCode,
            business_id: managerData.business_id
          });

          if (profileError) console.warn('Profile creation warning:', profileError);

          toast({
            title: "Kayıt Başarılı",
            description: "E-postanızı doğrulayın ve giriş yapın.",
            className: "bg-teal-600 text-white border-none"
          });

          setActiveTab('login');
          setFormData({ fullName: '', email: '', phone: '', password: '', managerCode: '' });
          setLegalAccepted(false);

        } else {
          const { first, last } = splitName(formData.fullName);

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: first,
                last_name: last,
                phone: phone,
                user_type: 'customer'
              }
            }
          });

          if (authError) throw authError;

          const { error: profileError } = await supabase.from('customer_profiles').insert({
            user_id: authData.user.id,
            name: formData.fullName,
            email: formData.email,
            phone: phone
          });

          if (profileError) console.warn('Profile creation warning:', profileError);

          localStorage.removeItem('vocalize_guest_mode');

          toast({
            title: "Kayıt Başarılı",
            description: `Hoş geldiniz ${first}! Yönlendiriliyorsunuz...`,
            className: "bg-teal-600 text-white border-none"
          });

          onClose();
          navigate('/customer-panel', { replace: true });
        }
      }
    } catch (error) {
      toast({ title: "Hata", description: translateError(error.message), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white max-h-[95vh] overflow-y-auto p-0">
          <div className="p-6 md:p-8">
            <div className="flex flex-col items-center mb-6 md:mb-8">
              <img 
                src={activeRole === 'customer' ? CUSTOMER_LOGO_URL : CUSTOMER_LOGO_URL} 
                alt="Vocalize" 
                className="h-12 md:h-16 w-auto mb-4 object-contain transition-all duration-300"
                style={activeRole === 'manager' ? { filter: 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(152deg) brightness(97%) contrast(101%)' } : {}}
              />
            </div>

            <div className="w-full">
              {viewMode === 'forgot-password' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <button type="button" onClick={() => setViewMode('auth')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4" /> Geri Dön
                  </button>
                  <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-2">Şifremi Unuttum</h2>
                  <p className="text-slate-400 text-sm text-center mb-6">E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.</p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">E-posta Adresi</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        name="email" 
                        type="email" 
                        placeholder="ornek@email.com" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="pl-10 h-11 bg-slate-800 border-slate-700 text-white focus-visible:ring-teal-500 transition-all" 
                        required 
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all"
                  >
                    {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gönderiliyor...</>) : (<><KeyRound className="h-4 w-4 mr-2" /> Sıfırlama Bağlantısı Gönder</>)}
                  </Button>
                </form>
              ) : (
                <>
                  <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full mb-6">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 p-1">
                      <TabsTrigger value="customer" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-colors duration-300">Müşteri</TabsTrigger>
                      <TabsTrigger value="manager" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-colors duration-300">Yönetici</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex bg-slate-800 rounded-lg p-1 gap-1 mb-6">
                    <button onClick={() => setActiveTab('login')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'login' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Giriş</button>
                    <button onClick={() => setActiveTab('register')} className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors font-medium duration-200 ${activeTab === 'register' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Kayıt Ol</button>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    {activeTab === 'register' && (
                      <div className="space-y-3">
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            name="fullName" placeholder="İsim Soyisim" 
                            className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                            value={formData.fullName} onChange={handleInputChange} required />
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
                          name="password" type="password" placeholder="Şifre" 
                          className={`pl-10 h-11 bg-slate-800 border-slate-700 focus-visible:border-slate-600 transition-all ${activeRole === 'customer' ? 'focus-visible:ring-orange-600' : 'focus-visible:ring-teal-600'}`} 
                          value={formData.password} onChange={handleInputChange} required />
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

                    <Button type="submit" disabled={isLoading} className={`w-full h-11 text-white font-bold py-2 mt-6 transition-all duration-200 ${activeRole === 'customer' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                      {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />{activeTab === 'login' ? 'Giriş Yapılıyor...' : 'Hesap Oluşturuluyor...'}</>) : (activeTab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur')}
                    </Button>

                    {showGuestOption && activeRole === 'customer' && (
                      <div className="pt-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px bg-slate-700 flex-1" />
                          <span className="text-slate-500 text-xs uppercase font-semibold">veya</span>
                          <div className="h-px bg-slate-700 flex-1" />
                        </div>
                        <Button type="button" onClick={handleGuestLogin} className="w-full h-11 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-white border border-slate-700 transition-all duration-200">
                          <UserCheck className="mr-2 h-5 w-5" />
                          Misafir Olarak Devam Et
                        </Button>
                        <p className="text-xs text-slate-500 text-center italic mt-2 leading-relaxed">
                          Misafir olarak devam ederek <span className="text-slate-400">Kullanım Koşulları</span> ve <span className="text-slate-400">KVKK Aydınlatma Metni</span>'ni kabul etmiş olursunuz.
                        </p>
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showLegalModal} onOpenChange={setShowLegalModal}>
        <DialogContent className="bg-[#0f172a] border-slate-700 text-white sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
           <div className="mb-4"><h3 className="text-xl font-bold text-white">Yasal Bilgilendirme</h3></div>
           <Tabs value={activeLegalTab} onValueChange={setActiveLegalTab} className="w-full">
             <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="terms" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Kullanım Koşulları</TabsTrigger>
                <TabsTrigger value="kvkk" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">KVKK & Gizlilik</TabsTrigger>
             </TabsList>
             <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify max-h-96 overflow-y-auto">
               {activeLegalTab === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
             </div>
           </Tabs>
           <div className="flex justify-end gap-2 mt-6">
             <Button variant="outline" onClick={() => setShowLegalModal(false)} className="border-slate-600 hover:bg-slate-800 text-white hover:text-white">Kapat</Button>
             <Button onClick={() => { setLegalAccepted(true); setShowLegalModal(false); }} className="bg-teal-600 hover:bg-teal-700 text-white">Okudum, Onaylıyorum</Button>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}