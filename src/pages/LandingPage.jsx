import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link as ScrollLink, animateScroll as scroll, scroller } from 'react-scroll';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { Menu, X, Zap, CheckCircle2, Timer, Send, Lightbulb, Heart, QrCode, Loader2, ArrowRight, TrendingUp, Target, RefreshCw, Cpu, BrainCircuit, Activity, Sparkles, MessageSquare as MessageSquareText, Info, AlertTriangle, Layers, Zap as ZapIcon, Network } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import AuthModal from "@/components/AuthModal";
import InstallationRequestModal from "@/components/InstallationRequestModal";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/customSupabaseClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TERMS_CONTENT = `
VOCALIZE PLATFORMU KULLANIM KOŞULLARI

Bu Kullanım Koşulları, Vocalize SaaS platformunu ("Platform") kullanan tüm kişi ve kurumlar için bağlayıcıdır. Platforma kayıt olarak aşağıdaki şartları kabul etmiş sayılırsınız.

1. HİZMETİN TANIMI
Vocalize, işletmelerin müşterilerinden QR kod aracılığıyla geri bildirim (şikayet, öneri, değerlendirme) toplamasına, bu verileri analiz etmesine ve yönetmesine olanak tanıyan bulut tabanlı bir yazılım hizmetidir.

2. KULLANICI KATEGORİLERİ
- Yönetici (İşletme): Platformu müşterilerinden geri bildirim toplamak amacıyla kullanan ticari işletmelerdir.
- Müşteri (Son Kullanıcı): İşletmelere geri bildirim bırakan gerçek kişilerdir.
- Misafir Kullanıcı: Kayıt olmadan sınırlı özelliklerle geri bildirim bırakan kullanıcılardır.

3. KULLANICI YÜKÜMLÜLÜKLERİ
- Kullanıcılar, Platformu kullanırken genel ahlaka, kamu düzenine ve yürürlükteki yasalara aykırı içerik (küfür, hakaret, tehdit, yasa dışı materyal vb.) paylaşamaz.
- İşletmeler, topladıkları müşteri verilerini KVKK ve ilgili mevzuata uygun şekilde kullanmakla yükümlüdür.
- Kullanıcı hesaplarının güvenliği kullanıcının sorumluluğundadır. Şifre paylaşımından doğacak zararlardan Vocalize sorumlu tutulamaz.

4. VERİ İŞLEME VE AI KULLANIMI
- Platform, müşteri geri bildirimlerini analiz etmek, özetlemek ve işletmelere içgörü sunmak amacıyla Yapay Zeka (AI) teknolojileri kullanır.
- Gönderilen geri bildirimler, anonimleştirilerek AI modellerinin eğitilmesi ve hizmet kalitesinin artırılması amacıyla kullanılabilir.
- Kullanıcılar, içeriklerinin bu amaçla işlenmesine izin verir.

5. TEKNİK ALTYAPI VE YURTDIŞI AKTARIM
- Vocalize, veritabanı ve sunucu hizmetleri için Supabase Inc. altyapısını kullanmaktadır.
- Verileriniz, hizmetin doğası gereği Supabase'in yurtdışında (ABD/AB) bulunan sunucularında şifreli olarak saklanmaktadır. Kayıt olarak bu veri aktarımını kabul etmiş sayılırsınız.

6. HİZMET KESİNTİLERİ VE SORUMLULUK REDDİ
- Platform "olduğu gibi" (as-is) sunulmaktadır. Vocalize, kesintisiz hizmet, %100 doğruluk veya belirli bir amaca uygunluk garantisi vermez.
- Teknik arızalar, bakım çalışmaları veya mücbir sebeplerden kaynaklanan veri kayıplarından veya hizmet kesintilerinden Vocalize sorumlu değildir.

7. ÜCRETLENDİRME VE DEĞİŞİKLİK HAKKI
- Vocalize, sunduğu paketlerin fiyatlarını ve içeriğini önceden bildirimde bulunarak değiştirme hakkını saklı tutar.
- Pilot kullanım süresi boyunca ücretsiz sunulan özellikler, daha sonra ücretli hale getirilebilir.

8. HESABIN ASKIYA ALINMASI VEYA SİLİNMESİ
- Kötüye kullanım (spam, saldırı, manipülasyon) tespit edilmesi durumunda Vocalize, kullanıcı hesabını önceden uyarı yapmaksızın askıya alma veya kalıcı olarak silme hakkına sahiptir.

9. FİKRİ MÜLKİYET
- Platformun tasarımı, yazılımı, logosu ve tüm fikri hakları Vocalize'a aittir. İzinsiz kopyalanamaz veya ticari amaçla çoğaltılamaz.

10. GELECEKTE HİZMETİN SONLANDIRILMASI
- Vocalize, ticari kararları doğrultusunda Platformu tamamen kapatma veya hizmeti sonlandırma hakkını saklı tutar. Bu durumda kullanıcılara verilerini yedeklemeleri için makul bir süre tanınacaktır.
`;

