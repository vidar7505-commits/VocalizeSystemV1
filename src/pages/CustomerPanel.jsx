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
  MessageCircle, Loader2, Image as ImageIcon, Upload, PieChart, BarChart, Activity, UserPlus, LogIn,
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
  const [loadingBusinessId, setLoadingBusinessId] = useState(null); // YENİ: Kart yükleniyor durumu
  
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

  useEffect(() => {
    if (!businessParam) return;
    if (lastLoggedRef.current.business === businessParam && lastLoggedRef.current.branch === branchParam) return;

    lastLoggedRef.current = { business: businessParam, branch: branchParam };
    const source = (fromQrParam === 'true' || qrParam) ? 'qr' : 'web';

    supabase.from('page_views').insert({
      business_id: businessParam,
      branch_id: branchParam || null,
      source: source,
      user_agent: navigator.userAgent
    }).then(({ error }) => {
       if (error) console.warn("Analytics error:", error.message);
    });
  }, [businessParam, branchParam, qrParam, fromQrParam]);

  const texts = {
    // ... (Dil paketleri aynı kalabilir veya sadeleştirilebilir, yer tutmaması için kısalttım)
    tr: {
      welcome: 'Hoş Geldiniz',
      guestWelcome: 'Deneyiminizi Paylaşın',
      subtitle: 'Fikriniz değerli. İşletmelerin hizmet kalitesini artırmasına katkıda bulunun.',
      qrAutoDetect1: 'İşletmeyi bir kez QR ile doğruladığınızda, sonraki girişlerinizde işletme ve şube bilgileri otomatik olarak açılır.',
      qrAutoDetect2: 'Tekrar QR okutmanıza gerek kalmaz.',
      qrAutoDetect3: 'Bu doğrulama yalnızca seçtiğiniz işletme için geçerlidir.',
      sendFeedback: 'Geri Bildirim Gönderin',
      complaint: 'Şikayet Bildir',
      suggestion: 'Öneride Bulun',
      review: 'Değerlendir',
      complaintDesc: 'Bir sorun mu yaşadınız? Hemen bildirin!',
      suggestionDesc: 'Fikriniz var mı? Bize yazın!',
      reviewDesc: 'Deneyiminizi puanlayın!',
      myFeedbacks: 'Geri Bildirimlerim',
      stats: 'İstatistiklerim',
      selectBusiness: 'İşletme Seçin',
      selectBranch: 'Şube Seçin',
      selectPlaceholder: 'Seçiniz...',
      qrScanned: 'QR Kod İle Doğrulandı',
      qrInfo: (bName, brName) => `${bName} - ${brName}`,
      changeInfo: 'Değiştir',
      infoBox: 'Geri bildirimleriniz doğrudan işletme yöneticilerine anında iletilir ve aksiyon alınır.',
      warningTitle: 'Önemli Not:',
      warningText: 'Vocalize geri bildirimlerinizi işletme yöneticilerine anında iletir. Nihai geri dönüş süresi ve kararı tamamen işletmeye bağlıdır.',
      allFeedbacks: 'Yaptığınız Tüm Geri Bildirimlerinizi Burada Görüntüleyebilirsiniz',
      allStats: 'Tüm Zamanların İstatistiklerine Ulaşabilirsiniz',
      supportItem: 'Destek',
      logout: 'Çıkış Yap',
      total: 'Toplam Geri Bildirim Sayısı',
      avgRating: 'Puanlama Ortalaması',
      mostVisited: 'En Çok Geri Bildirim Yapılan İşletme',
      feedbackTypes: 'Form Türleri',
      complaintBadge: 'Şikayet',
      suggestionBadge: 'Öneri',
      reviewBadge: 'Değerlendirme',
      noFeedbacks: 'Henüz geri bildirim göndermediniz',
      sendFirstFeedback: 'İlk geri bildiriminizi gönderin ve deneyiminizi paylaşın!',
      sendFeedbackBtn: 'Geri Bildirim Gönder',
      all: 'Tümü',
      newest: 'En Yeni',
      oldest: 'En Eski',
      delivered: 'İletildi',
      reviewing: 'İnceleniyor',
      resolved: 'İşlendi',
      visits: 'ziyaret',
      guest: 'Misafir',
      register: 'Kayıt Ol',
      guestTracking: 'Geri bildirimlerinizi takip edin',
      guestTrackingDesc: 'Geri bildirim geçmişinizi kaybetmemek ve işletme yanıtlarını görebilmek için Kayıt Olun.',
      home: 'Ana Sayfa',
      notifications: 'Bildirimler',
      statistics: 'İstatistik',
      filterAllBranches: 'Tüm Şubeler',
      filterAllTypes: 'Tüm Türler',
      filterAllStatuses: 'Tüm Durumlar',
      changeEmail: 'E-posta Değiştir',
      changePhone: 'Telefon Değiştir',
      changePassword: 'Şifre Değiştir',
      createSupportTicket: 'Destek Talebi Oluştur',
      feedbackToVocalize: "Vocalize'a Geri Bildirim",
      deleteAccount: 'Hesabı Sil',
      deleteAccountTitle: 'Hesabı Silmek İstediğinize Emin misiniz?',
      deleteAccountWarning: 'Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.',
      deleteConfirm: 'Eminim, hesabımı silmek istiyorum',
      confirm: 'Onaylıyorum',
      cancel: 'İptal',
      unknown: 'Bilinmiyor',
      totalFeedbacksCount: 'Toplam geri bildirim',
      advancedFilter: 'Gelişmiş Filtreleme',
      formType: 'Form Biçimi',
      branch: 'İşletme/Şube',
      status: 'Durum',
      feedbackDetail: 'Bildirim Detayı',
      yourMessage: 'Mesajınız',
      attachedImages: 'Ekli Görseller',
      close: 'Kapat',
      generalEval: 'Genel Değerlendirme',
      guestCTA: {
        feedbackTitle: "Tüm Geçmiş Geri Bildirimlerinizi görmek için Kayıt Olun",
        statsTitle: "İstatistiklerinizi görmek için Kayıt Olun",
        subtext: "Misafir verileri kaydedilmez. Geçmiş bildiriminize ve istatistiklerinize ulaşmak için üye girişi yapmalısınız.",
        button: "Kayıt Ol"
      },
      guestWarning: {
        title: "⚠️ Misafir olarak devam ediyorsunuz",
        text: "Bu bildirim hesabınıza kaydedilmeyecek ve işletme size geri dönüş yapamayacaktır. Geri bildiriminizin takibi ve işletmenin sizinle iletişime geçebilmesi için Giriş Yaparak Gönderin.",
        dontShow: "Daha sonra gösterme",
        continueGuest: "Devam Et",
        loginToSend: "Giriş Yaparak Gönder"
      },
      support: {
        title: 'Destek Talebi Oluştur',
        description: 'Sorununuzu veya önerinizi detaylı bir şekilde açıklayın...',
        email: 'E-posta',
        message: 'Mesajınız',
        messagePlaceholder: 'Sorununuzu veya önerinizi detaylı bir şekilde açıklayın...',
        images: 'Görsel Yükleme (Opsiyonel)',
        upload: 'Görsel Yükle',
        send: 'Gönder',
        sending: 'Gönderiliyor...',
        successTitle: 'Destek talebiniz gönderildi!',
        successDesc: 'En kısa sürede dönüş yapacağız.',
        errorTitle: 'Hata',
        errorDesc: 'Bir hata oluştu, lütfen tekrar deneyin.',
        errorEmpty: 'Lütfen mesajınızı yazın.',
        errorEmail: 'Lütfen e-posta adresinizi girin.',
        maxImages: 'En fazla 3 görsel ekleyebilirsiniz.',
        imageUploaded: (count) => `${count} görsel yüklendi`
      },
      statsPage: {
        feedbackBreakdown: 'Geri Bildirim Dağılımı',
        ratingOverview: 'Puanlama Özeti',
        noData: 'Henüz veri bulunmamaktadır'
      },
      userTitle: {
        newVoice: 'Yeni Ses',
        experiencedObserver: 'Deneyimli Gözlemci',
        vocalizAmbassador: 'Vocalize Elçisi'
      },
      userTitleInfo: {
        newVoiceDesc: 'Yeni başlayan bir ses olarak, görüşlerini paylaştığın için teşekkür ederiz.',
        experiencedObserverDesc: 'Deneyimli gözlemci olarak, tutarlı geri bildirimler veriyorsun.',
        vocalizAmbassadorDesc: 'Vocalize Elçisi olarak, işletmelerin gelişmesine büyük katkı sağlıyorsun!',
        nextLevel: 'Bir Sonraki Seviye',
        nextLevelNewVoice: '6 bildirim daha yaparsan "Deneyimli Gözlemci" olacaksın!',
        nextLevelExperienced: '20 bildirim daha yaparsan "Vocalize Elçisi" olacaksın!',
        maxLevel: '🎉 Zaten en yüksek seviyedesin! Harika bir Elçisin!'
      },
      businessSuggestion: {
        title: 'Vocalize Burada Olsun İster misin?',
        businessName: 'İşletme Adı',
        businessNamePlaceholder: 'Örn: Kahve Dükkanı',
        location: 'Konum',
        locationPlaceholder: 'Örn: İstanbul, Beşiktaş',
        suggest: 'Öner',
        successMsg: 'Öneriniz başarıyla gönderildi!',
        errorMsg: 'Lütfen tüm alanları doldurunuz.'
      },
      visitedBusinesses: 'Ziyaret Edilen İşletmeler',
      noVisitedBusiness: 'Henüz bir işletme ziyaret etmediniz',
      startWithQR: 'QR kod okutarak başlayın ve geri bildirim gönderin',
      selectBranchForFeedback: 'Geri bildirim göndermek için şube seçin',
      loading: 'Yükleniyor...',
      branchSelection: 'Şube Seçimi',
      sortBy: 'Sıralama'
    },
    en: {
        // İngilizce çevirileri de mevcut yapında kalabilir
        welcome: 'Welcome',
        // ... (Diğer tüm EN metinleri aynen korunmalı)
        visitedBusinesses: 'Visited Businesses',
        noVisitedBusiness: 'No visited businesses yet',
        startWithQR: 'Scan a QR code to get started and send feedback',
        selectBranchForFeedback: 'Select a branch to send feedback',
        loading: 'Loading...',
        branchSelection: 'Branch Selection',
        sortBy: 'Sort By'
        // ...
    }
  };

  const t = texts[language] || texts.tr;

  // ... (useEffects aynen kalacak)

  // ========== HİBRİT İŞLETME ÇEKME MANTIĞI ==========
  const fetchBusinesses = useCallback(async () => {
    try {
      let visitedIds = [];

      // SENARYO 1: KULLANICI GİRİŞ YAPMIŞSA (Veritabanından Çek)
      if (user) {
        // 'customer_qr_scans' tablosundan bu kullanıcının okuttuğu işletmeleri çek
        const { data: scanData, error: scanError } = await supabase
          .from('customer_qr_scans')
          .select('business_id')
          .eq('user_id', user.id); 

        if (!scanError && scanData) {
          // Unique ID'leri filtrele
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
  }, [user]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

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

  // ... (fetchStats ve fetchFeedbacks aynen kalacak)

  // ✅ DÜZELTME: Kart Tıklama İşlemi (Loading Durumu Eklendi)
  const handleBusinessCardClick = async (businessId) => {
    if (loadingBusinessId) return; // Zaten yükleniyorsa tekrar tıklatma
    setLoadingBusinessId(businessId);
    
    try {
      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('id, branch_name_tr')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) throw error;

      if (!branchesData || branchesData.length === 0) {
        toast({ 
          title: language === 'tr' ? 'Uyarı' : 'Warning', 
          description: language === 'tr' ? 'Bu işletme için şube bulunamadı' : 'No branches found for this business',
          variant: "destructive"
        });
        return;
      }

      setBranches(branchesData);
      setSelectedBusinessForBranches(businessId);
      setShowBranchSelector(true);

    } catch (err) {
      console.error('Error loading branches:', err);
      toast({ 
        title: language === 'tr' ? 'Hata' : 'Error', 
        description: language === 'tr' ? 'Şubeler yüklenirken hata oluştu' : 'Error loading branches',
        variant: "destructive"
      });
    } finally {
        setLoadingBusinessId(null);
    }
  };

  // ✅ DÜZELTME: Şube Seçimi (Yönlendirme KALDIRILDI)
  const handleBranchSelectForFeedback = (branchId) => {
    setShowBranchSelector(false); // Modalı kapat
    setSelectedBusiness(selectedBusinessForBranches); // İşletmeyi seçili yap
    setSelectedBranch(branchId); // Şubeyi seçili yap
    
    // Yönlendirme YAPMA! (Böylece kullanıcı panelde kalır ve form butonları açılır)
    // Sadece ekranı yukarı kaydır ki formları görsün
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const proceedToFeedback = (type) => {
    if (!selectedBusiness && !fromQR) {
        toast({ title: t.warningTitle || "Uyarı", description: t.selectBusiness, className: "bg-slate-800 text-white border-none" });
        return;
    }
    const targetBusiness = selectedBusiness || qrInfo?.business_id;
    const targetBranch = selectedBranch || qrInfo?.branch_id;

    if (!targetBusiness || !targetBranch) {
         toast({ title: "Hata", description: "İşletme bilgisi eksik.", variant: "destructive" });
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

  // ... (handleFeedback, handleLogout aynen kalacak)

  // ✅ DÜZELTME: Kayıt Butonu (Timeout süresi artırıldı)
  const handleRegisterClick = () => { 
    setShowSettingsModal(false);
    setShowGuestWarningModal(false);
    
    // Gecikmeyi 300ms yaptık ki modal tamamen kapansın
    setTimeout(() => {
        setAuthDefaultTab('register'); 
        setAuthDefaultRole('customer');
        setShowAuthModal(true); 
    }, 300);
  };

  // ... (handleSupport, handleUpdate vs. aynen kalacak)

  if (isLoading) {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin h-10 w-10 text-teal-500 mb-4" /><p className="text-slate-400 font-medium">{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p></div>);
  }

  const logoUrl = "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/13d4a6d0cb60030e231821b7e8ea74ad.png";

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white overflow-x-hidden relative">
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 hover:bg-slate-800 rounded-lg transition-colors"><Menu className="h-6 w-6 text-slate-400 hover:text-white" /></button>
            <div className="flex items-center gap-3"><img src={logoUrl} alt="Vocalize" className="h-10 w-10 md:h-12 md:w-12 object-contain" /><h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Vocalize</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button onClick={() => setLanguage('tr')} className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors font-medium ${language === 'tr' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>TR</button>
              <button onClick={() => setLanguage('en')} className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors font-medium ${language === 'en' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-800 z-20 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <nav className="p-4 space-y-2 flex-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'dashboard' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home className="h-5 w-5" /><span>{t.home}</span></button>
          <button onClick={() => setCurrentView('feedbacks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'feedbacks' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><List className="h-5 w-5" /><span>{t.myFeedbacks}</span></button>
          <button onClick={() => setCurrentView('stats')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'stats' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><TrendingUp className="h-5 w-5" /><span>{t.stats}</span></button>
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2">
          <button onClick={() => setSupportModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"><MessageCircle className="h-5 w-5 text-teal-500" /><span>{t.supportItem}</span></button>
          <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"><Settings className="h-5 w-5" /><span>Ayarlar</span></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`min-h-screen bg-[#0f172a] transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'} pb-20 md:pb-6 flex flex-col justify-between`}>
        <div className="max-w-6xl mx-auto px-4 py-6 w-full">
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">{isGuest ? t.guestWelcome : `${t.welcome}${user?.user_metadata?.first_name ? ', ' + user.user_metadata.first_name : ''}`}</h1>
                <p className="text-slate-400 text-sm md:text-base">{t.subtitle}</p>
              </div>

              {/* === İŞLETME SEÇİLİYSE FORMLAR ÇIKSIN === */}
              {selectedBusiness ? (
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/50 p-6 rounded-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* ... (Seçili işletme gösterimi aynı) */}
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-full shrink-0"><Building2 className="h-8 w-8 text-green-400" /></div>
                    <div>
                      <h3 className="text-white font-bold text-lg break-words">{businessName || 'İşletme Seçili'}</h3>
                      {branchName && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-green-200 text-sm break-words">{branchName}</p>
                          {(qrParam && branchParam === selectedBranch) || (localStorage.getItem('vocalize_last_branch') === selectedBranch) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-xs font-semibold text-green-300 animate-pulse">
                              📍 {language === 'tr' ? 'Buradasınız' : 'You are here'}
                            </span>
                          ) : null}
                        </div>
                      )}
                      <button onClick={() => { setSelectedBusiness(''); setSelectedBranch(''); }} className="text-xs text-green-300 underline hover:text-green-200 mt-1 block">{t.changeInfo}</button>
                    </div>
                  </div>
                  
                  {/* ... (Kartlar aynı) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <button onClick={() => handleFeedback('complaint')} disabled={!selectedBranch} className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 text-left ${!selectedBranch ? 'bg-slate-800/50 border-2 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-br from-red-600 to-red-700 border-2 border-red-500 hover:scale-105 hover:shadow-2xl hover:shadow-red-900/50'}`}>
                      <div className="relative z-10"><div className="mb-4"><AlertTriangle className={`h-12 w-12 ${!selectedBranch ? 'text-slate-600' : 'text-white'}`} /></div><h3 className={`font-bold text-xl mb-2 ${!selectedBranch ? 'text-slate-500' : 'text-white'}`}>{t.complaint}</h3><p className={`text-sm ${!selectedBranch ? 'text-slate-600' : 'text-red-100'}`}>{t.complaintDesc}</p></div>
                      {!selectedBranch && <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"></div>}
                    </button>
                    <button onClick={() => handleFeedback('suggestion')} disabled={!selectedBranch} className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 text-left ${!selectedBranch ? 'bg-slate-800/50 border-2 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/50'}`}>
                      <div className="relative z-10"><div className="mb-4"><Lightbulb className={`h-12 w-12 ${!selectedBranch ? 'text-slate-600' : 'text-white'}`} /></div><h3 className={`font-bold text-xl mb-2 ${!selectedBranch ? 'text-slate-500' : 'text-white'}`}>{t.suggestion}</h3><p className={`text-sm ${!selectedBranch ? 'text-slate-600' : 'text-blue-100'}`}>{t.suggestionDesc}</p></div>
                      {!selectedBranch && <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"></div>}
                    </button>
                    <button onClick={() => handleFeedback('review')} disabled={!selectedBranch} className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 text-left ${!selectedBranch ? 'bg-slate-800/50 border-2 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-orange-400 hover:scale-105 hover:shadow-2xl hover:shadow-orange-900/50'}`}>
                      <div className="relative z-10"><div className="mb-4"><Star className={`h-12 w-12 ${!selectedBranch ? 'text-slate-600' : 'text-white'}`} /></div><h3 className={`font-bold text-xl mb-2 ${!selectedBranch ? 'text-slate-500' : 'text-white'}`}>{t.review}</h3><p className={`text-sm ${!selectedBranch ? 'text-slate-600' : 'text-orange-100'}`}>{t.reviewDesc}</p></div>
                      {!selectedBranch && <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"></div>}
                    </button>
                  </div>
                  
                  <div className="bg-red-950/30 border-2 border-red-500/50 rounded-xl p-5 mt-6 flex items-start gap-3"><AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" /><div><h4 className="text-red-300 font-semibold mb-1">{t.warningTitle}</h4><p className="text-sm text-red-200/80 leading-relaxed">{t.warningText}</p></div></div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-4 mb-6"><div className="text-slate-400 text-sm leading-relaxed text-center space-y-1"><p>{t.qrAutoDetect1}</p><p>{t.qrAutoDetect2}</p><p className="text-slate-500 text-xs opacity-70">{t.qrAutoDetect3}</p></div></div>
                  
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">{t.visitedBusinesses}</h2>
                    {businesses.length === 0 ? (
                      <EmptyStateVisitedBusinesses />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {businesses.map((biz) => (
                          <button
                            key={biz.id}
                            onClick={() => handleBusinessCardClick(biz.id)}
                            disabled={loadingBusinessId === biz.id} // ✅ Tıklamayı engelle
                            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/10 group text-left relative overflow-hidden"
                          >
                            {/* ✅ Yükleniyor Göstergesi */}
                            {loadingBusinessId === biz.id && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                    <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                                </div>
                            )}
                            <div className="flex items-start justify-between mb-4">
                              <div className="bg-teal-600/20 p-3 rounded-lg group-hover:bg-teal-600/30 transition"><Building2 className="h-6 w-6 text-teal-400" /></div>
                              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 transition-all group-hover:translate-x-1" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-300 transition-colors break-words line-clamp-2">{biz.business_name}</h3>
                            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{t.selectBranchForFeedback}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* ... (Footer InfoBox aynen kalacak) */}
                </>
              )}
              {/* ... (Misafir CTA aynen kalacak) */}
            </div>
          )}
          
          {/* ... (Feedbacks & Stats görünümleri aynen kalacak) */}
        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-40">
         <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-teal-500' : 'text-slate-500'}`}><Home className="h-6 w-6" /> <span className="text-[10px]">{t.home}</span></button>
         <button onClick={() => setCurrentView('feedbacks')} className={`flex flex-col items-center gap-1 ${currentView === 'feedbacks' ? 'text-teal-500' : 'text-slate-500'}`}><List className="h-6 w-6" /> <span className="text-[10px]">{t.myFeedbacks}</span></button>
         <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-teal-500' : 'text-slate-500'}`}><TrendingUp className="h-6 w-6" /> <span className="text-[10px]">{t.stats}</span></button>
         {/* ✅ AYARLAR BUTONU KESİN VAR */}
         <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 text-slate-500"><Settings className="h-6 w-6" /> <span className="text-[10px]">Ayarlar</span></button>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authDefaultTab} defaultRole="customer" />
      
      {/* BRANCH SELECTOR MODAL */}
      <Dialog open={showBranchSelector} onOpenChange={setShowBranchSelector}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl font-bold text-white"><Building2 className="h-6 w-6 text-teal-500" />{t.branchSelection}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            {branches.map((branch) => (
              <button key={branch.id} onClick={() => handleBranchSelectForFeedback(branch.id)} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 text-white p-4 rounded-lg transition-all text-left group">
                <div className="flex items-center justify-between"><span className="font-medium group-hover:text-teal-300 transition-colors">{branch.branch_name_tr}</span><ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 transition-all group-hover:translate-x-1" /></div>
              </button>
            ))}
          </div>
          <DialogFooter><Button onClick={() => setShowBranchSelector(false)} variant="outline" className="border-slate-700 hover:bg-slate-800 text-white w-full">{t.cancel}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* SETTINGS MODAL with LOGOUT FIXED */}
      <Dialog open={showSettingsModal} onOpenChange={(open) => { setShowSettingsModal(open); if (!open) setDeleteAccountConfirmed(false); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white"><Settings className="h-6 w-6 text-teal-500" />{language === 'tr' ? 'Ayarlar' : 'Settings'}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
             {/* İçerik aynı... */}
             {!isGuest ? (
                <>
                  {/* ... Profil/Güvenlik Tabları ... */}
                  {settingsTab === 'profile' && <div className="space-y-4">...</div>}
                  {settingsTab === 'security' && <div className="space-y-4">...</div>}
                  {settingsTab === 'account' && <div className="space-y-4">...</div>}
                </>
             ) : (
                <div className="flex flex-col items-center justify-center p-8">
                   {/* Guest View ... */}
                   <Button onClick={handleRegisterClick} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-base mb-4"><UserPlus className="mr-2 h-5 w-5" />{t.register}</Button>
                </div>
             )}
          </div>
          
          {/* ✅ FOOTER (SABİT ÇIKIŞ BUTONU) */}
          <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0 flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => { setShowSettingsModal(false); setSupportModalOpen(true); }} variant="outline" className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"><Send className="h-4 w-4 mr-2" />Destek</Button>
                <Button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"><LogOut className="h-4 w-4 mr-2" />Çıkış Yap</Button>
             </div>
             <Button onClick={() => setShowSettingsModal(false)} variant="ghost" className="w-full text-slate-500 hover:text-slate-300 hover:bg-transparent h-8 text-xs">Kapat</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ... Diğer Modallar (FeedbackDetail, Support vs.) aynen kalacak */}
    </div>
  );
}