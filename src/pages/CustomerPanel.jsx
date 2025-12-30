import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings, MessageSquare, MapPin, Mail, Phone, Lock, LogOut, Trash2, X, Star, ChevronDown,
  AlertTriangle, Lightbulb, Home, List, TrendingUp, Menu, QrCode, Info, AlertCircle, Filter,
  MessageCircle, Loader2, Image as ImageIcon, Upload, UserPlus,
  Building2, CheckCircle2, ChevronRight, Edit2, Maximize2, KeyRound, Shield, HelpCircle, ArrowRight,
  Send, AlertOctagon, ThumbsUp
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// --- YARDIMCI FONKSİYONLAR ---
const isOlderThan48Hours = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now - created) / (1000 * 60 * 60);
  return diffHours >= 48;
};

const getStatusBadge = (feedback, t) => {
  const isOld = isOlderThan48Hours(feedback.created_at);
  if (feedback.status === 'resolved' || feedback.status === 'auto_resolved' || isOld) {
    return { label: t.resolved, color: 'green', icon: '✅' };
  }
  if (feedback.status === 'viewed' || feedback.status === 'in_progress') {
    return { label: t.reviewing, color: 'orange', icon: '👀' };
  }
  return { label: t.delivered, color: 'blue', icon: '📬' };
};

const formatDate = (dateString, language) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateString));
};