const KVKK_CONTENT = `
KVKK AYDINLATMA METNİ

Vocalize olarak kişisel verilerinizin güvenliğine önem veriyoruz. 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, verilerinizin nasıl işlendiği aşağıda açıklanmıştır.

1. VERİ SORUMLUSU
Vocalize Platformu (İletişim: support@vocalize.app)

2. İŞLENEN KİŞİSEL VERİLER
Platforma kayıt olurken veya kullanırken aşağıdaki verileriniz işlenmektedir:
- Kimlik Bilgileri: Ad, Soyad.
- İletişim Bilgileri: E-posta adresi, Telefon numarası.
- İşlem Güvenliği: IP adresi, Log kayıtları, Cihaz bilgileri.
- Müşteri İşlem: Gönderdiğiniz geri bildirimler, şikayetler, puanlar ve yüklenen görseller.

3. VERİ İŞLEME AMAÇLARI
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
- Üyelik işlemlerinin gerçekleştirilmesi ve hesabın yönetilmesi.
- Müşteri geri bildirimlerinin ilgili işletmeye iletilmesi ve takibi.
- Şikayet yönetimi ve müşteri memnuniyeti süreçlerinin yürütülmesi.
- Yapay zeka destekli analizlerin yapılması (duygu analizi, özetleme).
- Yasal yükümlülüklerin yerine getirilmesi (log tutma vb.).

4. HUKUKİ SEBEP
Kişisel verileriniz, KVKK Madde 5/2 kapsamında "Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" ve "Veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması" hukuki sebeplerine dayalı olarak işlenmektedir.

5. YURTDIŞI VERİ AKTARIMI
Platformun teknik altyapısı global bulut sağlayıcıları üzerinde çalışmaktadır.
| Hizmet Sağlayıcı | Ülke | Amaç |
|------------------|------|------|
| Supabase Inc.    | ABD  | Veritabanı ve Kimlik Doğrulama |
| OpenAI / LLM     | ABD  | Yapay Zeka Analizi (İçerik Verisi) |

Açık rızanız doğrultusunda verileriniz, hizmetin sağlanabilmesi için bu sunuculara aktarılmaktadır.

6. SAKLAMA VE SİLME
Kişisel verileriniz, üyeliğiniz devam ettiği sürece veya yasal saklama süreleri boyunca muhafaza edilir. Üyeliğinizi sildiğinizde veya talep etmeniz durumunda, yasal zorunluluklar hariç olmak üzere verileriniz silinir veya anonim hale getirilir.

7. İLGİLİ KİŞİNİN HAKLARI
KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını öğrenme, eksik/yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahipsiniz. Taleplerinizi uygulama üzerinden veya e-posta yoluyla iletebilirsiniz.
`;

// Optimized Animated Counter
const AnimatedCounter = ({
  from = 0,
  to,
  duration = 2,
  suffix = ""
}) => {
  const nodeRef = useRef();
  const inView = useInView(nodeRef, {
    once: true,
    margin: "-100px"
  });
  useEffect(() => {
    const node = nodeRef.current;
    if (!inView) return;
    let startTime;
    const step = timestamp => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(from + (to - from) * ease);
      if (node) {
        node.textContent = current.toLocaleString() + suffix;
      }
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [inView, from, to, duration, suffix]);
  return <span ref={nodeRef} className="tabular-nums">{from}{suffix}</span>;
};

const StarBackground = () => {
  const {
    scrollY
  } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const stars = useRef(Array.from({
    length: 50
  }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.3 + 0.1,
    scale: Math.random() * 0.5 + 0.5
  }))).current;
  return <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star, i) => <motion.div key={star.id} style={{
      position: 'absolute',
      left: star.left,
      top: star.top,
      y: i % 2 === 0 ? y1 : y2,
      opacity: star.opacity,
      scale: star.scale
    }} className="text-white/20 rounded-full bg-white">
           <div style={{
        width: star.size,
        height: star.size,
        borderRadius: '50%',
        backgroundColor: 'currentColor'
      }} />
        </motion.div>)}
    </div>;
};

