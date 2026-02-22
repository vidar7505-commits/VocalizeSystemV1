import * as React from 'react';
import { useState, useEffect, useRef, Suspense, lazy, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as ScrollLink, animateScroll as scroll, scroller } from 'react-scroll';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Menu, X, Zap, CheckCircle2, Timer, Send, Lightbulb, Heart, QrCode, Loader2,
  ArrowRight, TrendingUp, Target, RefreshCw, Cpu, BrainCircuit, Activity, Sparkles,
  MessageSquare as MessageSquareText, Info, AlertTriangle, Layers, Zap as ZapIcon, Network,
  Instagram, Mail, Building2, Globe2, TrendingDown, Languages, MapPin, Shield, Cloud, Database,
  BarChart3, Users, Clock, Star, Award, Briefcase, Code2, Brain, Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import AuthModal from "@/components/AuthModal";
import InstallationRequestModal from "@/components/InstallationRequestModal";
import { supabase } from "@/lib/customSupabaseClient";
import { ShaderAnimation } from "@/components/ShaderAnimation";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ComponentErrorBoundary from "@/components/ComponentErrorBoundary";
import { useTranslation } from 'react-i18next';


// 🟢 EXTRACTED COMPONENTS & DATA
import { landingContent as content } from "@/constants/landingContent";
import { EnterpriseBackground, AnimatedCounter, FadeIn } from "@/components/landing/LandingHelpers";
// 🟢 LAZY LOADED COMPONENTS
const DashboardMockup = lazy(() => import("@/components/landing/DashboardMockup"));
const WorldMap = lazy(() => import("@/components/WorldMap").then(module => ({ default: module.WorldMap })));

import UseCaseCard from "@/components/landing/UseCaseCard";
import LeadModal from "@/components/landing/LeadModal";
import LegalModal from "@/components/landing/LegalModal";



// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

const LandingPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'tr';

  const toggleLanguage = useCallback(() => {
    const newLang = lang === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('vocalize_language', newLang);
  }, [lang, i18n]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authDefaultRole, setAuthDefaultRole] = useState('customer');
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '' });
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadType, setLeadType] = useState('info_request');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // 🟢 Data for Marquee
  const infrastructureItems = useMemo(() => [
    {
      icon: Code2,
      title: lang === 'tr' ? 'Node.js & Java' : 'Node.js & Java',
      desc: lang === 'tr' ? 'Lider backend teknolojileri' : 'Industry-leading backend',
      color: 'bg-slate-800/60 border-blue-500/30'
    },
    {
      icon: Database,
      title: lang === 'tr' ? 'PostgreSQL & Redis' : 'PostgreSQL & Redis',
      desc: lang === 'tr' ? 'Veri güvenliği & hız' : 'Security & speed',
      color: 'bg-slate-800/60 border-green-500/30'
    },
    {
      icon: Brain,
      title: lang === 'tr' ? 'AI & LLM' : 'AI & LLM',
      desc: lang === 'tr' ? 'OpenAI, Anthropic, Gemini' : 'Advanced AI integration',
      color: 'bg-slate-800/60 border-purple-500/30'
    },
    {
      icon: Cloud,
      title: lang === 'tr' ? 'Cloud Native' : 'Cloud Native',
      desc: lang === 'tr' ? 'AWS & Google Cloud' : 'AWS & GCP scalability',
      color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-orange-500/30'
    }
  ], [lang]);

  const { toast } = useToast();

  // 🟢 Defer ShaderAnimation to unblock initial paint
  const [showShader, setShowShader] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowShader(true), 100);
    return () => clearTimeout(timer);
  }, []);
  const { user, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const t = useMemo(() => content[lang], [lang]);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🟢 AKILLI YÜKLEME: Tüm kaynaklar (JS, Three.js, görseller) yüklenene kadar bekle
  useEffect(() => {
    let cancelled = false;

    const finalize = () => {
      if (cancelled) return;
      // requestIdleCallback: Main thread boşa düştüğünde aç (yarış durumu engellenir)
      const idleCb = typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn) => setTimeout(fn, 50);
      idleCb(() => {
        if (!cancelled) {
          const bid = searchParams.get('businessId') || searchParams.get('bid');
          console.log("Sayfa tamamen hazır. Business ID:", bid);
          setIsInitializing(false);
        }
      });
    };

    if (document.readyState === 'complete') {
      // Sayfa zaten yüklü (SPA içi navigasyon)
      finalize();
    } else {
      // İlk yükleme: Tüm kaynaklar bitene kadar bekle
      window.addEventListener('load', finalize);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', finalize);
    };
  }, [searchParams]);

  // OpenAuth param handler
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

  // Navigation functions
  const scrollToTop = () => scroll.scrollToTop();

  const scrollToPricing = () => {
    scroller.scrollTo('pricing', {
      duration: 800,
      delay: 0,
      smooth: 'easeInOutQuart',
      offset: -50
    });
  };

  // Optimize handlers with useCallback
  const openLogin = useCallback(() => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setAuthDefaultTab('register');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  }, []);

  const openManagerLogin = useCallback(() => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('manager');
    setIsAuthModalOpen(true);
  }, []);

  const openInstallModal = useCallback((sector = '') => {
    setSelectedSector(sector);
    setInstallModalOpen(true);
  }, []);

  const handleGuestContinue = async () => {
    setIsAuthModalOpen(false);
    await loginAsGuest();
    // loginAsGuest zaten localStorage set ediyor
    toast({
      title: lang === 'tr' ? "Misafir Modu" : "Guest Mode",
      description: lang === 'tr' ? "Geri bildirim göndermek için işletme seçin." : "Select a business to send feedback."
    });
    setTimeout(() => {
      navigate('/customer-panel?guest=true');
    }, 500);
  };

  const handleLegalLinkClick = useCallback((type) => {
    navigate(`/${type}`);
  }, [navigate]);

  // Lead modal functions
  const openLeadModal = (type) => {
    setLeadType(type);
    setLeadForm({ name: '', email: '', phone: '', message: '' });
    setLeadModalOpen(true);
  };

  const handleQuickOption = (option) => {
    setLeadForm(prev => ({ ...prev, message: option }));
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();

    if (!leadForm.name || !leadForm.email || !leadForm.message) {
      toast({
        title: lang === 'tr' ? "Hata" : "Error",
        description: lang === 'tr' ? "Lütfen gerekli alanları doldurun." : "Please fill required fields.",
        variant: "destructive"
      });
      return;
    }

    setLeadLoading(true);
    try {
      const { error } = await supabase.from('vocalize_leads').insert({
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone || null,
        company_name: null,
        sector: null,
        message: leadForm.message,
        lead_type: leadType,
        lead_score: 10,
        source: 'landing_page'
      });

      if (error) throw error;

      toast({
        title: lang === 'tr' ? "Teşekkür ederiz!" : "Thank you!",
        description: lang === 'tr'
          ? "Ekibimiz en kısa sürede sizinle iletişime geçecek."
          : "Our team will contact you soon."
      });

      setLeadModalOpen(false);
      setLeadForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Lead submit error:', error);
      toast({
        title: lang === 'tr' ? "Hata" : "Error",
        description: lang === 'tr'
          ? "Bir sorun oluştu, lütfen tekrar deneyin."
          : "Something went wrong, please try again.",
        variant: "destructive"
      });
    } finally {
      setLeadLoading(false);
    }
  };

  // Memoize navLinks
  const navLinks = useMemo(() => [
    { name: t.nav.features, to: 'features' },
    { name: t.nav.useCases, to: 'industries' },
    { name: t.nav.pricing, to: 'pricing' },
    { name: t.nav.v2, to: 'v2-vision' },
    { name: t.nav.globalVision, to: 'global-map' }
  ], [t.nav]);



  // 🟢 INITIALIZATION CHECK: Prevent heavy render block on mount
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-slate-400 text-sm">Vocalize...</p>
        </div>
      </div>
    );
  }

  // 🟢 Defer ShaderAnimation to unblock initial paint


  return (
    <>
      <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans w-full overflow-x-hidden relative selection:bg-teal-500/30 animate-in fade-in duration-700">
        <Helmet>
          <title>
            {lang === 'tr'
              ? 'Vocalize - HORECA Sektörü İçin Müşteri Geri Bildirim Sistemi'
              : 'Vocalize - Customer Feedback System for HORECA Sector'}
          </title>
          <meta
            name="description"
            content={lang === 'tr'
              ? "Kayıp müşterileri yakalayın, şikayetleri kazanca dönüştürün. HORECA sektörüne özel geri bildirim çözümü."
              : "Capture lost customers, turn complaints into revenue. Feedback solution for HORECA sector."}
          />
        </Helmet>

        <EnterpriseBackground />

        {/* ===== HEADER ===== */}
        <header className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent will-change-transform",
          scrolled
            ? "bg-[#0f172a]/95 backdrop-blur-xl border-slate-800/80 shadow-lg"
            : "bg-transparent"
        )}>
          {/* ... existing header content ... */}
          <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer relative" onClick={scrollToTop}>
              <div className="w-14 h-14 flex items-center justify-center relative z-20">
                <img
                  src="faviconbeyaz.png"
                  alt="Vocalize Logo"
                  className="h-14 w-auto object-contain brightness-110"
                />
              </div>
              <div className="relative h-12 w-[140px] overflow-hidden">
                <motion.span
                  className="absolute left-0 top-0 h-full flex items-center font-bold text-2xl md:text-3xl tracking-tight whitespace-nowrap text-white"
                  initial={{ x: 0, opacity: 1 }}
                  animate={{
                    x: scrolled ? -50 : 0,
                    opacity: scrolled ? 0 : 1
                  }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                  VOCALIZE
                </motion.span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <ScrollLink
                  key={link.name}
                  to={link.to}
                  spy={true}
                  smooth={true}
                  offset={-80}
                  duration={500}
                  className="text-sm font-medium text-slate-300 hover:text-white cursor-pointer transition-colors tracking-tight"
                >
                  {link.name}
                </ScrollLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group"
              >
                <Languages className="w-4 h-4" />
                <span className="font-semibold text-xs uppercase tracking-wide">
                  {lang === 'tr' ? 'EN' : 'TR'}
                </span>
              </button>

              {user ? (
                <button
                  onClick={() => navigate(user.user_metadata?.user_type === 'manager' ? '/admin-panel' : '/customer-panel')}
                  className="text-teal-400 hover:text-teal-300 transition-colors font-semibold flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {lang === 'tr' ? 'Panelim' : 'My Panel'}
                </button>
              ) : (
                <button onClick={openLogin} className="text-slate-300 hover:text-white transition-colors hidden sm:inline-block">
                  {t.nav.login}
                </button>
              )}

              <Button
                onClick={() => openInstallModal()}
                className="bg-teal-500 hover:bg-teal-600 text-white border-none font-semibold px-5"
              >
                {t.nav.install}
              </Button>
            </div>

            <button
              className="md:hidden p-2 text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden bg-[#0f172a]/98 backdrop-blur-xl border-b border-slate-800 overflow-hidden"
              >
                <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <ScrollLink
                      key={link.name}
                      to={link.to}
                      spy={true}
                      smooth={true}
                      offset={-80}
                      duration={500}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-lg font-medium py-2 border-b border-slate-800 text-slate-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </ScrollLink>
                  ))}

                  <button
                    onClick={() => {
                      toggleLanguage();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2"
                  >
                    <Languages className="w-5 h-5" />
                    <span className="font-semibold">
                      {lang === 'tr' ? 'Switch to English' : "Türkçe'ye Geç"}
                    </span>
                  </button>

                  <div className="flex flex-col gap-3 mt-4">
                    {user ? (
                      <Button
                        className="w-full bg-slate-800 text-teal-400 hover:bg-slate-700 border border-teal-500/30"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate(user.user_metadata?.user_type === 'manager' ? '/admin-panel' : '/customer-panel');
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {lang === 'tr' ? 'Panelime Git' : 'Go to Panel'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-slate-700 text-white hover:bg-slate-600 border-none"
                        onClick={() => {
                          setIsMenuOpen(false);
                          openLogin();
                        }}
                      >
                        {t.nav.login}
                      </Button>
                    )}
                    <Button
                      className="w-full bg-teal-500 text-white hover:bg-teal-600 font-semibold"
                      onClick={() => {
                        setIsMenuOpen(false);
                        openInstallModal();
                      }}
                    >
                      {t.nav.install}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ===== HERO SECTION ===== */}
        <ComponentErrorBoundary name="Hero Section" variant="teal">
          <section className="relative w-full min-h-[100svh] flex items-center justify-center pt-20 overflow-hidden z-10 group">

            {/* Shader Animation Background - Defer rendering */}
            {showShader && <ShaderAnimation className="absolute inset-0 w-full h-full z-0" />}

            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/40 z-10" />

            {/* Hero Content */}
            <div className="container mx-auto px-4 relative z-20 text-center flex flex-col items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-6xl mx-auto px-4 w-full"
              >
                {/* Badge */}
                <motion.div
                  className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold mb-8 md:mb-12 backdrop-blur-sm mt-20 md:mt-16"
                  whileHover={{ scale: 1.05 }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(20, 184, 166, 0)",
                      "0 0 0 4px rgba(20, 184, 166, 0.2)",
                      "0 0 0 0px rgba(20, 184, 166, 0)"
                    ]
                  }}
                  transition={{
                    boxShadow: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  }}
                >
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 fill-current flex-shrink-0" />
                  {t.hero.badge}
                </motion.div>

                {/* Main Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.15] px-4 flex flex-col items-center md:block [text-shadow:_0_2px_10px_rgba(0,0,0,0.8)]">
                  <span className="block">{t.hero.title1}</span>
                  <span className="block mt-2 md:mt-4 text-center md:text-left">
                    {t.hero.title2} <span className="text-teal-400 whitespace-nowrap">{t.hero.title2Highlight}</span>
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg md:text-xl text-slate-200 mb-12 max-w-4xl mx-auto font-medium leading-[1.6] px-6 opacity-90 [text-shadow:_0_1px_8px_rgba(0,0,0,0.6)]">
                  <span className="block md:inline font-semibold text-white/95">{t.hero.subtitle1}</span>
                  <span className="block md:inline md:ml-1 mt-3 md:mt-0">{t.hero.subtitle2}</span>
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 w-full px-6 sm:px-0">
                  <Button
                    size="lg"
                    className="h-14 px-8 w-full sm:w-auto bg-slate-100 hover:bg-white text-slate-900 font-bold text-base transition-all shadow-lg hover:shadow-xl"
                    onClick={() => openInstallModal()}
                  >
                    {t.hero.ctaPrimary}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 w-full sm:w-auto bg-transparent border-white/80 text-white hover:bg-slate-700 hover:text-white font-semibold text-base transition-all"
                    onClick={openManagerLogin}
                  >
                    {t.hero.ctaSecondary}
                  </Button>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-200 uppercase tracking-widest opacity-90">
                  <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
                    <Zap className="w-3.5 h-3.5 text-orange-400 fill-current" />
                    <span>{t.hero.badge1}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span>{t.hero.badge2}</span>
                  </div>
                </div>

                {/* ===== YENİ DASHBOARD MOCKUP ===== */}
                <Suspense fallback={
                  <div className="w-full h-[400px] flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  </div>
                }>
                  <DashboardMockup lang={lang} />
                </Suspense>
              </motion.div>
            </div>
          </section>
        </ComponentErrorBoundary>



        {/* ===== INFRASTRUCTURE SECTION ===== */}
        <ComponentErrorBoundary name="Infrastructure Section" variant="teal">
          <section className="py-16 md:py-20 bg-gradient-to-r from-slate-950/50 via-slate-900/50 to-slate-950/50 border-y border-slate-800 relative z-10 overflow-hidden group">

            <div className="container mx-auto px-4 mb-12">
              <div className="text-center">
                <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 text-white tracking-tight">
                  {lang === 'tr' ? 'Güçlü Altyapı' : 'Enterprise-Grade Infrastructure'}
                </h2>
                <p className="text-slate-400 text-base md:text-lg">
                  {lang === 'tr'
                    ? 'Dünya standartlarında teknoloji, sınırsız ölçeklenebilirlik ve maksimum güvenlik'
                    : 'World-class technology with unlimited scalability and maximum security'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden relative">
              {/* CSS Animation 기반 Marquee - Daha performanslı (Compositor Thread) */}
              <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                  animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                  animation-play-state: paused;
                }
              `}} />

              <div className="flex w-max animate-marquee gap-4 md:gap-6 px-4">
                {[...infrastructureItems, ...infrastructureItems].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg p-4 md:p-5 transition-all duration-300 cursor-default group border flex-shrink-0 w-56 md:w-64",
                        item.color,
                        "hover:border-teal-500/50 hover:shadow-lg hover:shadow-slate-800/50 hover:scale-105 hover:-translate-y-0.5"
                      )}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-2 md:mb-3 rounded-lg bg-slate-700/50 group-hover:bg-teal-500/10 transition-colors">
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-teal-400 group-hover:text-teal-300 transition-colors" />
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-white text-center mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-400 text-center leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ComponentErrorBoundary>

        {/* ===== FEATURES SECTION ===== */}
        <ComponentErrorBoundary name="Features Section" variant="teal">
          <section id="features" className="py-12 md:py-24 bg-[#0f172a] relative z-10 group">

            <div className="container mx-auto px-4">
              <FadeIn className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white tracking-tight">
                  {t.features.title}
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  {t.features.subtitle}
                </p>
              </FadeIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                {[
                  {
                    icon: <Send className="w-6 h-6 text-teal-400" />,
                    title: t.features.feature1.title,
                    desc: t.features.feature1.desc
                  },
                  {
                    icon: <Lightbulb className="w-6 h-6 text-teal-400" />,
                    title: t.features.feature2.title,
                    desc: t.features.feature2.desc
                  },
                  {
                    icon: <Heart className="w-6 h-6 text-teal-400" />,
                    title: t.features.feature3.title,
                    desc: t.features.feature3.desc
                  }
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: idx * 0.2, duration: 0.5 }}
                    className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-all group hover:bg-slate-800/70"
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center mb-6 border border-slate-700 group-hover:border-teal-500/30 transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </ComponentErrorBoundary>

        {/* ===== INDUSTRY SOLUTIONS (Yeni - QR Poster yerine) ===== */}
        <ComponentErrorBoundary name="Industries Section" variant="teal">
          <section id="industries" className="py-24 bg-[#0f172a] relative z-10 overflow-hidden group">

            <div className="container mx-auto px-4">
              <FadeIn className="text-center mb-20">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white tracking-tight">
                  {t.industries.title}
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  {t.industries.subtitle}
                </p>
              </FadeIn>

              {/* Bento Grid Industries */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 max-w-full mx-auto">
                {t.industries.solutions.map((industry, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="group relative rounded-xl border border-slate-700/50 p-6 md:p-8 flex flex-col overflow-hidden cursor-pointer hover:border-teal-500/50 transition-all duration-300"
                    whileHover={{ y: -8 }}
                    onClick={() => openInstallModal(industry.title)}
                  >
                    {/* Activity gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-900 group-hover:from-slate-800/60 group-hover:via-slate-900/80 transition-all duration-300" />

                    {/* Blur highlight on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: "radial-gradient(circle at center, rgba(20,184,166,0.1) 0%, transparent 100%)",
                        filter: 'blur(40px)'
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300 inline-block">
                        {industry.icon}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
                        {industry.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-sm font-medium text-teal-400/80 mb-4">
                        {industry.subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-sm text-slate-300 leading-relaxed mb-6 flex-grow">
                        {industry.desc}
                      </p>

                      {/* CTA Arrow */}
                      <motion.div
                        className="flex items-center gap-2 text-teal-400 text-sm font-semibold group-hover:gap-3 transition-all"
                        animate={{ x: 0 }}
                        whileHover={{ x: 5 }}
                      >
                        <span>{lang === 'tr' ? 'Birlikte Başlayalım' : 'Get Started'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </div>

                    {/* Border glow */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        boxShadow: '0 0 30px rgba(20, 184, 166, 0.2)'
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </ComponentErrorBoundary>

        {/* ===== STRATEGIC ECOSYSTEM (Enhanced) ===== */}
        <ComponentErrorBoundary name="Ecosystem Section" variant="teal">
          <section className="py-12 md:py-24 bg-gradient-to-b from-[#0f172a] via-slate-900/30 to-[#0f172a] relative z-10 overflow-hidden group">

            <div className="container mx-auto px-4 px-2 md:px-4">
              <FadeIn>
                {/* Glassmorphism Card with Enhanced Animation */}
                <div className="max-w-3xl mx-auto relative">
                  {/* Animated orbiting elements */}
                  <motion.div
                    className="absolute -top-20 -left-20 w-40 h-40 rounded-full border border-teal-500/20 pointer-events-none hidden md:block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute -bottom-20 -right-20 w-32 h-32 rounded-full border border-orange-500/20 pointer-events-none hidden md:block"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  />

                  <div
                    className="relative group rounded-2xl md:rounded-3xl p-6 md:p-14 border border-slate-600/30 overflow-hidden"
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)'
                    }}
                  >
                    {/* Multi-layer animated gradient background */}
                    <motion.div
                      className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                      animate={{
                        background: [
                          'radial-gradient(circle at 40% 50%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                          'radial-gradient(circle at 60% 30%, rgba(249,115,22,0.15) 0%, transparent 50%)',
                          'radial-gradient(circle at 50% 70%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                          'radial-gradient(circle at 40% 50%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                        ]
                      }}
                      transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />

                    {/* Additional animated layer for depth */}
                    <motion.div
                      className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                      animate={{
                        background: [
                          'linear-gradient(45deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                          'linear-gradient(135deg, rgba(249,115,22,0.05) 0%, transparent 100%)',
                          'linear-gradient(225deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                          'linear-gradient(315deg, rgba(249,115,22,0.05) 0%, transparent 100%)',
                          'linear-gradient(45deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                        ]
                      }}
                      transition={{
                        duration: 16,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 100 }}
                        viewport={{ once: true }}
                      >
                        <Badge className="inline-block mb-6 bg-gradient-to-r from-teal-500/20 to-orange-500/20 text-teal-300 border border-teal-500/50 animate-pulse">
                          ✨ {lang === 'tr' ? 'Geleceğinizi Kazandırıyoruz' : 'Securing Your Future'}
                        </Badge>
                      </motion.div>

                      <motion.h2
                        className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4 tracking-tight bg-gradient-to-r from-teal-400 via-white to-orange-400 bg-clip-text text-transparent"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        viewport={{ once: true }}
                      >
                        {t.ecosystem.title}
                      </motion.h2>

                      <motion.p
                        className="text-slate-300 text-lg mb-2"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        viewport={{ once: true }}
                      >
                        {t.ecosystem.subtitle}
                      </motion.p>

                      <motion.p
                        className="text-slate-400 text-base leading-relaxed mb-10"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        viewport={{ once: true }}
                      >
                        {t.ecosystem.desc}
                      </motion.p>

                      <Button
                        className="relative bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold px-8 py-3 text-base h-auto shadow-lg hover:shadow-teal-500/50 transition-all group overflow-hidden mb-12"
                        onClick={() => openLeadModal('pilot_program')}
                      >
                        <span className="relative z-10 flex items-center justify-center">
                          {t.ecosystem.cta}
                          <motion.span
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </motion.span>
                        </span>
                      </Button>

                      {/* Partner "Coming Soon" Teaser Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 md:mt-12 w-full max-w-4xl mx-auto">
                        {t.ecosystem.partners.map((partner, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                            className="group/card relative bg-slate-800/20 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 transition-all duration-300 hover:border-teal-500/30 hover:bg-slate-800/40 text-left overflow-hidden"
                          >
                            <div className="absolute top-3 right-3">
                              <Badge variant="outline" className="text-[10px] font-bold border-teal-500/30 text-teal-400 py-0 px-2 uppercase tracking-tight bg-teal-500/5">
                                {t.ecosystem.comingSoon}
                              </Badge>
                            </div>

                            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center mb-4 border border-slate-800 group-hover/card:border-teal-500/30 transition-colors">
                              <Lock className="w-5 h-5 text-teal-500/70 group-hover/card:text-teal-400 transition-colors" />
                            </div>

                            <h4 className="text-white font-bold text-sm mb-1 group-hover/card:text-teal-300 transition-colors">
                              {partner.title}
                            </h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              {partner.desc}
                            </p>

                            {/* Subtle background glow */}
                            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-teal-500/5 blur-2xl rounded-full group-hover/card:bg-teal-500/10 transition-colors pointer-events-none" />
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced border glow effect */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      animate={{
                        boxShadow: [
                          '0 0 60px rgba(20, 184, 166, 0.3), inset 0 0 60px rgba(20, 184, 166, 0.05)',
                          '0 0 80px rgba(249, 115, 22, 0.3), inset 0 0 60px rgba(249, 115, 22, 0.05)',
                          '0 0 60px rgba(20, 184, 166, 0.3), inset 0 0 60px rgba(20, 184, 166, 0.05)',
                        ]
                      }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              </FadeIn>
            </div>
          </section>
        </ComponentErrorBoundary>

        {/* ===== PRICING SECTION ===== */}
        <ComponentErrorBoundary name="Pricing Section" variant="teal">
          <section id="pricing" className="py-12 md:py-20 bg-gradient-to-b from-[#0f172a] via-[#0d3d3d] to-[#0f172a] relative z-10 group">

            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center mb-6 md:mb-12">
                <FadeIn>
                  <span className="inline-block py-1 px-3 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold tracking-wider mb-3 uppercase border border-teal-500/20">
                    <Building2 className="w-3 h-3 inline mr-1" /> {t.pricing.badge}
                  </span>
                  <h2 className="text-2xl md:text-5xl font-bold mb-3 md:mb-4 text-white tracking-tight">
                    {t.pricing.title} <span className="text-teal-400">{t.pricing.titleHighlight}</span>
                  </h2>
                  <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                    {t.pricing.subtitle}
                  </p>
                </FadeIn>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 items-stretch">
                {/* Plan 1: Butik */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-teal-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center group-hover:bg-teal-500/10 transition-colors">
                      <Building2 className="w-6 h-6 text-slate-300 group-hover:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.pricing.plan1.name}</h3>
                      <p className="text-xs text-slate-400">{t.pricing.plan1.desc}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {t.pricing.plan1.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6 border-t border-slate-700/50">
                    <div className="text-lg font-bold text-white mb-1">{t.pricing.plan1.priceTitle}</div>
                    <p className="text-xs text-slate-500 mb-4">{t.pricing.plan1.priceSubtitle}</p>
                    <Button
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                      onClick={() => openLeadModal('info_request')}
                    >
                      {t.pricing.plan1.cta}
                    </Button>
                  </div>
                </motion.div>

                {/* Plan 2: Zincir (HIGHLIGHT) */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="bg-gradient-to-b from-slate-800 to-[#0f172a] border-2 border-teal-500/50 rounded-2xl p-6 flex flex-col relative shadow-2xl transform md:-translate-y-4 z-10"
                >
                  <div className="absolute top-0 right-0 bg-teal-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider">
                    {t.pricing.plan2.badge}
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.pricing.plan2.name}</h3>
                      <p className="text-xs text-teal-200/70">{t.pricing.plan2.desc}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {t.pricing.plan2.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white font-medium">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6 border-t border-teal-500/30">
                    <div className="text-lg font-bold text-teal-400 mb-1">{t.pricing.plan2.priceTitle}</div>
                    <p className="text-xs text-slate-400 mb-4">{t.pricing.plan2.priceSubtitle}</p>
                    <Button
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold"
                      onClick={() => openLeadModal('info_request')}
                    >
                      {t.pricing.plan2.cta}
                    </Button>
                  </div>
                </motion.div>

                {/* Plan 3: Enterprise */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Globe2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.pricing.plan3.name}</h3>
                      <p className="text-xs text-slate-400">{t.pricing.plan3.desc}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {t.pricing.plan3.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6 border-t border-slate-700/50">
                    <div className="text-lg font-bold text-purple-400 mb-1">{t.pricing.plan3.priceTitle}</div>
                    <p className="text-xs text-slate-500 mb-4">{t.pricing.plan3.priceSubtitle}</p>
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      onClick={() => openLeadModal('info_request')}
                    >
                      {t.pricing.plan3.cta}
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* Common Features Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 max-w-5xl mx-auto text-center"
              >
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
                  {t.pricing.commonTitle}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {t.pricing.commonFeatures.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center gap-2 text-sm text-slate-300 bg-slate-800/50 py-2 rounded-lg border border-slate-700/50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section >
        </ComponentErrorBoundary>

        {/* ===== IMPACT SECTION ===== */}
        <ComponentErrorBoundary name="Impact Section" variant="teal">
          <section id="impact" className="py-24 bg-[#0f172a] text-center relative z-10 group" >

            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">
                  {t.impact.title}
                </h2>
                <p className="text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed">
                  {t.impact.subtitle}
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: TrendingUp,
                    title: t.impact.metric1.title,
                    desc: t.impact.metric1.desc,
                    color: 'text-teal-400'
                  },
                  {
                    icon: Target,
                    title: t.impact.metric2.title,
                    desc: t.impact.metric2.desc,
                    color: 'text-teal-400'
                  },
                  {
                    icon: RefreshCw,
                    title: t.impact.metric3.title,
                    desc: t.impact.metric3.desc,
                    color: 'text-teal-400'
                  }
                ].map((metric, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: idx * 0.2, duration: 0.5 }}
                    className="p-8 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-teal-500/30 transition-all group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500/20 transition-colors"
                    )}>
                      <metric.icon className={cn("w-6 h-6", metric.color)} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      {metric.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {metric.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section >
        </ComponentErrorBoundary>

        {/* ===== V2 AI VISION SECTION ===== */}
        <ComponentErrorBoundary name="V2 Vision" variant="teal">
          <section id="v2-vision" className="py-20 md:py-28 bg-gradient-to-br from-[#0f172a] via-slate-900/50 to-[#0f172a] relative overflow-hidden z-10 border-t border-slate-800 group" >

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mx-auto px-4 relative z-10 flex flex-col items-center justify-center text-center max-w-6xl w-full"
            >
              {/* V2 AI Visual Header */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                animate={{
                  opacity: [0.9, 1, 0.9],
                  scale: [1, 1.03, 1]
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.05,
                  opacity: { duration: 3, repeat: Infinity },
                  scale: { duration: 3, repeat: Infinity }
                }}
                className="mb-8 relative w-full flex justify-center"
              >
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
                  />
                </div>

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

              {/* Badge: Coming Soon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 mb-6 backdrop-blur-sm"
              >
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                  {t.v2.badge}
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-tight"
              >
                {t.v2.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">{t.v2.titleHighlight}</span>
              </motion.h3>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-lg md:text-xl text-slate-300 mb-10 max-w-4xl leading-relaxed font-light"
              >
                {t.v2.subtitle} <span className="font-semibold text-white">{t.v2.subtitle2}</span>
                {t.v2.subtitle3} <span className="font-semibold text-white">{t.v2.subtitle4}</span> {t.v2.subtitle5}
              </motion.p>

              {/* Key Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-12">
                {[
                  { icon: Target, title: t.v2.features.f1.title, desc: t.v2.features.f1.desc },
                  { icon: TrendingUp, title: t.v2.features.f2.title, desc: t.v2.features.f2.desc },
                  { icon: Lightbulb, title: t.v2.features.f3.title, desc: t.v2.features.f3.desc },
                  { icon: Globe2, title: t.v2.features.f4.title, desc: t.v2.features.f4.desc }
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.6 }}
                    className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-teal-500/40 transition-all duration-300 hover:bg-white/8"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />

                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4 group-hover:border-teal-500/60 transition-colors">
                        <feature.icon className="w-6 h-6 text-teal-400" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 text-left">{feature.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed text-left">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* V2 Pricing Teaser Box */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="w-full max-w-3xl mx-auto backdrop-blur-lg bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-blue-500/10 border border-teal-500/30 rounded-2xl p-8 shadow-lg"
              >
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-teal-500/20 border border-teal-500/40">
                      <Sparkles className="h-7 w-7 text-teal-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-white mb-3">{t.v2.pricingTitle}</h4>
                    <p className="text-slate-300 leading-relaxed text-base mb-4">
                      {t.v2.pricingDesc1} <span className="font-bold text-teal-400">{t.v2.pricingDesc2}</span> {t.v2.pricingDesc3}
                    </p>
                    <div className="space-y-3 mb-5">
                      <div className="bg-slate-900/50 border border-teal-500/20 rounded-lg p-4">
                        <p className="text-slate-300 text-sm flex items-start gap-3 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold text-white">{t.v2.pricingPoint1}</span> {t.v2.pricingPoint1Desc}
                          </span>
                        </p>
                      </div>
                      <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/30 rounded-lg p-4">
                        <p className="text-slate-300 text-sm flex items-start gap-3">
                          <BrainCircuit className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold text-teal-400">{t.v2.pricingPoint2}</span> {t.v2.pricingPoint2Desc}
                          </span>
                        </p>
                      </div>
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>
                          <span className="font-semibold text-slate-300">{t.v2.pricingPoint3}</span> {t.v2.pricingPoint3Desc}
                        </span>
                      </p>
                    </div>
                    <Button
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold mt-2"
                      onClick={() => openLeadModal('info_request')}
                    >
                      <Mail className="w-4 h-4 mr-2" /> {t.v2.ctaV2}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </section >
        </ComponentErrorBoundary>

        {/* ===== GLOBAL REACH SECTION - ENTERPRISE DATA FLOW DESIGN ===== */}
        <ComponentErrorBoundary name="Global Map" variant="teal">
          <section id="global-map" className="relative w-full min-h-[400px] md:min-h-[600px] md:h-[80vh] bg-[#0f172a] overflow-hidden border-y border-slate-800 flex items-center justify-center group">


            {/* 1. KATMAN: Harita ve Veri Akışı (Arka Plan) */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-40">
              <Suspense fallback={<div className="w-full h-full bg-[#0f172a] animate-pulse" />}>
                <WorldMap
                  dots={[
                    {
                      start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                      end: { lat: 48.8566, lng: 2.3522, label: 'Paris' }
                    },
                    {
                      start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                      end: { lat: 40.7128, lng: -74.0060, label: 'New York' }
                    },
                    {
                      start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                      end: { lat: 25.2048, lng: 55.2708, label: 'Dubai' }
                    },
                    {
                      start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                      end: { lat: 35.6762, lng: 139.6503, label: 'Tokyo' }
                    },
                    {
                      start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                      end: { lat: 51.5074, lng: -0.1278, label: 'London' }
                    }
                  ]}
                  lineColor="#14b8a6"
                  showLabels={false} // Temiz görünüm için etiketleri kapattık, sadece noktalar ve çizgiler
                  animationDuration={3} // Veri akışı hızı
                  loop={true}
                />
              </Suspense>
            </div>

            {/* 2. KATMAN: İçerik (Ön Plan) */}
            <div className="container mx-auto px-4 relative z-10 pointer-events-none text-center">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                    {lang === 'tr' ? 'Global Operasyon Ağı' : 'Global Operation Network'}
                  </span>
                </div>

                {/* Responsive Başlık: Mobilde daha dengeli, Masaüstünde görkemli */}
                <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold text-white tracking-tighter mb-4 [text-shadow:_0_4px_15px_rgba(0,0,0,0.8)]">
                  {lang === 'tr' ? 'SINIRLARI AŞAN ERİŞİM' : 'REACH BEYOND BORDERS'}
                </h2>

                <div className="max-w-xl mx-auto space-y-8">
                  {/* Teal Vurgu: Geniş harf boşluğu */}
                  <p className="text-teal-400 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] opacity-90">
                    {lang === 'tr' ? 'YAKINDA TÜM DÜNYADA' : 'COMING SOON GLOBALLY'}
                  </p>

                  <p className="text-slate-400 text-xs md:text-lg font-light leading-relaxed">
                    {lang === 'tr'
                      ? 'Kıtalar arası veri akışı ile tüm şubeleriniz tek bir global ağda birleşiyor.'
                      : 'All your branches unite in a single global network with real-time data flow.'}
                  </p>

                  {/* Şehir Listesi: Sydney -> Paris güncellendi */}
                  <div className="flex flex-wrap justify-center items-center gap-x-4 md:gap-x-8 gap-y-2 pt-8 border-t border-slate-800/50">
                    {['LONDON', 'NEW YORK', 'DUBAI', 'TOKYO', 'PARIS'].map((city) => (
                      <span key={city} className="text-[9px] md:text-xs font-bold text-slate-500 tracking-[0.2em] hover:text-teal-400 transition-colors">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Kenar Gradyanları: Haritanın tasarımın içinde erimesini sağlar */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0f172a] to-transparent z-20" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0f172a] to-transparent z-20" />
          </section>
        </ComponentErrorBoundary>

        {/* ===== FOOTER ===== */}
        < footer className="bg-[#0f172a] py-8 border-t border-slate-800 relative z-10 text-center" >
          <div className="container mx-auto px-4">
            <p className="text-slate-500 text-xs mb-4">
              © 2025 Vocalize Global — Müşteri sesini teknolojiyle buluşturuyoruz.
            </p>

            <div className="mb-4">
              <span
                className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2"
                onClick={() => handleLegalLinkClick('kvkk')}
              >
                {t.footer.kvkk}
              </span>
              <span className="text-slate-600">|</span>
              <span
                className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2"
                onClick={() => handleLegalLinkClick('privacy')}
              >
                {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </span>
              <span className="text-slate-600">|</span>
              <span
                className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2"
                onClick={() => handleLegalLinkClick('terms')}
              >
                {t.footer.terms}
              </span>
            </div>

            <div className="flex justify-center gap-6 items-center">
              <div
                onClick={scrollToTop}
                className="w-6 h-6 text-slate-600 hover:text-white cursor-pointer flex items-center justify-center transition-colors"
              >
                <img
                  src="faviconbeyaz.png"
                  alt="Vocalize Logo Footer"
                  className="h-full w-full object-contain brightness-110"
                />
              </div>

              <a
                href="https://www.instagram.com/vocalize.global/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-[#E1306C] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>

              <a
                href="mailto:support@vocalize.global"
                className="text-slate-500 hover:text-teal-400 transition-colors"
                aria-label={lang === 'tr' ? 'E-posta Gönder' : 'Send Email'}
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </footer >

        {/* ===== MODALS ===== */}

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authDefaultTab}
          defaultRole={authDefaultRole}
          showGuestOption={true}
          onGuestContinue={handleGuestContinue}
        />

        {/* Installation Request Modal */}
        <InstallationRequestModal
          isOpen={installModalOpen}
          onClose={() => setInstallModalOpen(false)}
          initialSector={selectedSector}
        />

        {/* Lead Modal */}
        <LeadModal
          open={leadModalOpen}
          onOpenChange={setLeadModalOpen}
          leadType={leadType}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          leadLoading={leadLoading}
          handleLeadSubmit={handleLeadSubmit}
          handleQuickOption={handleQuickOption}
          t={t}
        />

      </div>

    </>
  );
};

export default LandingPage;
