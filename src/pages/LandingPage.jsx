import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link as ScrollLink, animateScroll as scroll, scroller } from 'react-scroll';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Menu, X, Zap, CheckCircle2, Timer, Send, Lightbulb, Heart, QrCode, Loader2, 
  ArrowRight, TrendingUp, Target, RefreshCw, Cpu, BrainCircuit, Activity, Sparkles, 
  MessageSquare as MessageSquareText, Info, AlertTriangle, Layers, Zap as ZapIcon, Network,
  Instagram,
  Mail,
  Building2, Coffee, ShoppingBag, Utensils, Hotel, GraduationCap, Hospital, ShieldCheck, BarChart,
  Globe, LayoutGrid, Users, Rocket, Calendar
} from 'lucide-react';
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

const DecorativeGrid = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
    <div className="absolute inset-0" style={{
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(249, 115, 22, 0.15) 1px, transparent 0)`,
      backgroundSize: '40px 40px'
    }}></div>
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-orange-500/20 to-transparent"></div>
    <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-orange-500/20 to-transparent"></div>
  </div>
);

const Blob = ({ className, color = "bg-orange-500" }) => (
  <div className={cn("absolute rounded-full blur-[120px] opacity-20 animate-pulse", color, className)}></div>
);

const FadeIn = ({
  children,
  delay = 0,
  className,
  direction = "up"
}) => {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 }
  };

  return <motion.div
    initial={{ opacity: 0, ...directions[direction] }}
    whileInView={{ opacity: 1, x: 0, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>;
};

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authDefaultRole, setAuthDefaultRole] = useState('customer');
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '' });
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadType, setLeadType] = useState('info_request');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', message: '' });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isInitializing, setIsInitializing] = useState(true);
  
  const quickOptions = ["Kurumsal çözüm teklifi almak istiyorum", "Demo toplantısı planlamak istiyorum", "Sistem entegrasyonu hakkında bilgi", "Ölçeklenebilir paket detayları"];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 800);
    return () => clearTimeout(checkTimer);
  }, []);

  useEffect(() => {
    const openAuth = searchParams.get('openAuth');
    if (openAuth === 'true') {
      setAuthDefaultTab('register');
      setAuthDefaultRole('customer');
      setIsAuthModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openAuth');
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const scrollToTop = () => scroll.scrollToTop();
  const openLogin = () => { setAuthDefaultTab('login'); setAuthDefaultRole('customer'); setIsAuthModalOpen(true); };
  const openManagerLogin = () => { setAuthDefaultTab('login'); setAuthDefaultRole('manager'); setIsAuthModalOpen(true); };
  const openInstallModal = () => setInstallModalOpen(true);
  const openLeadModal = type => {
    setLeadType(type);
    setLeadForm({ name: '', email: '', phone: '', message: '' });
    setLeadModalOpen(true);
  };

  const handleGuestContinue = () => {
    setIsAuthModalOpen(false);
    toast({ title: "Misafir Modu", description: "Geri bildirim göndermek için işletme seçin." });
    setTimeout(() => { navigate('/customer-panel?guest=true'); }, 500);
  };

  const handleLeadSubmit = async e => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email || !leadForm.message) {
      toast({ title: "Hata", description: "Lütfen gerekli alanları doldurun.", variant: "destructive" });
      return;
    }
    setLeadLoading(true);
    try {
      const { error } = await supabase.from('vocalize_leads').insert({
        name: leadForm.name, email: leadForm.email, phone: leadForm.phone || null,
        message: leadForm.message, lead_type: leadType, lead_score: 10, source: 'landing_page'
      });
      if (error) throw error;
      toast({ title: "Talebiniz Alındı", description: "Ekibimiz 24 saat içerisinde sizinle iletişime geçecektir." });
      setLeadModalOpen(false);
    } catch (error) {
      toast({ title: "Hata", description: "Bir sorun oluştu, lütfen tekrar deneyin.", variant: "destructive" });
    } finally { setLeadLoading(false); }
  };

  const handleLegalLinkClick = (type) => {
    setLegalModal({ isOpen: true, type });
  };

  const navLinks = [
    { name: 'Çözümler', to: 'features' },
    { name: 'Nasıl Çalışır?', to: 'how-it-works' },
    { name: 'Sektörler', to: 'use-cases' },
    { name: 'Yapay Zeka', to: 'v2-vision' }
  ];

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">Vocalize Enterprise</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden relative selection:bg-orange-500/30">
      <Helmet>
        <title>Vocalize Enterprise | Kurumsal Müşteri Deneyimi Platformu</title>
      </Helmet>

      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent",
        scrolled ? "bg-slate-950/80 backdrop-blur-xl border-slate-800/50 py-3" : "bg-transparent py-6"
      )}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={scrollToTop}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
               <img src="faviconbeyaz.png" alt="V" className="h-6 w-auto brightness-200" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-white">VOCALIZE</span>
          </div>

          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map(link => (
              <ScrollLink key={link.name} to={link.to} spy={true} smooth={true} offset={-100} duration={500} className="text-sm font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors tracking-wide">
                {link.name}
              </ScrollLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            <button onClick={openManagerLogin} className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Yönetici Girişi</button>
            <Button onClick={() => openLeadModal('info_request')} className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-5 rounded-full shadow-xl shadow-orange-500/20 transition-all hover:translate-y-[-2px] border-none">
              Demo Talebi
            </Button>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
        <DecorativeGrid />
        <Blob className="top-[-10%] right-[-5%] w-[500px] h-[500px]" />
        <Blob className="bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-yellow-500" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <FadeIn direction="up">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8">
                <Rocket className="w-4 h-4" /> B2B Müşteri Deneyimi Dönüşümü
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] mb-8 tracking-tight">
                Müşteri Sesini <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500">
                  Stratejik Veriye
                </span> Dönüştürün.
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl font-medium leading-relaxed">
                Vocalize, ölçeklenebilir altyapısı ve yapay zeka destekli analitiği ile işletmenizin dijital itibarını ve müşteri sadakatini tek merkezden yönetir.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Button size="lg" className="h-16 px-10 w-full sm:w-auto bg-white text-slate-950 hover:bg-orange-500 hover:text-white font-black text-lg rounded-full transition-all border-none" onClick={() => openLeadModal('info_request')}>
                  Kurumsal Çözüm Alın
                </Button>
                <div className="flex items-center gap-4 group cursor-pointer" onClick={openManagerLogin}>
                  <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                    <BarChart className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="font-bold text-slate-300 group-hover:text-white transition-colors">Dashboard'u Keşfedin</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-20 border-y border-slate-900 bg-slate-950/50">
        <div className="container mx-auto px-6">
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-12 text-center">Global Standartlarda Güvenilir Çözümler</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 items-center opacity-40 grayscale">
             <div className="flex flex-col items-center gap-3 text-white"><Hotel className="w-10 h-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Konaklama</span></div>
             <div className="flex flex-col items-center gap-3 text-white"><Utensils className="w-10 h-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Gastronomi</span></div>
             <div className="flex flex-col items-center gap-3 text-white"><ShoppingBag className="w-10 h-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Perakende</span></div>
             <div className="flex flex-col items-center gap-3 text-white"><Building2 className="w-10 h-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Kurumsal</span></div>
             <div className="flex flex-col items-center gap-3 text-white"><Hospital className="w-10 h-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Sağlık</span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 bg-slate-950 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-end mb-24">
            <div className="lg:w-1/2">
              <FadeIn direction="left">
                <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter italic uppercase">01. Operasyonel Mükemmellik</h2>
                <p className="text-xl text-slate-400 leading-relaxed font-medium">
                  Karmaşık süreçleri basitleştiriyoruz. Müşteri geri bildirimi toplama ve analiz sürecini tamamen otomatikleştirerek operasyonel yükünüzü azaltıyoruz.
                </p>
              </FadeIn>
            </div>
            <div className="lg:w-1/2 flex justify-end">
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-12 bg-orange-500/20 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ height: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-full bg-orange-500"
                  />
                </div>)}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-12">
            {[
              { icon: <QrCode className="w-8 h-8 text-orange-400" />, title: "Stratejik Konumlandırma", desc: "İşletmeniz her temas noktasında kesintisiz veri toplama altyapısı." },
              { icon: <Globe className="w-8 h-8 text-orange-400" />, title: "Anlık Reaksiyon", desc: "Geri bildirimleri saniyeler içinde analiz eden ve bildiren akıllı engine." },
              { icon: <BrainCircuit className="w-8 h-8 text-orange-400" />, title: "AI Destekli Analiz", desc: "Büyük veriyi anlamlı içgörülere ve aksiyon planlarına dönüştürme." },
              { icon: <TrendingUp className="w-8 h-8 text-orange-400" />, title: "Sürdürülebilir Büyüme", desc: "Müşteri sadakatini artıran ve kâr marjlarını yükselten optimizasyon." }
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} className="relative group">
                <div className="p-10 rounded-[40px] bg-slate-900/40 border border-slate-800 hover:border-orange-500/50 transition-all duration-500 hover:translate-y-[-10px]">
                  <div className="mb-8 w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-32 bg-slate-900/20 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <FadeIn>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Enterprise Çözüm Seti</h2>
              <p className="text-slate-400 text-xl max-w-3xl mx-auto font-medium">
                Sadece bir yazılım değil; büyüme odaklı bir ekosistem. Vocalize, her ölçekteki B2B ihtiyacına yanıt verecek şekilde tasarlanmıştır.
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-12 gap-6 auto-rows-[240px]">
            <div className="md:col-span-8 p-10 rounded-[3rem] bg-gradient-to-br from-orange-500/20 to-yellow-500/5 border border-white/5 relative overflow-hidden group">
               <div className="relative z-10 h-full flex flex-col justify-between">
                 <div>
                   <h3 className="text-3xl font-black text-white mb-4">Multi-Lokasyon Yönetimi</h3>
                   <p className="text-slate-400 max-w-md text-lg">Yüzlerce şubeyi tek bir kontrol merkezinden hiyerarşik olarak yönetin.</p>
                 </div>
                 <div className="flex gap-4">
                    <Button variant="outline" className="rounded-full border-white/10 text-white hover:bg-orange-500 hover:border-orange-500">Detayları Gör</Button>
                 </div>
               </div>
               <LayoutGrid className="absolute bottom-[-10%] right-[-5%] w-64 h-64 text-orange-500/10 group-hover:rotate-12 transition-transform duration-1000" />
            </div>

            <div className="md:col-span-4 p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col justify-between group">
               <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-orange-400">
                  <ShieldCheck size={32} />
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-white mb-2">Kurumsal Güvenlik</h3>
                 <p className="text-slate-400 text-sm">KVKK uyumlu, 256-bit şifreleme ve gelişmiş rol yetkilendirme.</p>
               </div>
            </div>

            <div className="md:col-span-4 p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col justify-between group">
               <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-orange-400">
                  <ZapIcon size={32} />
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-white mb-2">Anlık Bildirimler</h3>
                 <p className="text-slate-400 text-sm">Kritik şikayetlerde ilgili departmana anında kriz bildirimi.</p>
               </div>
            </div>

            <div className="md:col-span-8 p-10 rounded-[3rem] bg-gradient-to-r from-slate-900 to-slate-800 border border-white/5 relative overflow-hidden group">
               <div className="relative z-10 flex flex-col justify-center h-full">
                  <h3 className="text-3xl font-black text-white mb-4">Müşteri Sadakati (NPS) 2.0</h3>
                  <p className="text-slate-400 max-w-lg text-lg">Geleneksel anketleri unutun. Yapay zeka ile derinlemesine duygu analizi ve gerçek NPS skorları.</p>
               </div>
               <Activity className="absolute right-10 top-1/2 -translate-y-1/2 w-48 h-48 text-orange-500/5" />
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard-preview" className="py-32 bg-slate-950">
        <div className="container mx-auto px-6">
           <div className="bg-slate-900/50 rounded-[4rem] p-12 md:p-20 border border-slate-800 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <FadeIn direction="left">
                   <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">Karar Mekanizmanızı <span className="text-orange-400">Güçlendirin</span>.</h2>
                   <p className="text-slate-400 text-xl leading-relaxed mb-10 font-medium">
                     Dashboard'umuz sadece veriyi göstermez, aksiyon alınabilir içgörüler sunar. Hangi şubenizde, hangi saatte, hangi personelde sorun olduğunu anında görün.
                   </p>
                   <div className="space-y-6">
                      {[
                        "Gerçek zamanlı şube karşılaştırmaları",
                        "Personel bazlı memnuniyet metrikleri",
                        "Yapay zeka tarafından hazırlanan kriz raporları"
                      ].map(t => (
                        <div key={t} className="flex items-center gap-4 text-white font-bold">
                          <CheckCircle2 className="text-orange-400" />
                          <span>{t}</span>
                        </div>
                      ))}
                   </div>
                </FadeIn>

                <FadeIn direction="right" className="relative">
                  <div className="bg-slate-950 rounded-3xl p-4 shadow-3xl border border-orange-500/20">
                     <div className="h-64 bg-slate-900 rounded-2xl flex items-end justify-around p-6 gap-2">
                        {[60, 40, 90, 70, 50, 80, 100].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            className="w-full bg-orange-500/20 border-t-2 border-orange-500 rounded-t-lg"
                          />
                        ))}
                     </div>
                     <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                        <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                        <div className="h-12 bg-slate-900 rounded-xl border border-slate-800"></div>
                     </div>
                  </div>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500 blur-3xl opacity-20"></div>
                </FadeIn>
              </div>
           </div>
        </div>
      </section>

      <section id="pricing" className="py-32 bg-orange-500 relative z-10">
        <div className="container mx-auto px-6 text-slate-950">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn>
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter uppercase italic text-slate-950">İşletmenize Özel Kurumsal Çözümler</h2>
              <p className="text-xl md:text-2xl font-bold mb-12 opacity-80 leading-relaxed">
                Vocalize Enterprise, şube sayınızdan çalışan kapasitenize kadar tamamen size özel yapılandırılır. Teklif almak ve demo toplantısı planlamak için hemen başvurun.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                 <div className="bg-slate-950/10 backdrop-blur-sm border border-slate-950/20 p-8 rounded-[2rem] text-left">
                    <Users className="w-10 h-10 mb-4" />
                    <h3 className="text-2xl font-black mb-2 tracking-tight">Kişiye Özel Planlama</h3>
                    <p className="font-bold opacity-70">İhtiyacınız olmayan özellikler için ödeme yapmayın, tam kapsamlı verimlilik alın.</p>
                 </div>
                 <div className="bg-slate-950/10 backdrop-blur-sm border border-slate-950/20 p-8 rounded-[2rem] text-left">
                    <Calendar className="w-10 h-10 mb-4" />
                    <h3 className="text-2xl font-black mb-2 tracking-tight">24 Saat İçinde Teklif</h3>
                    <p className="font-bold opacity-70">Talebinizden sonraki ilk iş gününde uzman ekibimiz size özel stratejiyi sunar.</p>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" className="h-20 px-12 bg-slate-950 text-white hover:bg-slate-900 font-black text-2xl rounded-full w-full sm:w-auto shadow-2xl border-none" onClick={() => openLeadModal('info_request')}>
                  Hemen Başvurun
                </Button>
                <span className="text-lg font-bold opacity-60">veya support@vocalize.global üzerinden ulaşın</span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section id="v2-vision" className="py-40 bg-slate-950 relative overflow-hidden">
        <Blob className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500 opacity-10" />
        <div className="container mx-auto px-6 text-center relative z-10">
           <FadeIn>
              <span className="text-orange-400 font-black tracking-[0.5em] uppercase mb-8 block">Future Vision</span>
              <h2 className="text-7xl md:text-9xl font-black text-white mb-12 tracking-tighter">AI ENGINE V2</h2>
              <p className="text-2xl text-slate-400 max-w-4xl mx-auto font-medium leading-relaxed mb-20">
                Veriyi sadece okumuyoruz, tahmin ediyoruz. Gelecek nesil yapay zeka motorumuz ile krizleri oluşmadan engelleyen proaktif yönetim modeline geçiyoruz.
              </p>
              
              <div className="grid md:grid-cols-3 gap-12 text-left">
                 {[
                   { title: "Prediktif Analiz", desc: "Müşteri kaybı yaşanmadan önce davranış paternlerinden tehlikeyi fark eder." },
                   { title: "Otomatik Yanıt", desc: "Marka dilinize uygun yapay zeka destekli anlık müşteri yanıt asistanı." },
                   { title: "Derin Duygu Analizi", desc: "Sadece kelimeleri değil, satır aralarındaki gerçek memnuniyet düzeyini ölçer." }
                 ].map(v => (
                   <div key={v.title} className="p-8 border-l-2 border-orange-500/30 hover:border-orange-500 transition-colors">
                      <h4 className="text-2xl font-bold text-white mb-4">{v.title}</h4>
                      <p className="text-slate-400 font-medium leading-relaxed">{v.desc}</p>
                   </div>
                 ))}
              </div>
           </FadeIn>
        </div>
      </section>

      <footer className="bg-slate-950 py-20 border-t border-slate-900">
        <div className="container mx-auto px-6">
           <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <img src="faviconmain.png" alt="V" className="h-8 w-auto" />
                </div>
                <span className="text-2xl font-black tracking-tighter">VOCALIZE</span>
              </div>
              <div className="flex gap-10">
                 <Instagram className="cursor-pointer hover:text-orange-400 transition-colors" />
                 <Mail className="cursor-pointer hover:text-orange-400 transition-colors" />
              </div>
           </div>

           <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-slate-900 gap-6">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">© 2025 Vocalize Enterprise Systems. All Rights Reserved.</p>
              <div className="flex gap-8">
                 <span className="text-xs font-bold text-slate-500 hover:text-white cursor-pointer transition-colors uppercase tracking-widest" onClick={() => handleLegalLinkClick('kvkk')}>KVKK</span>
                 <span className="text-xs font-bold text-slate-500 hover:text-white cursor-pointer transition-colors uppercase tracking-widest" onClick={() => handleLegalLinkClick('terms')}>Kullanım Koşulları</span>
              </div>
           </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        defaultRole={authDefaultRole}
        showGuestOption={true}
        onGuestContinue={handleGuestContinue}
      />
      <InstallationRequestModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />

      <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight text-white">Kurumsal Başvuru</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium pt-2">
              İşletmeniz için en doğru çözümü birlikte kurgulayalım. Uzman ekibimiz size ulaşacaktır.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 my-4">
            {quickOptions.map((option, idx) => (
              <button key={idx} type="button" onClick={() => setLeadForm({...leadForm, message: option})} className="text-xs text-left p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-orange-500/10 hover:border-orange-500/30 text-slate-400 hover:text-orange-400 transition-all">
                {option}
              </button>
            ))}
          </div>

          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <Input placeholder="Ad Soyad" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} className="h-14 rounded-xl bg-slate-900 border-slate-800 focus:ring-orange-500" required />
            <Input placeholder="Kurumsal E-posta" type="email" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} className="h-14 rounded-xl bg-slate-900 border-slate-800" required />
            <Input placeholder="Telefon" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} className="h-14 rounded-xl bg-slate-900 border-slate-800" />
            <textarea placeholder="Mesajınız" rows="4" value={leadForm.message} onChange={e => setLeadForm({...leadForm, message: e.target.value})} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm focus:ring-orange-500 resize-none" required />
            <Button type="submit" disabled={leadLoading} className="w-full h-16 bg-orange-500 hover:bg-orange-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-orange-500/20 border-none">
              {leadLoading ? <Loader2 className="animate-spin" /> : 'Gönder'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={legalModal.isOpen} onOpenChange={open => setLegalModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-[700px] rounded-[3rem]">
           <DialogHeader>
             <DialogTitle className="text-2xl font-black">{legalModal.type === 'terms' ? 'Kullanım Koşulları' : 'KVKK Aydınlatma Metni'}</DialogTitle>
           </DialogHeader>
           <div className="mt-4 p-8 bg-slate-900/50 rounded-3xl border border-slate-800 text-sm text-slate-400 leading-relaxed max-h-[60vh] overflow-y-auto">
              {legalModal.type === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