const FadeIn = ({
  children,
  delay = 0,
  className
}) => {
  return <motion.div initial={{
    opacity: 0,
    y: 30
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true,
    margin: "-50px"
  }} transition={{
    duration: 0.6,
    delay,
    ease: "easeOut"
  }} className={className}>
      {children}
    </motion.div>;
};

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false); // NEW STATE
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authDefaultRole, setAuthDefaultRole] = useState('customer');
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '' });

  // Lead Modal State
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadType, setLeadType] = useState('info_request'); // 'info_request' or 'quick_question'
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const progressRef = useRef(null);
  const progressInView = useInView(progressRef, {
    once: true
  });
  const quickOptions = ["Fiyatlandırmayı öğrenmek istiyorum", "Demo toplantısı yapmak istiyorum", "Vocalize'ın çalışma mantığını öğrenmek istiyorum", "İşletmem için uygun mu değerlendirmek istiyorum"];
  const handleQuickOption = option => {
    setLeadForm(prev => ({
      ...prev,
      message: option
    }));
  };
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // QR Redirector'dan gelen state'i kontrol et ve AuthModal'ı aç
  useEffect(() => {
    if (location.state?.openAuthModal) {
      setIsAuthModalOpen(true);
      if (location.state.defaultTab) {
        setAuthDefaultTab(location.state.defaultTab);
      }
      // Tarayıcı geçmişini temizle ki sayfa yenilenince modal tekrar açılmasın
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const scrollToTop = () => {
    scroll.scrollToTop();
  };
  const scrollToPricing = () => {
    scroller.scrollTo('pricing', {
      duration: 800,
      delay: 0,
      smooth: 'easeInOutQuart',
      offset: -50
    });
  };
  const openLogin = () => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  };
  const openRegister = () => {
    setAuthDefaultTab('register');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  };
  const openManagerLogin = () => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('manager');
    setIsAuthModalOpen(true);
  };
  
  // NEW FUNCTION
  const openInstallModal = () => {
    setInstallModalOpen(true);
  };

  const handleGuestContinue = () => {
    setIsAuthModalOpen(false);
    
    // LocalStorage'dan QR verilerini kontrol et
    const lastBusiness = localStorage.getItem('vocalize_last_business');
    const lastBranch = localStorage.getItem('vocalize_last_branch');
    
    toast({
      title: "Misafir Modu",
      description: lastBusiness ? "QR ile doğrulanan şubeye yönlendiriliyorsunuz." : "Geri bildirim göndermek için işletme seçin."
    });
    
    setTimeout(() => {
      if (lastBusiness && lastBranch) {
        navigate(`/customer-panel?guest=true&business=${lastBusiness}&branch=${lastBranch}&from_qr=true`);
      } else {
        navigate('/customer-panel?guest=true');
      }
    }, 500);
  };

  const handleLegalLinkClick = (type) => setLegalModal({ isOpen: true, type });

  // Lead Form Handlers
  const openLeadModal = type => {
    setLeadType(type);
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      message: ''
    });
    setLeadModalOpen(true);
  };
  const handleLeadSubmit = async e => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email || !leadForm.message) {
      toast({
        title: "Hata",
        description: "Lütfen gerekli alanları doldurun.",
        variant: "destructive"
      });
      return;
    }
    setLeadLoading(true);
    try {
      const {
        error
      } = await supabase.from('vocalize_leads').insert({
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone || null,
        message: leadForm.message,
        lead_type: leadType,
        lead_score: 10,
        source: 'landing_page'
      });
      if (error) throw error;
      toast({
        title: "Teşekkür ederiz!",
        description: "Ekibimiz en kısa sürede sizinle iletişime geçecek."
      });
      setLeadModalOpen(false);
    } catch (error) {
      console.error('Lead submit error:', error);
      toast({
        title: "Hata",
        description: "Bir sorun oluştu, lütfen tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setLeadLoading(false);
    }
  };
  const navLinks = [{
    name: 'Neden Vocalize?',
    to: 'features'
  }, {
    name: 'Kimler Kullanıyor?',
    to: 'use-cases'
  }, {
    name: 'Fiyatlandırma',
    to: 'pricing'
  }, {
    name: 'V2/AI',
    to: 'v2-vision'
  }];
  const sectorImages = [{
    title: "Kafe & Restaurant",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/00b228896e74778d7ea795141629e88c.jpg"
  }, {
    title: "Fırın & Pastane",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/53daccc4abfaee03e6227fede51196a6.jpg"
  }, {
    title: "Otel",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/87aead0e55387b5abc28dc65079f2199.jpg"
  }, {
    title: "Güzellik Salonu",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/c9c49e56c6088a98bba2bc8a2aa3df13.jpg"
  }, {
    title: "Klinik",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/c2e5d7c59fbd4a9fc853622592803bce.jpg"
  }, {
    title: "Perakende",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/a9f46187ca33115417e8f48732c348c2.jpg"
  }, {
    title: "Zincir İşletme & Franchise",
    image: "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/4eda6a2273fab532bbdae6f6bcb9e384.jpg"
  }];
  return <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-x-hidden relative selection:bg-primary/30">
      <Helmet>
        <title>Vocalize - Müşteri Geri Bildirim Sistemi</title>
        <meta name="description" content="Kayıp müşterileri yakalayın, şikayetleri kazanca dönüştürün. Anlık bildirimlerle işletme itibarınızı garanti altına alın." />
      </Helmet>


      <StarBackground />


      <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent will-change-transform", scrolled ? "bg-[#0f172a]/90 backdrop-blur-md border-slate-800 shadow-sm" : "bg-transparent")}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer relative" onClick={scrollToTop}>
            <div className="w-12 h-12 flex items-center justify-center relative z-20">
               <img src="https://horizons-cdn.hostinger.com/b40913c4-5edd-44d9-8d18-8065daa4eea8/0a0619d3f364e3caf7bb54245ea8f02d.png" alt="Vocalize Logo" className="h-12 w-auto object-contain brightness-200 grayscale-0" />
            </div>
           
            <div className="relative h-10 w-[120px] overflow-hidden">
               <motion.span className="absolute left-0 top-0 h-full flex items-center font-bold text-xl tracking-tight whitespace-nowrap" initial={{
              x: 0,
              opacity: 1
            }} animate={{
              x: scrolled ? -40 : 0,
              opacity: scrolled ? 0 : 1
            }} transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1]
            }}>
                 VOCALIZE
               </motion.span>
            </div>
          </div>


          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => <ScrollLink key={link.name} to={link.to} spy={true} smooth={true} offset={-80} duration={500} className="text-sm font-medium text-slate-300 hover:text-white cursor-pointer transition-colors">
                {link.name}
              </ScrollLink>)}
          </nav>


          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-300">
            <button onClick={openLogin} className="hover:text-white transition-colors">
              Giriş Yap
            </button>
            <Button onClick={openInstallModal} className="bg-orange-500 hover:bg-orange-600 text-white border-none">
              Kurulum İçin Başvur
            </Button>
          </div>


          <button className="md:hidden p-2 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>


        <AnimatePresence>
          {isMenuOpen && <motion.div initial={{
          height: 0,
          opacity: 0
        }} animate={{
          height: 'auto',
          opacity: 1
        }} exit={{
          height: 0,
          opacity: 0
        }} className="md:hidden bg-[#0f172a] border-b border-slate-800 overflow-hidden">
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                {navLinks.map(link => <ScrollLink key={link.name} to={link.to} spy={true} smooth={true} offset={-80} duration={500} onClick={() => setIsMenuOpen(false)} className="text-lg font-medium py-2 border-b border-slate-800 text-slate-300">
                    {link.name}
                  </ScrollLink>)}
                <div className="flex flex-col gap-3 mt-4">
                  <Button variant="outline" className="w-full border-slate-600" onClick={() => {
                setIsMenuOpen(false);
                openLogin();
              }}>Giriş Yap</Button>
                  <Button className="w-full bg-orange-500 text-white" onClick={() => {
                setIsMenuOpen(false);
                openInstallModal();
              }}>Kurulum İçin Başvur</Button>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>
      </header>


      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <div className="absolute inset-0 bg-[#0f172a]/90 z-10"></div>
           <motion.img initial={{
          scale: 1.1
        }} animate={{
          scale: 1
        }} transition={{
          duration: 10,
          ease: "easeOut"
        }} src="https://horizons-cdn.hostinger.com/b40913c4-5edd-44d9-8d18-8065daa4eea8/abed37db8d2375a5e2a6643ba2cff8ec.png" alt="Background cafe interior" className="w-full h-full object-cover" />
        </div>
       
        <div className="container mx-auto px-4 relative z-20 text-center">
           <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.8
        }} className="max-w-6xl mx-auto px-4 w-full">
             <motion.div onClick={scrollToPricing} className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm cursor-pointer transition-colors hover:bg-orange-500/20 hover:border-orange-500/50" whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }} animate={{
            boxShadow: ["0 0 0 0px rgba(249, 115, 22, 0)", "0 0 0 4px rgba(249, 115, 22, 0.2)", "0 0 0 0px rgba(249, 115, 22, 0)"]
          }} transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}>
               <Zap className="w-4 h-4 fill-current" />
               İlk 20 işletme için özel fiyat!
             </motion.div>


             {/* Ana Başlık (H1) Güncellemesi */}
           <h1 className="text-[32px] sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.2] px-4 flex flex-col items-center md:block">
  <span className="block">Kayıp Müşterileri Yakalayın,</span>
  <span className="block mt-2 md:mt-4 text-center md:text-left">
    Şikayetleri <span className="text-orange-500 whitespace-nowrap">Kazanca Dönüştürün.</span>
  </span>
          </h1>
             
             <p className="text-base sm:text-lg md:text-xl text-slate-200 mb-12 max-w-4xl mx-auto font-medium leading-[1.6] px-6 opacity-90">
  <span className="block md:inline font-semibold text-white/90">Her müşteri geri bildirimi size anında ulaşsın;</span>
  <span className="block md:inline md:ml-1 mt-3 md:mt-0">Şikayetleri büyümeden çözüp, itibarınızı tek panelden yönetin.</span>
          </p>
             {/* Butonlar - Mobilde Kenarlık ve Kontrast Ayarı */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 w-full px-6 sm:px-0">
  <Button size="lg" className="h-14 px-8 w-full sm:w-auto bg-white hover:bg-slate-200 text-slate-900 font-bold text-base transition-colors" onClick={openInstallModal}>Kurulum İçin Başvur</Button>
  <Button variant="outline" size="lg" className="h-14 px-8 w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-slate-900 font-semibold text-base transition-colors" onClick={openManagerLogin}>Yönetici Girişi</Button>
          </div>


             {/* Mikro Mesajlar - Mobilde Margin (Boşluk) Eklenmiş Yapı */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-200 uppercase tracking-widest opacity-90">
  <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
    <Zap className="w-3.5 h-3.5 text-orange-400 fill-current" />
    <span>5 Dakikada Kurulum</span>
  </div>
  <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
    <span>İlk Aylık Ödeme 30 Gün Sonra</span>
  </div>
          </div>
           </motion.div>
        </div>
      </section>


      <section id="features" className="py-24 bg-[#0f172a] relative z-10">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Neden Vocalize?</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Vocalize, işletmelerin müşterilerini sadece duymalarını değil, anlamalarını sağlar. Her mesaj, bir veri değil; bir deneyimdir.
            </p>
          </FadeIn>


          <div className="grid md:grid-cols-3 gap-8">
            {[{
            icon: <Send className="w-6 h-6 text-teal-400" />,
            title: "Anında Müdahale",
            desc: "Şikayetleri müşteriniz kapıdan çıkmadan çözün, dijital itibarınızı proaktif olarak koruyun."
          }, {
            icon: <Lightbulb className="w-6 h-6 text-teal-400" />,
            title: "Şube Röntgeni",
            desc: "Tüm lokasyonlarınızı ve personel performansınızı tek panelden, anlık verilerle yönetin."
          }, {
            icon: <Heart className="w-6 h-6 text-teal-400" />,
            title: "Sıfır Sürtünme",
            desc: "Uygulama indirme zorunluluğu yok. QR okutmak yeterli; geleneksel anketlere göre 12 kat daha fazla katılım."
          }].map((feature, idx) => <motion.div key={idx} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            margin: "-50px"
          }} transition={{
            delay: idx * 0.2,
            duration: 0.5
          }} className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center mb-6 border border-slate-700">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </motion.div>)}
          </div>
        </div>
      </section>


      <section id="use-cases" className="py-24 bg-[#111827] relative z-10">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">İşletmenize Özel Çözümler</h2>
            <p className="text-slate-400">Sektörünüz ne olursa olsun, müşteri sesini Vocalize ile büyüme stratejisine dönüştürün.</p>
          </FadeIn>
         
          <div className="flex flex-wrap justify-center gap-4">
            {sectorImages.map((sector, idx) => <motion.div key={idx} initial={{
            opacity: 0,
            scale: 0.9
          }} whileInView={{
            opacity: 1,
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: idx * 0.05
          }} className="relative w-[160px] h-[200px] rounded-xl overflow-hidden group cursor-pointer" onClick={() => openLeadModal('info_request')}>
                <img src={sector.image} alt={sector.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent">
                   <div className="absolute bottom-4 left-4">
                     <h3 className="text-white font-bold text-sm">{sector.title}</h3>
                   </div>
                </div>
              </motion.div>)}
          </div>
        </div>
      </section>


      <section className="py-24 bg-[#0f172a] text-white overflow-hidden relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <FadeIn className="relative flex flex-col items-center justify-center">
              <div className="bg-[#0B4F56] p-1 rounded-[2rem] shadow-2xl rotate-[-2deg] transform hover:rotate-0 transition-transform duration-500">
                 <div className="bg-white text-black p-8 rounded-[1.8rem] w-[300px] h-[420px] flex flex-col items-center justify-between relative overflow-hidden">
                    <div className="z-10 flex flex-col items-center mt-2">
                      <img src="https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/vocalize_logo.main.png-UX6ij.png" alt="Logo" className="w-16 h-16 mb-2" />
                      <h3 className="font-bold text-3xl tracking-tight">Vocalize</h3>
                    </div>
                   
                    <div className="z-10 w-48 h-48 bg-black rounded-lg p-2 flex items-center justify-center">
                       <QrCode className="w-full h-full text-white" />
                    </div>


                    <div className="z-10 text-center mb-2">
                      <p className="font-bold text-lg">Görüşlerinizi bizimle paylaşın</p>
                    </div>
                   
                    <div className="absolute top-0 left-0 w-full h-32 bg-teal-50 rounded-b-[50%] -z-0" />
                 </div>
              </div>
              <div className="mt-6 text-center text-teal-100/80 text-sm font-medium">
                 Afiş Tasarım Süreci Bize, Baskı İşletmenize Aittir.
              </div>
            </FadeIn>


            <FadeIn delay={0.2} className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">
                Her İşletmeye Özel QR <br /> Afiş Tasarımı
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                QR afişleriniz markanıza ve mekânınıza özel renklendirilebilir.
              </p>
              <p className="text-slate-500 text-sm">
                Renk, yazı veya dil düzenlemeleri işletmenize göre uyarlanır.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>


      <section id="pricing" className="py-12 bg-[#102a30] relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-4">
            <FadeIn>
              <span className="inline-block py-1 px-3 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold tracking-wider mb-2 uppercase border border-yellow-500/20">
                <Zap className="w-3 h-3 inline mr-1" /> Özel Kampanya
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 text-white">
                <span className="text-orange-400">İLK 20 İŞLETME:</span> ÖMÜR BOYU %20 İNDİRİM FIRSATI
              </h2>
              <p className="text-slate-300 text-base mb-4">Erken katılanlar için sınırlı sayıda indirimli fırsat!</p>
            </FadeIn>
           
            <FadeIn delay={0.1} className="mb-6 max-w-md mx-auto">
               <div className="text-center mb-1">
                 <span className="text-3xl font-bold text-white">16</span><span className="text-slate-400 text-lg">/20</span>
               </div>
               <div className="text-xs text-slate-400 mb-3">işletme katıldı!</div>
               <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-2" ref={progressRef}>
                <motion.div initial={{
                width: "0%"
              }} animate={progressInView ? {
                width: "80%"
              } : {
                width: "0%"
              }} transition={{
                duration: 1.5,
                ease: "circOut"
              }} className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full" />
              </div>
              <div className="flex items-center justify-center gap-2 text-orange-400 text-xs font-medium">
                 <Timer className="w-3.5 h-3.5" /> Son 4 kontenjan kaldı!
              </div>
            </FadeIn>


            <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto items-stretch justify-center">
               {/* Market Card - Order switched: Mobile Bottom (order-2), Desktop Left (order-1) */}
               <div className="order-2 md:order-1 w-full md:w-[45%] bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-center opacity-80 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                  <h3 className="text-slate-400 text-base font-bold mb-1">Piyasa Değeri</h3>
                  <div className="text-xl font-bold text-slate-300 line-through mb-1">$299 Kurulum</div>
                  <div className="text-lg text-slate-400 line-through">$99/ay</div>
               </div>
               
               {/* Campaign Card - Order switched: Mobile Top (order-1), Desktop Right (order-2) */}
               <div className="order-1 md:order-2 w-full md:w-[55%] bg-white text-slate-900 rounded-xl p-6 shadow-2xl relative overflow-hidden transform scale-100 md:scale-105 border-4 border-orange-500/20">
                  <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">ÖZEL</div>
                  <h3 className="text-orange-600 text-base font-bold uppercase mb-2 flex items-center justify-center gap-1">
                     <Zap className="w-4 h-4 fill-current" /> Kampanya Fiyatı
                  </h3>
                  <div className="text-3xl font-extrabold mb-1 text-slate-900">$249 Kurulum</div>
                  <div className="text-2xl font-bold text-slate-700 mb-2">$79/ay</div>
                  <div className="text-xs font-medium text-slate-500 bg-slate-100 py-1 px-2 rounded-full inline-block">
                    İlk aylık ödeme kurulumdan 30 gün sonra alınır.
                  </div>
               </div>
            </div>
            
            <div className="text-orange-300 text-[10px] mt-3 font-medium opacity-80">
              * Bu fiyat sadece sınırlı kontenjan için geçerlidir.
            </div>


            <div className="mt-6 bg-slate-800/50 rounded-xl p-6 max-w-lg mx-auto border border-slate-700">
               <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2 text-sm">
                  <Zap className="w-3.5 h-3.5" /> Kampanya Avantajları:
               </h4>
               <ul className="space-y-2 text-left text-xs sm:text-sm text-slate-300">
                 {["Ömür Boyu %20 İndirim Garantisi", "Taahhüt Yok, Dilediğiniz Zaman İptal", "V2 Sürümüne Erken Erişim Hakkı", "Özel QR Afiş Tasarımı Dahil"].map((item, i) => <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {item}
                   </li>)}
               </ul>
               <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                 <span className="text-xs sm:text-sm text-slate-200 font-medium">İlk 14 Gün Para İade Garantisi</span>
               </div>
            </div>


            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Button className="bg-white text-slate-900 hover:bg-slate-200 font-bold h-11 px-6 text-sm transition-colors" onClick={openInstallModal}>
                 <Zap className="w-4 h-4 mr-2 text-orange-600 fill-current" /> Avantajlı Kontenjanı Ayır
              </Button>
              <Button variant="outline" className="text-white border-slate-500 hover:bg-slate-800 h-11 px-6 text-sm transition-colors" onClick={() => openLeadModal('info_request')}>
                 Bilgi Al
              </Button>
            </div>
           
            <div className="mt-3 text-[10px] text-slate-500 cursor-pointer hover:underline" onClick={() => openLeadModal('quick_question')}>
               Sorularınız mı var? Bize ulaşın
            </div>
            
            <div className="mt-8 text-xs text-slate-400 font-medium">
               Farklı işletme profilleri için uyarlanabilir plan seçenekleri sunuyoruz.
            </div>

          </div>
        </div>
      </section>


      <section id="impact" className="py-24 bg-[#0f172a] text-center relative z-10">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }}>
            <h2 className="text-3xl font-bold mb-4 text-white">Geri Bildirim Değil, İşletme Zekası.</h2>
            <p className="text-slate-400 mb-16 max-w-2xl mx-auto">
              Vocalize, sadece geri bildirim toplamaz; işletmenizde ölçülebilir potansiyel etkinin bir parçasıdır.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1 */}
            <motion.div initial={{
            opacity: 0,
            y: 50
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            delay: 0.1,
            duration: 0.5
          }} className="p-8 rounded-xl bg-[#1a2235] border border-slate-800 hover:border-teal-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Daha Fazla Geri Bildirim</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Müşterilerin geri bildirim iletme oranında belirgin artış sağlar ve anlık veri akışı oluşturur.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div initial={{
            opacity: 0,
            y: 50
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            delay: 0.3,
            duration: 0.5
          }} className="p-8 rounded-xl bg-[#1a2235] border border-slate-800 hover:border-teal-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500/20 transition-colors">
                <Target className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Daha Yüksek Kazanım Oranı</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Olumsuz deneyimler online platformlara taşınmadan yerinde çözülür, bu sayede müşteri kayıpları azalır.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div initial={{
            opacity: 0,
            y: 50
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            delay: 0.5,
            duration: 0.5
          }} className="p-8 rounded-xl bg-[#1a2235] border border-slate-800 hover:border-teal-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500/20 transition-colors">
                <RefreshCw className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Operasyonel Verimlilik</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Şube performansı, ekip yanıt hızları ve müşteri memnuniyeti tek panelden yönetilir ve analiz edilir.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PREMIUM V2 AI VISION - BUSINESS & INVESTMENT FOCUSED */}
      <section id="v2-vision" className="py-20 md:py-28 bg-gradient-to-br from-[#0f172a] via-slate-900/50 to-[#0f172a] relative overflow-hidden z-10 border-t border-slate-800">

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto px-4 relative z-10 flex flex-col items-center justify-center text-center max-w-5xl w-full"
        >
          
          {/* Large V2 AI Visual Header with Focused Radial Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05 }}
            animate={{
              opacity: [0.9, 1, 0.9],
              scale: [1, 1.03, 1]
            }}
            whileInViewTransition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8 relative w-full flex justify-center"
          >
            {/* Centered Radial Glow - Professional & Focused */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                animate={{
                  opacity: [0.4, 0.6, 0.4],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  width: '300px',
                  height: '200px',
                  background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.25) 0%, rgba(34,211,238,0.15) 30%, transparent 80%)',
                  filter: 'blur(40px)',
                  position: 'absolute'
                }}
              ></motion.div>
            </div>
            
            {/* V2 AI Text - With Breathing Animation */}
            <motion.h2 
              animate={{
                opacity: [0.95, 1, 0.95],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 relative z-10"
            >
              V2 AI
            </motion.h2>
          </motion.div>
          
          {/* Badge: "Geliştirme Sürecinde" - Small & Elegant */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 mb-6 backdrop-blur-sm"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Geliştirme Sürecinde</span>
          </motion.div>

          {/* Main Heading: Premium Investment Language */}
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-tight"
          >
            İşletmenizin Gelecekteki <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Akıllı Ortağı</span>
          </motion.h3>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl leading-relaxed font-light"
          >
            Vocalize V2 geldiğinde, verilerinizi sadece raporlamayan, onları <span className="font-semibold text-white">kârlı kararlara dönüştüren</span> akıllı asistan teknolojisine sahip olacaksınız.
          </motion.p>

          {/* Key Benefit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
            
            {/* Card 1: Akıllı Yönetici Özeti */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-teal-500/40 transition-all duration-300 hover:bg-white/8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-5 group-hover:border-teal-500/60 transition-colors">
                  <BrainCircuit className="w-7 h-7 text-teal-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3 text-left">Akıllı Yönetici Özeti</h4>
                <p className="text-slate-400 text-sm leading-relaxed text-left">
                  Yüzlerce yorumu okumadan, yapay zeka size haftalık performans ve şikayet özetini tek paragrafta sunsun. Karar almak hiç bu kadar basit olmamıştı.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Kriz Kalkanı */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-teal-500/40 transition-all duration-300 hover:bg-white/8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-5 group-hover:border-teal-500/60 transition-colors">
                  <AlertTriangle className="w-7 h-7 text-teal-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3 text-left">Kriz Kalkanı</h4>
                <p className="text-slate-400 text-sm leading-relaxed text-left">
                  İşletmenizde negatif yorum oranı arttığında sistem sizi anında uyarır. Sorun büyümeden müdahale edersiniz, itibarınız korunur.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Müşteri İçgörüsü */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-teal-500/40 transition-all duration-300 hover:bg-white/8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-5 group-hover:border-teal-500/60 transition-colors">
                  <Lightbulb className="w-7 h-7 text-teal-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3 text-left">Müşteri İçgörüsü</h4>
                <p className="text-slate-400 text-sm leading-relaxed text-left">
                  Müşterilerinizin gizli isteklerini ve beklentilerini yapay zeka ile analiz ederek hizmet kalitenizi veriye dayalı olarak artırın.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Investment Opportunity Box - Premium CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="w-full max-w-2xl mx-auto backdrop-blur-lg bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-blue-500/10 border border-teal-500/30 rounded-2xl p-8 shadow-lg"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-teal-500/20 border border-teal-500/40">
                  <Sparkles className="h-6 w-6 text-teal-400" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white mb-3">Sınırlı Zaman Yatırım Fırsatı</h4>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-4">
                  <span className="font-bold text-teal-400">İlk 20 İşletme,</span> gelecekte V2 yayınlandığında <span className="font-bold text-teal-400">öncelikli geçiş hakkına</span> sahip olur.
                </p>
                <p className="text-slate-400 text-xs mt-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-300">Erken Erişim Avantajı:</span> Sıra beklemeden V2 teknolojisine geçiş</span>
                </p>
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span><span className="font-semibold text-slate-300">%20 İndirim Garantisi:</span> V2 paket fiyatları artsa bile, sizin %20 indirim hakkınız baki kalır</span>
                </p>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </section>


      <footer className="bg-[#0f172a] py-8 border-t border-slate-800 relative z-10 text-center">
        <div className="container mx-auto px-4">
           <p className="text-slate-500 text-xs mb-4">
             © 2025 Vocalize Systems — Müşteri sesini teknolojiyle buluşturuyoruz.
           </p>

           <div className="mb-4">
              <span className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2" onClick={() => handleLegalLinkClick('kvkk')}>
                KVKK Aydınlatma Metni
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2" onClick={() => handleLegalLinkClick('terms')}>
                Kullanım Koşulları
              </span>
           </div>

           <div className="flex justify-center gap-4">
              <div className="w-6 h-6 text-slate-600 hover:text-white cursor-pointer flex items-center justify-center">
                <img src="https://horizons-cdn.hostinger.com/b40913c4-5edd-44d9-8d18-8065daa4eea8/0a0619d3f364e3caf7bb54245ea8f02d.png" alt="Vocalize Logo Footer" className="h-full w-full object-contain brightness-200 grayscale-0" />
              </div>
              <div className="w-4 h-4 text-slate-600 hover:text-white cursor-pointer"><span className="sr-only">LinkedIn</span>in</div>
              <div className="w-4 h-4 text-slate-600 hover:text-white cursor-pointer"><span className="sr-only">Instagram</span>ig</div>
           </div>
        </div>
      </footer>
     
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultTab={authDefaultTab} defaultRole={authDefaultRole} showGuestOption={true} onGuestContinue={handleGuestContinue} />
      
      {/* New Installation Modal added here before Toaster */}
      <InstallationRequestModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />

      <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {leadType === 'info_request' ? 'Bilgi Alın' : 'Bize Ulaşın'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Aşağıdaki formu doldurun, ekibimiz sizinle iletişime geçsin.
            </DialogDescription>
          </DialogHeader>
         
          {leadType === 'info_request' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
              {quickOptions.map((option, idx) => <button key={idx} type="button" onClick={() => handleQuickOption(option)} className="text-xs text-left p-2 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-2">{option}</span>
                </button>)}
            </div>}


          <form onSubmit={handleLeadSubmit} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-200">Ad Soyad *</label>
              <Input id="name" placeholder="John Doe" value={leadForm.name} onChange={e => setLeadForm({
              ...leadForm,
              name: e.target.value
            })} className="bg-slate-800 border-slate-700 text-white" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">E-posta *</label>
              <Input id="email" type="email" placeholder="ornek@sirket.com" value={leadForm.email} onChange={e => setLeadForm({
              ...leadForm,
              email: e.target.value
            })} className="bg-slate-800 border-slate-700 text-white" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-200">Telefon (İsteğe bağlı)</label>
              <Input id="phone" type="tel" placeholder="+90 555 ..." value={leadForm.phone} onChange={e => setLeadForm({
              ...leadForm,
              phone: e.target.value
            })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="message" className="text-sm font-medium text-slate-200">Mesajınız *</label>
              <textarea id="message" rows="4" placeholder="Sorunuzu buraya yazın..." value={leadForm.message} onChange={e => setLeadForm({
              ...leadForm,
              message: e.target.value
            })} className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" required />
            </div>
            <DialogFooter className="mt-2">
              <Button type="submit" disabled={leadLoading} className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                {leadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gönder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={legalModal.isOpen} onOpenChange={open => setLegalModal(prev => ({
      ...prev,
      isOpen: open
    }))}>
        <DialogContent className="bg-[#0f172a] border-slate-700 text-white sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>{legalModal.type === 'terms' ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni'}</DialogTitle>
           </DialogHeader>
           <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify">
              {legalModal.type === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setLegalModal({
            ...legalModal,
            isOpen: false
          })} className="border-slate-600 hover:bg-slate-800 text-white hover:text-white">Kapat</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>;
};
export default LandingPage;