export default function CustomerPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading, signOut } = useAuth();

  // URL Parametreleri
  const businessParam = searchParams.get('business');
  const branchParam = searchParams.get('branch');
  const qrParam = searchParams.get('qr');
  const fromQrParam = searchParams.get('from_qr');
  const guestParam = searchParams.get('guest');

  // State Yönetimi
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('vocalize_lang') || 'tr');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authDefaultRole, setAuthDefaultRole] = useState('customer');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);
  const [pendingFeedbackType, setPendingFeedbackType] = useState(null);
  const [dontShowGuestWarning, setDontShowGuestWarning] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportImages, setSupportImages] = useState([]);

  const [suggestedBusinessName, setSuggestedBusinessName] = useState('');
  const [suggestedBusinessLocation, setSuggestedBusinessLocation] = useState('');
  const [suggestingBusiness, setSuggestingBusiness] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountConfirmed, setDeleteAccountConfirmed] = useState(false);

  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingBusinessId, setLoadingBusinessId] = useState(null);
  
  const [hasScannedQR, setHasScannedQR] = useState(false);
  const [qrInfo, setQrInfo] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const [selectedBusinessForBranches, setSelectedBusinessForBranches] = useState(null);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  const [stats, setStats] = useState({ 
    total: 0, avgRating: 0, topBranch: '', topBranchCount: 0, 
    complaints: 0, suggestions: 0, reviews: 0,
    worstBranch: '', worstBranchCount: 0, userTitle: ''
  });

  const [feedbackList, setFeedbackList] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const fromQR = hasScannedQR || !!qrParam;
  const businessName = businesses.find(b => b.id === selectedBusiness)?.business_name;
  const branchName = branches.find(b => b.id === selectedBranch)?.branch_name_tr || qrInfo?.branch_name;

  const lastLoggedRef = useRef({ business: null, branch: null });

  // --- DİL PAKETİ (Kısaltıldı) ---
  const texts = {
    tr: {
      welcome: 'Hoş Geldiniz',
      guestWelcome: 'Deneyiminizi Paylaşın',
      subtitle: 'Fikriniz değerli. İşletmelerin hizmet kalitesini artırmasına katkıda bulunun.',
      qrAutoDetect1: 'İşletmeyi bir kez QR ile doğruladığınızda bilgiler otomatik açılır.',
      qrAutoDetect2: 'Tekrar QR okutmanıza gerek kalmaz.',
      qrAutoDetect3: 'Bu doğrulama yalnızca seçtiğiniz işletme için geçerlidir.',
      complaint: 'Şikayet Bildir',
      complaintDesc: 'Bir sorun mu yaşadınız? Hemen bildirin!',
      suggestion: 'Öneride Bulun',
      suggestionDesc: 'Fikirleriniz bizim için değerli.',
      review: 'Değerlendir',
      reviewDesc: 'Deneyiminizi puanlayın!',
      myFeedbacks: 'Geri Bildirimlerim',
      stats: 'İstatistiklerim',
      selectBranchForFeedback: 'Geri bildirim göndermek için şube seçin',
      changeInfo: 'Değiştir',
      infoBox: 'Geri bildirimleriniz doğrudan işletme yöneticilerine anında iletilir.',
      warningTitle: 'Önemli Not:',
      warningText: 'Vocalize geri bildirimlerinizi işletme yöneticilerine anında iletir. Nihai geri dönüş süresi ve kararı tamamen işletmeye bağlıdır.',
      visitedBusinesses: 'Ziyaret Edilen İşletmeler',
      noVisitedBusiness: 'Henüz bir işletme ziyaret etmediniz',
      startWithQR: 'QR kod okutarak başlayın',
      home: 'Ana Sayfa',
      register: 'Kayıt Ol',
      logout: 'Çıkış Yap',
      supportItem: 'Destek',
      branchSelection: 'Şube Seçimi',
      cancel: 'Vazgeç',
      guestCTA: {
        feedbackTitle: "Kayıt Olun",
        statsTitle: "İstatistikler İçin Kayıt Olun",
        subtext: "Misafir verileri kaydedilmez.",
        button: "Kayıt Ol"
      },
      guestTracking: 'Geri bildirimlerinizi takip edin',
      guestTrackingDesc: 'Geçmişinizi kaybetmemek için kayıt olun.',
      guestWarning: {
        title: "⚠️ Misafir Modu",
        text: "Geri bildirimleriniz profilinize kaydedilmez.",
        dontShow: "Gösterme",
        continueGuest: "Devam Et",
        loginToSend: "Giriş Yap"
      },
      formType: 'Form Tipi', all: 'Tümü', complaintBadge: 'Şikayet', suggestionBadge: 'Öneri', reviewBadge: 'Değerlendirme',
      advancedFilter: 'Filtrele', branch: 'Şube', status: 'Durum', sortBy: 'Sıralama', newest: 'En Yeni', oldest: 'En Eski',
      delivered: 'İletildi', reviewing: 'İnceleniyor', resolved: 'Çözüldü',
      noFeedbacks: 'Henüz bildirim yok', sendFirstFeedback: 'İlk bildiriminizi gönderin', sendFeedbackBtn: 'Bildirim Gönder',
      feedbackDetail: 'Bildirim Detayı', yourMessage: 'Mesajınız', generalEval: 'Genel Değerlendirme', attachedImages: 'Görseller', close: 'Kapat',
      support: { title: 'Destek', email: 'E-posta', message: 'Mesaj', images: 'Görsel', upload: 'Yükle', send: 'Gönder', sending: '...' },
      businessSuggestion: { title: 'İşletme Öner', businessName: 'İsim', location: 'Konum', suggest: 'Öner' },
      statsPage: { noData: 'Veri yok' }, userTitle: { newVoice: 'Yeni Ses' }, userTitleInfo: { nextLevel: 'Sonraki Seviye' }
    },
    en: {
        welcome: 'Welcome',
        guestWelcome: 'Share Your Experience',
        subtitle: 'Your opinion matters.',
        qrAutoDetect1: 'Business info saved automatically via QR.',
        qrAutoDetect2: 'No need to scan again.',
        qrAutoDetect3: 'Valid for selected business.',
        complaint: 'Report Issue',
        complaintDesc: 'Report any issues instantly.',
        suggestion: 'Make Suggestion',
        suggestionDesc: 'Your ideas matter.',
        review: 'Rate Us',
        reviewDesc: 'Rate your experience.',
        myFeedbacks: 'My Feedbacks',
        stats: 'My Stats',
        selectBranchForFeedback: 'Select branch to continue',
        changeInfo: 'Change',
        infoBox: 'Feedback is sent instantly to managers.',
        warningTitle: 'Important:',
        warningText: 'Vocalize delivers feedback instantly. Response time depends on the business.',
        visitedBusinesses: 'Visited Businesses',
        noVisitedBusiness: 'No businesses yet',
        startWithQR: 'Scan QR to start',
        home: 'Home',
        register: 'Sign Up',
        logout: 'Logout',
        supportItem: 'Support',
        branchSelection: 'Select Branch',
        cancel: 'Cancel',
        guestCTA: {
            feedbackTitle: "Sign Up",
            statsTitle: "Sign Up for Stats",
            subtext: "Guest data is not saved.",
            button: "Sign Up"
        },
        guestTracking: 'Track Feedback',
        guestTrackingDesc: 'Sign up to keep history.',
        guestWarning: {
            title: "⚠️ Guest Mode",
            text: "Feedback is not saved to profile.",
            dontShow: "Don't show",
            continueGuest: "Continue",
            loginToSend: "Sign In"
        },
        formType: 'Type', all: 'All', complaintBadge: 'Complaint', suggestionBadge: 'Suggestion', reviewBadge: 'Review',
        advancedFilter: 'Filter', branch: 'Branch', status: 'Status', sortBy: 'Sort', newest: 'Newest', oldest: 'Oldest',
        delivered: 'Sent', reviewing: 'Reviewing', resolved: 'Resolved',
        noFeedbacks: 'No feedbacks', sendFirstFeedback: 'Send your first feedback', sendFeedbackBtn: 'Send Feedback',
        feedbackDetail: 'Detail', yourMessage: 'Message', generalEval: 'General', attachedImages: 'Images', close: 'Close',
        support: { title: 'Support', email: 'Email', message: 'Message', images: 'Image', upload: 'Upload', send: 'Send', sending: '...' },
        businessSuggestion: { title: 'Suggest Business', businessName: 'Name', location: 'Location', suggest: 'Suggest' },
        statsPage: { noData: 'No data' }, userTitle: { newVoice: 'New Voice' }, userTitleInfo: { nextLevel: 'Next Level' }
    }
  };

  const t = texts[language] || texts.tr;

  // Analytics Hook
  useEffect(() => {
    if (!businessParam) return;
    if (lastLoggedRef.current.business === businessParam && lastLoggedRef.current.branch === branchParam) return;
    lastLoggedRef.current = { business: businessParam, branch: branchParam };
    supabase.from('page_views').insert({
      business_id: businessParam, branch_id: branchParam || null, source: (fromQrParam === 'true' || qrParam) ? 'qr' : 'web', user_agent: navigator.userAgent
    }).then(({ error }) => { if (error) console.warn("Analytics error:", error.message); });
  }, [businessParam, branchParam, qrParam, fromQrParam]);

  // ========== HİBRİT İŞLETME ÇEKME MANTIĞI ==========
  const fetchBusinesses = useCallback(async (currentUser) => {
    try {
      let visitedIds = [];

      // SENARYO 1: KULLANICI GİRİŞ YAPMIŞSA (Veritabanından Çek)
      if (currentUser) {
        const { data: scanData, error: scanError } = await supabase
          .from('customer_qr_scans')
          .select('business_id')
          .eq('user_id', currentUser.id); 

        if (!scanError && scanData) {
          visitedIds = [...new Set(scanData.map(item => item.business_id))];
        }
      } 
      // SENARYO 2: MİSAFİR İSE (LocalStorage'dan Çek)
      else {
        const visitedBusinessesJson = localStorage.getItem('vocalize_visited_businesses');
        visitedIds = visitedBusinessesJson ? JSON.parse(visitedBusinessesJson) : [];
      }
      
      if (!visitedIds || visitedIds.length === 0) {
        setBusinesses([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('businesses')
        .select('id, business_name')
        .in('id', visitedIds);
        
      if (error) throw error;
      setBusinesses(data || []);

    } catch (error) {
      console.error('Error fetching businesses:', error);
      setBusinesses([]);
    }
  }, []);

  // ========== INIT & AUTH HANDLING (ÇÖZÜM BURADA) ==========
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      // 1. Auth Yükleniyorsa Bekle (Race Condition Önlemi)
      if (authLoading) return;

      try {
        const guestMode = localStorage.getItem('vocalize_guest_mode');
        const isGuestUser = guestParam === 'true' || guestMode === 'true';
        setIsGuest(isGuestUser);

        if (authUser && !isGuestUser) {
          setUser(authUser);
          setSupportEmail(authUser.email || '');
          // Kullanıcıya özel verileri çek
          await fetchBusinesses(authUser);
        } else {
          // Misafir veya giriş yapmamış
          setUser(null);
          setSupportEmail('');
          await fetchBusinesses(null); // Parametre olarak null gönderiyoruz
        }

        // URL'den veya Hafızadan İşletme Seçimi
        let targetBusinessId = businessParam || localStorage.getItem('vocalize_last_business');
        let targetBranchId = branchParam || localStorage.getItem('vocalize_last_branch');

        if (targetBusinessId) {
             setSelectedBusiness(targetBusinessId);
             // Şubeleri çek
             const { data: branchData } = await supabase.from('branches')
                .select('id, branch_name_tr')
                .eq('business_id', targetBusinessId)
                .eq('is_active', true);
             if (branchData) setBranches(branchData);

             if (targetBranchId) setSelectedBranch(targetBranchId);
        }

        // QR Bilgisi Varsa İşle
        if (qrParam && branchParam) {
            setHasScannedQR(true);
            const { data } = await supabase.from('branches').select('branch_name_tr').eq('id', branchParam).single();
            if (data) setQrInfo({ business_id: businessParam, branch_id: branchParam, qr_code: qrParam, branch_name: data.branch_name_tr });
        }

      } catch (error) {
        console.error('Init Hatası:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    return () => { isMounted = false; };
  }, [authLoading, authUser, businessParam, branchParam, qrParam, guestParam, fetchBusinesses]);

  const fetchBranches = useCallback(async (businessId) => {
    if (!businessId) return;
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, branch_name_tr')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  // ... (fetchStats ve fetchFeedbacks fonksiyonları mevcut kodundaki gibi kalabilir) ...

  // ✅ KART TIKLAMA (Yükleniyor İkonlu)
  const handleBusinessCardClick = async (businessId) => {
    if (loadingBusinessId) return;
    setLoadingBusinessId(businessId);
    try {
      const { data, error } = await supabase.from('branches').select('id, branch_name_tr').eq('business_id', businessId).eq('is_active', true);
      if (error) throw error;
      if (!data?.length) { toast({ title: "Uyarı", description: "Şube bulunamadı.", variant: "destructive" }); return; }
      
      setBranches(data);
      setSelectedBusinessForBranches(businessId);
      setShowBranchSelector(true);
    } catch (e) {
      toast({ title: "Hata", description: "Şubeler yüklenemedi.", variant: "destructive" });
    } finally {
      setLoadingBusinessId(null);
    }
  };

  // ✅ ŞUBE SEÇİMİ (Yönlendirmesiz)
  const handleBranchSelectForFeedback = (branchId) => {
    setShowBranchSelector(false);
    setSelectedBusiness(selectedBusinessForBranches);
    setSelectedBranch(branchId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ FORMA YÖNLENDİRME
  const proceedToFeedback = (type) => {
    const targetBusiness = selectedBusiness || qrInfo?.business_id;
    const targetBranch = selectedBranch || qrInfo?.branch_id;

    if (!targetBusiness || !targetBranch) {
         toast({ title: "Seçim Yapın", description: "Lütfen önce işletme ve şube seçin.", variant: "destructive" });
         return;
    }

    const params = new URLSearchParams();
    params.set('type', type);
    params.set('business', targetBusiness);
    params.set('branch', targetBranch);
    if (isGuest) params.set('guest', 'true');
    if (qrInfo?.qr_code) params.set('qr', qrInfo.qr_code);
    params.set('lang', language);
    navigate(`/feedback?${params.toString()}`);
  };

  // ✅ KAYIT BUTONU (Gecikmeli Modal Açılışı)
  const handleRegisterClick = () => { 
    setShowSettingsModal(false);
    setShowGuestWarningModal(false);
    setTimeout(() => {
        setAuthDefaultTab('register'); 
        setAuthDefaultRole('customer');
        setShowAuthModal(true); 
    }, 300);
  };

  const handleFeedback = (type) => {
    if (isGuest && !localStorage.getItem('vocalize_guest_warning_dismissed')) {
        setPendingFeedbackType(type);
        setDontShowGuestWarning(false);
        setShowGuestWarningModal(true);
        return;
    }
    proceedToFeedback(type);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('vocalize_guest_mode');
    setUser(null);
    setIsGuest(false);
    navigate('/', { replace: true });
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-teal-500 mb-4" /><p className="text-slate-400 font-medium">Yükleniyor...</p></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white overflow-x-hidden relative">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400"><Menu /></button>
             <h1 className="text-xl font-bold">Vocalize</h1>
          </div>
          <div className="flex bg-slate-800 rounded p-1">
             <button onClick={() => setLanguage('tr')} className={`px-2 py-1 text-xs rounded ${language === 'tr' ? 'bg-teal-600' : 'text-slate-400'}`}>TR</button>
             <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs rounded ${language === 'en' ? 'bg-teal-600' : 'text-slate-400'}`}>EN</button>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 bg-slate-900 z-50 w-64 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden border-r border-slate-800`}>
         <div className="p-4 flex justify-between items-center border-b border-slate-800">
            <span className="font-bold">Menü</span>
            <button onClick={() => setSidebarOpen(false)}><X className="text-slate-400" /></button>
         </div>
         <nav className="p-4 space-y-2">
            <button onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded hover:bg-slate-800 flex gap-3"><Home className="w-5 h-5" /> Ana Sayfa</button>
            <button onClick={() => { setCurrentView('feedbacks'); setSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded hover:bg-slate-800 flex gap-3"><List className="w-5 h-5" /> Bildirimlerim</button>
            <button onClick={() => { setCurrentView('stats'); setSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded hover:bg-slate-800 flex gap-3"><TrendingUp className="w-5 h-5" /> İstatistikler</button>
            <button onClick={() => { setShowSettingsModal(true); setSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded hover:bg-slate-800 flex gap-3"><Settings className="w-5 h-5" /> Ayarlar</button>
         </nav>
      </aside>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8">
               <h1 className="text-2xl font-bold mb-2">{isGuest ? t.guestWelcome : `${t.welcome}`}</h1>
               <p className="text-slate-400 text-sm">{t.subtitle}</p>
            </div>

            {selectedBusiness ? (
               <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl mb-8">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="bg-green-500/20 p-3 rounded-full"><Building2 className="h-6 w-6 text-green-400" /></div>
                     <div>
                        <h3 className="font-bold text-lg">{businessName}</h3>
                        {branchName && <p className="text-green-300 text-sm">{branchName}</p>}
                        <button onClick={() => { setSelectedBusiness(''); setSelectedBranch(''); }} className="text-xs text-slate-400 underline mt-1">{t.changeInfo}</button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <button onClick={() => handleFeedback('complaint')} disabled={!selectedBranch} className={`p-6 rounded-xl text-left transition-all ${!selectedBranch ? 'bg-slate-800 opacity-50' : 'bg-red-600 hover:bg-red-700'}`}>
                        <AlertTriangle className="h-8 w-8 mb-3" />
                        <h3 className="font-bold text-lg mb-1">{t.complaint}</h3>
                        <p className="text-xs opacity-90">{t.complaintDesc}</p>
                     </button>
                     <button onClick={() => handleFeedback('suggestion')} disabled={!selectedBranch} className={`p-6 rounded-xl text-left transition-all ${!selectedBranch ? 'bg-slate-800 opacity-50' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        <Lightbulb className="h-8 w-8 mb-3" />
                        <h3 className="font-bold text-lg mb-1">{t.suggestion}</h3>
                        <p className="text-xs opacity-90">{t.suggestionDesc}</p>
                     </button>
                     <button onClick={() => handleFeedback('review')} disabled={!selectedBranch} className={`p-6 rounded-xl text-left transition-all ${!selectedBranch ? 'bg-slate-800 opacity-50' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        <Star className="h-8 w-8 mb-3" />
                        <h3 className="font-bold text-lg mb-1">{t.review}</h3>
                        <p className="text-xs opacity-90">{t.reviewDesc}</p>
                     </button>
                  </div>
                  
                  <div className="bg-red-950/30 border-l-4 border-red-500 p-4 rounded mt-6 flex gap-3">
                     <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                     <p className="text-xs text-red-200">{t.warningText}</p>
                  </div>
               </div>
            ) : (
               <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4">{t.visitedBusinesses}</h2>
                  {businesses.length === 0 ? (
                     <div className="text-center p-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                        <QrCode className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">{t.noVisitedBusiness}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.startWithQR}</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {businesses.map((biz) => (
                           <button key={biz.id} onClick={() => handleBusinessCardClick(biz.id)} disabled={loadingBusinessId === biz.id} className="bg-slate-800 p-5 rounded-xl text-left hover:bg-slate-700 border border-slate-700 relative overflow-hidden group">
                              {loadingBusinessId === biz.id && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>}
                              <div className="flex justify-between items-center mb-2">
                                 <Building2 className="text-teal-500" />
                                 <ChevronRight className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                              </div>
                              <h3 className="font-bold">{biz.business_name}</h3>
                              <p className="text-xs text-slate-400">{t.selectBranchForFeedback}</p>
                           </button>
                        ))}
                     </div>
                  )}
               </div>
            )}
            
            {isGuest && (selectedBusiness || businesses.length > 0) && (
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-4">
                  <UserPlus className="h-8 w-8 text-blue-400" />
                  <div className="flex-1">
                     <h3 className="font-bold text-sm text-blue-100">{t.guestTracking}</h3>
                     <p className="text-xs text-slate-400">{t.guestTrackingDesc}</p>
                  </div>
                  <Button onClick={handleRegisterClick} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">{t.register}</Button>
               </div>
            )}
          </div>
        )}
        
        {/* Feedbacks ve Stats bölümleri (Kısaltıldı - Tam kodda bu kısımlar mevcuttur) */}
      </main>

      {/* FOOTER NAV (Fixed) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-40">
         <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-teal-500' : 'text-slate-500'}`}><Home className="h-5 w-5" /><span className="text-[10px]">{t.home}</span></button>
         <button onClick={() => setCurrentView('feedbacks')} className={`flex flex-col items-center gap-1 ${currentView === 'feedbacks' ? 'text-teal-500' : 'text-slate-500'}`}><List className="h-5 w-5" /><span className="text-[10px]">{t.myFeedbacks}</span></button>
         <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 text-slate-500"><Settings className="h-5 w-5" /><span className="text-[10px]">Ayarlar</span></button>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authDefaultTab} defaultRole="customer" />
      
      <Dialog open={showBranchSelector} onOpenChange={setShowBranchSelector}>
         <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader><DialogTitle>{t.branchSelection}</DialogTitle></DialogHeader>
            <div className="space-y-2">
               {branches.map(b => (
                  <button key={b.id} onClick={() => handleBranchSelectForFeedback(b.id)} className="w-full p-3 bg-slate-800 rounded flex justify-between items-center hover:bg-slate-700">
                     <span>{b.branch_name_tr}</span>
                     <ChevronRight className="h-4 w-4" />
                  </button>
               ))}
            </div>
            <DialogFooter><Button onClick={() => setShowBranchSelector(false)} variant="ghost">{t.cancel}</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Settings Modal (Fixed Logout) */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
         <DialogContent className="bg-slate-900 border-slate-800 text-white h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Ayarlar</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-y-auto">
               {!isGuest ? (
                  <div className="space-y-4 py-4">
                     {/* Profil ayarları buraya... */}
                     <p className="text-slate-400 text-center text-sm">Hesap ayarlarınız burada listelenir.</p>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                     <p className="text-center text-slate-400">Misafir hesabındasınız.</p>
                     <Button onClick={handleRegisterClick} className="w-full bg-teal-600">{t.register}</Button>
                  </div>
               )}
            </div>
            <div className="pt-4 border-t border-slate-800">
               <Button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-slate-700 mb-2"><LogOut className="mr-2 h-4 w-4" /> {t.logout}</Button>
               <Button onClick={() => setShowSettingsModal(false)} variant="ghost" className="w-full">Kapat</Button>
            </div>
         </DialogContent>
      </Dialog>
      
      {/* Guest Warning Modal */}
      <Dialog open={showGuestWarningModal} onOpenChange={setShowGuestWarningModal}>
         <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader><DialogTitle>{t.guestWarning.title}</DialogTitle></DialogHeader>
            <p className="text-slate-300 text-sm">{t.guestWarning.text}</p>
            <div className="flex items-center gap-2 mt-2">
               <Checkbox id="dontShow" checked={dontShowGuestWarning} onCheckedChange={setDontShowGuestWarning} />
               <label htmlFor="dontShow" className="text-xs">{t.guestWarning.dontShow}</label>
            </div>
            <DialogFooter className="mt-4 gap-2">
               <Button variant="ghost" onClick={() => { 
                  if(dontShowGuestWarning) localStorage.setItem('vocalize_guest_warning_dismissed', 'true');
                  setShowGuestWarningModal(false); 
                  if(pendingFeedbackType) proceedToFeedback(pendingFeedbackType);
               }}>{t.guestWarning.continueGuest}</Button>
               <Button onClick={() => { setShowGuestWarningModal(false); handleRegisterClick(); }}>{t.guestWarning.loginToSend}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}