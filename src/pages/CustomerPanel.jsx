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
  Send, AlertOctagon // AlertOctagon eklendi
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription // DialogDescription eklendi
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

  const businessParam = searchParams.get('business');
  const branchParam = searchParams.get('branch');
  const qrParam = searchParams.get('qr');
  const fromQrParam = searchParams.get('from_qr');
  const guestParam = searchParams.get('guest');

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
  
  // YENİ STATE: Hesap Silme Onay Modalı için
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
    tr: {
      welcome: 'Hoş Geldiniz',
      guestWelcome: 'Deneyiminizi Paylaşın',
      subtitle: 'Geri bildirimlerinizle işletmelerin gelişmesine yardımcı olun.',
      qrAutoDetect1: 'İşletmeyi bir kez QR ile doğruladığınızda, sonraki girişlerinizde işletme ve şube bilgileri otomatik olarak açılır.',
      qrAutoDetect2: 'Tekrar QR okutmanıza gerek kalmaz.',
      qrAutoDetect3: 'Bu doğrulama yalnızca seçtiğiniz işletme için geçerlidir.',
      sendFeedback: 'Geri Bildirim Gönderin',
      complaint: 'Şikayet Et!',
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
      warningText: 'Vocalize geri bildirimlerinizi anında yöneticilere iletir. Çözüm süreci ve nihai geri dönüş tamamen işletmeye bağlıdır.',
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
      guestTrackingDesc: 'Hesap oluşturarak gönderdiğiniz geri bildirimlerin durumunu takip edebilirsiniz.',
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
      welcome: 'Welcome',
      guestWelcome: 'Share Your Experience',
      subtitle: 'Help businesses improve with your feedback.',
      qrAutoDetect1: 'Once verified via QR, business info is saved.',
      qrAutoDetect2: 'No need to scan QR again.',
      qrAutoDetect3: 'Valid for selected business only.',
      sendFeedback: 'Send Feedback',
      complaint: 'Report Issue',
      suggestion: 'Suggest',
      review: 'Rate',
      complaintDesc: 'Experienced an issue? Report it now!',
      suggestionDesc: 'Have an idea? Let us know!',
      reviewDesc: 'Rate your experience!',
      myFeedbacks: 'My Feedbacks',
      stats: 'My Statistics',
      selectBusiness: 'Select Business',
      selectBranch: 'Select Branch',
      selectPlaceholder: 'Select...',
      qrScanned: 'Verified via QR Code',
      qrInfo: (bName, brName) => `${bName} - ${brName}`,
      changeInfo: 'Change',
      infoBox: 'Your feedback is instantly delivered to business managers.',
      warningTitle: 'Important Note:',
      warningText: 'Vocalize instantly delivers your feedback to managers.',
      allFeedbacks: 'All My Feedbacks',
      allStats: 'View Statistics for All Time',
      supportItem: 'Support',
      logout: 'Logout',
      total: 'Total Feedbacks',
      avgRating: 'Average Rating',
      mostVisited: 'Most Visited',
      feedbackTypes: 'Form Types',
      complaintBadge: 'Complaint',
      suggestionBadge: 'Suggestion',
      reviewBadge: 'Review',
      noFeedbacks: 'No feedbacks yet',
      sendFirstFeedback: 'Send your first feedback!',
      sendFeedbackBtn: 'Send Feedback',
      all: 'All',
      newest: 'Newest',
      oldest: 'Oldest',
      delivered: 'Delivered',
      reviewing: 'Reviewing',
      resolved: 'Resolved',
      visits: 'visits',
      guest: 'Guest',
      register: 'Sign Up',
      guestTracking: 'Track your feedbacks',
      guestTrackingDesc: 'Create an account to track feedbacks.',
      home: 'Home',
      notifications: 'Notifications',
      statistics: 'Statistics',
      filterAllBranches: 'All Branches',
      filterAllTypes: 'All Types',
      filterAllStatuses: 'All Statuses',
      changeEmail: 'Change Email',
      changePhone: 'Change Phone',
      changePassword: 'Change Password',
      createSupportTicket: 'Create Support Ticket',
      feedbackToVocalize: "Feedback to Vocalize",
      deleteAccount: 'Delete Account',
      deleteAccountTitle: 'Are you sure?',
      deleteAccountWarning: 'This action cannot be undone.',
      deleteConfirm: 'I want to delete my account',
      confirm: 'Confirm',
      cancel: 'Cancel',
      unknown: 'Unknown',
      totalFeedbacksCount: 'Total feedbacks',
      advancedFilter: 'Filter',
      formType: 'Form Type',
      branch: 'Branch',
      status: 'Status',
      feedbackDetail: 'Feedback Detail',
      yourMessage: 'Your Message',
      attachedImages: 'Attached Images',
      close: 'Close',
      generalEval: 'General Evaluation',
      guestCTA: {
        feedbackTitle: "Register to view past feedbacks",
        statsTitle: "Register to view statistics",
        subtext: "Guest data is not saved. Sign in to access history.",
        button: "Sign Up"
      },
      guestWarning: {
        title: "⚠️ Continuing as Guest",
        text: "Guest feedbacks are not saved to your profile.",
        dontShow: "Don't show again",
        continueGuest: "Continue",
        loginToSend: "Sign In"
      },
      support: {
        title: 'Support Ticket',
        description: 'Explain your issue...',
        email: 'Email',
        message: 'Message',
        messagePlaceholder: 'Explain in detail...',
        images: 'Images (Optional)',
        upload: 'Upload',
        send: 'Send',
        sending: 'Sending...',
        successTitle: 'Sent!',
        successDesc: 'We will reply soon.',
        errorTitle: 'Error',
        errorDesc: 'Try again.',
        errorEmpty: 'Message is empty.',
        errorEmail: 'Email is required.',
        maxImages: 'Max 3 images.',
        imageUploaded: (count) => `${count} uploaded`
      },
      statsPage: {
        feedbackBreakdown: 'Feedback Breakdown',
        ratingOverview: 'Rating Overview',
        noData: 'No data yet'
      },
      userTitle: {
        newVoice: 'New Voice',
        experiencedObserver: 'Experienced Observer',
        vocalizAmbassador: 'Vocalize Ambassador'
      },
      userTitleInfo: {
        newVoiceDesc: 'Thank you for sharing your voice as a newcomer.',
        experiencedObserverDesc: 'As an experienced observer, you are providing consistent feedback.',
        vocalizAmbassadorDesc: 'As a Vocalize Ambassador, you are making a huge impact!',
        nextLevel: 'Next Level',
        nextLevelNewVoice: '6 more feedbacks to become "Experienced Observer"!',
        nextLevelExperienced: '20 more feedbacks to become "Vocalize Ambassador"!',
        maxLevel: '🎉 You are already at the highest level! You are an amazing Ambassador!'
      },
      businessSuggestion: {
        title: 'Want Vocalize Here?',
        businessName: 'Business Name',
        businessNamePlaceholder: 'E.g.: Coffee Shop',
        location: 'Location',
        locationPlaceholder: 'E.g.: Istanbul, Besiktash',
        suggest: 'Suggest',
        successMsg: 'Your suggestion has been sent!',
        errorMsg: 'Please fill in all fields.'
      },
      visitedBusinesses: 'Visited Businesses',
      noVisitedBusiness: 'No visited businesses yet',
      startWithQR: 'Scan a QR code to get started and send feedback',
      selectBranchForFeedback: 'Select a branch to send feedback',
      loading: 'Loading...',
      branchSelection: 'Branch Selection',
      sortBy: 'Sort By'
    }
  };

  const t = useMemo(() => texts[language] || texts.tr, [language]);

  useEffect(() => {
    localStorage.setItem('vocalize_lang', language);
  }, [language]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      setIsLoading(true);
      try {
        const guestMode = localStorage.getItem('vocalize_guest_mode');
        const isGuestUser = guestParam === 'true' || guestMode === 'true';
        setIsGuest(isGuestUser);

        if (authUser && !isGuestUser) {
          setUser(authUser);
          setSupportEmail(authUser.email || '');
          
          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const metaName = authUser.user_metadata?.full_name ||
            (authUser.user_metadata?.first_name ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}` : '');

          setUserProfile({
            name: profile?.name || metaName || 'Kullanıcı',
            email: authUser.email,
            phone: profile?.phone || authUser.user_metadata?.phone
          });
        } else if (isGuestUser) {
          setUser(null);
          setSupportEmail('');
        }

        let targetBusinessId = businessParam;
        let targetBranchId = branchParam;

        if (!targetBusinessId) {
            const lastBusiness = localStorage.getItem('vocalize_last_business');
            if (lastBusiness) targetBusinessId = lastBusiness;
        }

        if (!targetBranchId && targetBusinessId) {
            const lastBranch = localStorage.getItem('vocalize_last_branch');
            if (lastBranch) targetBranchId = lastBranch;
        }

        if (qrParam) {
          setHasScannedQR(true);
          if (branchParam) {
            const { data: branchData } = await supabase.from('branches').select('branch_name_tr').eq('id', branchParam).single();
            if (branchData) {
              setQrInfo({ business_id: businessParam, branch_id: branchParam, qr_code: qrParam, branch_name: branchData.branch_name_tr });
            }
          }
        } else {
             if (targetBusinessId) {
                 setSelectedBusiness(targetBusinessId);
                 fetchBranches(targetBusinessId);
                 const newParams = new URLSearchParams(searchParams);
                 newParams.set('business', targetBusinessId);
                 if (targetBranchId) {
                     setSelectedBranch(targetBranchId);
                     newParams.set('branch', targetBranchId);
                 }
                 navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
             }
        }

        await fetchBusinesses();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [businessParam, branchParam, qrParam, guestParam, authUser, authLoading]);

  // ========== REFACTORED: localStorage FILTER ==========
  const fetchBusinesses = useCallback(async () => {
    try {
      // Get visited businesses from localStorage
      const visitedBusinessesJson = localStorage.getItem('vocalize_visited_businesses');
      const visitedIds = visitedBusinessesJson ? JSON.parse(visitedBusinessesJson) : [];
      
      // If no visited businesses, return empty state
      if (!visitedIds || visitedIds.length === 0) {
        setBusinesses([]);
        return;
      }
      
      // Fetch only visited businesses from Supabase
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

  const fetchStats = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from('feedbacks')
        .select('rating, feedback_type, branch_id, created_at, branches(branch_name_tr)')
        .eq('customer_email', user.email);

      if (feedbacksError) throw feedbacksError;

      if (!feedbacks || feedbacks.length === 0) { 
        setStats({ 
          total: 0, avgRating: 0, topBranch: '', topBranchCount: 0, 
          complaints: 0, suggestions: 0, reviews: 0,
          worstBranch: '', worstBranchCount: 0, userTitle: ''
        }); 
        return; 
      }

      const total = feedbacks.length;
      const ratingsOnly = feedbacks.filter(f => f.rating);
      const avgRating = ratingsOnly.length > 0 ? ratingsOnly.reduce((sum, f) => sum + f.rating, 0) / ratingsOnly.length : 0;
      
      const branchCounts = {};
      feedbacks.forEach(f => { 
        const branchName = f.branches?.branch_name_tr || t.unknown; 
        branchCounts[branchName] = (branchCounts[branchName] || 0) + 1; 
      });
      const topBranch = Object.keys(branchCounts).sort((a, b) => branchCounts[b] - branchCounts[a])[0] || '';
      const topBranchCount = branchCounts[topBranch] || 0;
      
      const complaints = feedbacks.filter(f => f.feedback_type === 'complaint').length;
      const suggestions = feedbacks.filter(f => f.feedback_type === 'suggestion').length;
      const reviews = feedbacks.filter(f => f.feedback_type === 'review').length;
      
      const complaintsByBranch = {};
      feedbacks
        .filter(f => f.feedback_type === 'complaint')
        .forEach(f => {
          const branchName = f.branches?.branch_name_tr || t.unknown;
          complaintsByBranch[branchName] = (complaintsByBranch[branchName] || 0) + 1;
        });
      const worstBranch = Object.keys(complaintsByBranch).sort((a, b) => complaintsByBranch[b] - complaintsByBranch[a])[0] || '';
      const worstBranchCount = complaintsByBranch[worstBranch] || 0;
      
      let userTitle = t.userTitle.newVoice;
      if (total >= 6 && total < 20) {
        userTitle = t.userTitle.experiencedObserver;
      } else if (total >= 20) {
        userTitle = t.userTitle.vocalizAmbassador;
      }

      setStats({ 
        total, avgRating, topBranch, topBranchCount, 
        complaints, suggestions, reviews,
        worstBranch, worstBranchCount, userTitle
      });
    } catch (error) { 
      console.error('Error fetching stats:', error); 
    }
  }, [user, t]);

  const fetchFeedbacks = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, customer_email, message, rating, general_eval_rating, general_eval_comment, feedback_type, status, created_at, feedback_images, branch_id, branches(branch_name_tr)')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('✅ Fetched feedbacks successfully:', data?.length || 0, 'items');
      if (data && data.length > 0) {
        console.log('📋 Sample feedback:', {
          rating: data[0].rating,
          general_eval_rating: data[0].general_eval_rating,
          has_general_eval: !!(data[0].general_eval_rating || data[0].general_eval_comment)
        });
      }
      setFeedbackList(data || []);
    } catch (error) { 
      console.error('❌ Error fetching feedbacks:', error);
      console.error('Error details:', error.message, error.details, error.hint);
    }
  }, [user]);

  useEffect(() => {
    if (!isGuest && user) {
      if(currentView === 'stats') {
        fetchStats();
      }
      if(currentView === 'feedbacks') {
        fetchFeedbacks();
      }
    } else if (isGuest) {
      setFeedbackList([]);
      setStats({ 
        total: 0, avgRating: 0, topBranch: '', topBranchCount: 0, 
        complaints: 0, suggestions: 0, reviews: 0,
        worstBranch: '', worstBranchCount: 0, userTitle: ''
      });
    }
  }, [isGuest, user, currentView, fetchStats, fetchFeedbacks]);

  // ========== REFACTORED: BUSINESS CARD CLICK HANDLER (Guest Navigation Fix) ==========
  const handleBusinessCardClick = async (businessId) => {
    try {
      // Fetch branches for this business
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

      // Set branches and show branch selector
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
    }
  };

  // Handle branch selection from modal
  const handleBranchSelectForFeedback = (branchId) => {
    setShowBranchSelector(false);
    
    // Navigate to feedback form with selected business and branch
    const params = new URLSearchParams();
    params.set('business', selectedBusinessForBranches);
    params.set('branch', branchId);
    params.set('lang', language);
    if (isGuest) params.set('guest', 'true');
    
    navigate(`/feedback?${params.toString()}`);
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

  const handleFeedback = (type) => {
    if (isGuest) {
      const dismissed = localStorage.getItem('vocalize_guest_warning_dismissed');
      if (!dismissed) {
        setPendingFeedbackType(type);
        setDontShowGuestWarning(false);
        setShowGuestWarningModal(true);
        return;
      }
    }
    proceedToFeedback(type);
  };
  
  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      localStorage.removeItem('vocalize_guest_mode');
      localStorage.removeItem('vocalize_guest_business_id');
      localStorage.removeItem('vocalize_guest_branch_id');
      localStorage.removeItem('vocalize_guest_warning_dismissed');
      setUser(null);
      setIsGuest(false);
      setDeleteAccountConfirmed(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleRegisterClick = () => { setAuthDefaultTab('register'); setShowAuthModal(true); };
  const handleGuestWarningContinue = () => { if (dontShowGuestWarning) localStorage.setItem('vocalize_guest_warning_dismissed', 'true'); setShowGuestWarningModal(false); if (pendingFeedbackType) proceedToFeedback(pendingFeedbackType); };
  const handleGuestWarningLogin = () => { setShowGuestWarningModal(false); setAuthDefaultTab('login'); setShowAuthModal(true); };
  
  const handleSupportImageChange = (e) => { const files = Array.from(e.target.files); if (files.length + supportImages.length > 3) { toast({ title: t.support.errorTitle, description: t.support.maxImages, variant: "destructive" }); return; } setSupportImages([...supportImages, ...files]); };
  const removeImage = (index) => { setSupportImages(prev => prev.filter((_, i) => i !== index)); };
  
  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const file of supportImages) {
      const fileName = `support/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error } = await supabase.storage.from('feedback-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('feedback-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSupportSubmit = async (e) => { e.preventDefault(); if (!supportMessage.trim()) { toast({ title: t.support.errorTitle, description: t.support.errorEmpty, variant: "destructive" }); return; } setSupportLoading(true); try { const imageUrls = await uploadImages(); const { error } = await supabase.from('vocalize_support_tickets').insert({ email: supportEmail, message: supportMessage, images: imageUrls, origin: 'customer_panel' }); if (error) throw error; toast({ title: t.support.successTitle, description: t.support.successDesc, className: "bg-teal-600 text-white border-none" }); setSupportModalOpen(false); setSupportMessage(''); setSupportImages([]); } catch (err) { toast({ title: t.support.errorTitle, description: t.support.errorDesc, variant: "destructive" }); } finally { setSupportLoading(false); } };

  const handleBusinessSuggestion = async (e) => {
    e.preventDefault();
    
    if (!suggestedBusinessName.trim() || !suggestedBusinessLocation.trim()) {
      toast({ 
        title: t.businessSuggestion.errorMsg, 
        variant: "destructive" 
      });
      return;
    }

    setSuggestingBusiness(true);
    try {
      const { error } = await supabase.from('vocalize_support_tickets').insert({
        email: user?.email || 'guest@vocalize.app',
        message: `[İŞLETME ÖNERİSİ]\nİsim: ${suggestedBusinessName}\nKonum: ${suggestedBusinessLocation}`,
        images: [],
        origin: 'business_suggestion'
      });

      if (error) throw error;

      toast({ 
        title: t.businessSuggestion.successMsg, 
        className: "bg-teal-600 text-white border-none" 
      });

      setSuggestedBusinessName('');
      setSuggestedBusinessLocation('');
    } catch (err) {
      console.error('Error:', err);
      toast({ 
        title: language === 'tr' ? 'Hata' : 'Error', 
        description: language === 'tr' ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'An error occurred, please try again.',
        variant: "destructive" 
      });
    } finally {
      setSuggestingBusiness(false);
    }
  };

  // --- SETTINGS HANDLERS ---

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

  const handleSoftDeleteAccount = async () => {
    if (!deleteAccountConfirmed) {
      toast({ 
        title: language === 'tr' ? 'Hata' : 'Error', 
        description: language === 'tr' ? 'Lütfen onay kutusunu işaretleyin' : 'Please check the confirmation box', 
        variant: "destructive" 
      });
      return;
    }
    
    if (!user?.id) return;
    
    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;
      
      toast({ 
        title: language === 'tr' ? 'Hesap Silindi' : 'Account Deleted', 
        description: language === 'tr' ? 'Verileriniz anonimleştirildi ve hesabınız kapatıldı.' : 'Your data has been anonymized and account closed.', 
        className: "bg-red-600 text-white border-none" 
      });
      
      setShowSettingsModal(false);
      setShowDeleteConfirmModal(false); // Modal'ı da kapat
      
      await signOut();
      
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('Delete account error:', err);
      toast({ 
        title: language === 'tr' ? 'Hata' : 'Error', 
        description: err.message || (language === 'tr' ? 'Hesap silinirken bir hata oluştu.' : 'An error occurred while deleting account.'), 
        variant: "destructive" 
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const filteredAndSortedFeedbacks = useMemo(() => {
    let filtered = feedbackList;
    if (filterBranch !== 'all') filtered = filtered.filter(f => f.branches?.branch_name_tr === filterBranch);
    if (filterType !== 'all') filtered = filtered.filter(f => f.feedback_type === filterType);
    if (filterStatus !== 'all') {
      filtered = filtered.filter(f => {
        const isOld = isOlderThan48Hours(f.created_at);
        let statusKey = 'new';
        if (f.status === 'resolved' || f.status === 'auto_resolved' || isOld) statusKey = 'resolved';
        else if (f.status === 'viewed' || f.status === 'in_progress') statusKey = 'in_progress';
        return filterStatus === statusKey;
      });
    }
    return [...filtered].sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [feedbackList, filterBranch, filterType, filterStatus, sortOrder]);

  const uniqueBranches = useMemo(() => [...new Set(feedbackList.map(f => f.branches?.branch_name_tr).filter(Boolean))], [feedbackList]);
  const activeFilterCount = [filterBranch !== 'all', filterStatus !== 'all'].filter(Boolean).length;

  const GuestCTA = ({ title, icon }) => (
    <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-800/80 p-6 rounded-full inline-flex mb-6">{icon || <UserPlus className="h-10 w-10 text-teal-500" />}</div>
      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 break-words">{title}</h3>
      <p className="text-slate-400 mb-8 max-w-lg mx-auto break-words leading-relaxed">{t.guestCTA.subtext}</p>
      <Button onClick={handleRegisterClick} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-lg hover:scale-105"><UserPlus className="mr-2 h-5 w-5" /> {t.guestCTA.button}</Button>
    </div>
  );

  // ========== REFACTORED: EMPTY STATE COMPONENT ==========
  const EmptyStateVisitedBusinesses = () => (
    <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-12 md:p-16 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-800/80 p-8 rounded-full inline-flex mb-6 shadow-lg">
        <QrCode className="h-12 w-12 text-teal-500 animate-pulse" />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 break-words">{t.noVisitedBusiness}</h3>
      <p className="text-slate-400 mb-2 max-w-lg mx-auto break-words leading-relaxed text-base">
        {t.startWithQR}
      </p>
      <p className="text-slate-500 text-sm max-w-lg mx-auto break-words leading-relaxed">
        {language === 'tr' ? 'İşletmelerin QR kodlarını okutarak başlayabilirsiniz.' : 'You can get started by scanning QR codes from businesses.'}
      </p>
    </div>
  );

  if (isLoading) {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin h-10 w-10 text-teal-500 mb-4" /><p className="text-slate-400 font-medium">{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p></div>);
  }

  const logoUrl = "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/13d4a6d0cb60030e231821b7e8ea74ad.png";

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white overflow-x-hidden relative">
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
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-full shrink-0"><Building2 className="h-8 w-8 text-green-400" /></div>
                    <div>
                      <h3 className="text-white font-bold text-lg break-words">{businessName || 'İşletme Seçili'}</h3>
                      {branchName && <p className="text-green-200 text-sm break-words">{branchName}</p>}
                      <button onClick={() => { setSelectedBusiness(''); setSelectedBranch(''); }} className="text-xs text-green-300 underline hover:text-green-200 mt-1 block">{t.changeInfo}</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <button onClick={() => handleFeedback('complaint')} className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl hover:bg-red-500/30 transition-all flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                        <div className="text-left">
                            <h3 className="font-bold text-red-200">{t.complaint}</h3>
                            <p className="text-xs text-red-300/80">{t.complaintDesc}</p>
                        </div>
                    </button>
                    <button onClick={() => handleFeedback('suggestion')} className="bg-blue-500/20 border border-blue-500/50 p-4 rounded-xl hover:bg-blue-500/30 transition-all flex items-center gap-3">
                        <Lightbulb className="h-6 w-6 text-blue-400" />
                        <div className="text-left">
                            <h3 className="font-bold text-blue-200">{t.suggestion}</h3>
                            <p className="text-xs text-blue-300/80">{t.suggestionDesc}</p>
                        </div>
                    </button>
                    <button onClick={() => handleFeedback('review')} className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-xl hover:bg-yellow-500/30 transition-all flex items-center gap-3">
                        <Star className="h-6 w-6 text-yellow-400" />
                        <div className="text-left">
                            <h3 className="font-bold text-yellow-200">{t.review}</h3>
                            <p className="text-xs text-yellow-300/80">{t.reviewDesc}</p>
                        </div>
                    </button>
                  </div>
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
                            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/10 group text-left"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="bg-teal-600/20 p-3 rounded-lg group-hover:bg-teal-600/30 transition">
                                <Building2 className="h-6 w-6 text-teal-400" />
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 transition-all group-hover:translate-x-1" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-300 transition-colors break-words line-clamp-2">
                              {biz.business_name}
                            </h3>
                            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                              {t.selectBranchForFeedback}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {businesses.length > 0 && (
                    <>
                      <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-4 my-8">
                        <div className="text-slate-400 text-sm leading-relaxed text-center">
                          <p>{t.infoBox}</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {isGuest && businesses.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mt-8">
                  <div className="flex items-start gap-4">
                    <Info className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-white font-semibold mb-2">{t.guestTracking}</h3>
                      <p className="text-slate-300 text-sm mb-4 break-words">{t.guestTrackingDesc}</p>
                      <button onClick={handleRegisterClick} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">{t.register}</button>
                    </div>
                  </div>
                </div>
              )}

              {businesses.length > 0 && (
                <div className="mt-8 bg-red-500/20 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 break-words leading-relaxed">{t.warningText}</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'feedbacks' && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8"><h1 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">{t.myFeedbacks}</h1><p className="text-slate-400">{t.allFeedbacks}</p></div>
              {isGuest ? <GuestCTA title={t.guestCTA.feedbackTitle} /> : (
                <>
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 flex-1">
                      <div className="flex flex-col w-full md:max-w-xs"><label className="text-xs text-slate-400 mb-1 font-semibold uppercase ml-1">{t.formType}</label><div className="relative"><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none pr-10 font-medium"><option value="all">{t.all}</option><option value="complaint">🔴 {t.complaintBadge}</option><option value="suggestion">💡 {t.suggestionBadge}</option><option value="review">⭐ {t.reviewBadge}</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" /></div></div>
                    </div>
                    {/* --- GÜNCELLENEN KISIM: POPOVER EKLENDİ --- */}
                    <div className="w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeFilterCount > 0 ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-900/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}>
                                    <Filter className="h-4 w-4" /><span>{t.advancedFilter}</span>{activeFilterCount > 0 && <span className="bg-white text-teal-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{activeFilterCount}</span>}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-slate-800 border-slate-700 text-white p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm text-slate-300">{t.branch}</h4>
                                        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                            <option value="all">{t.filterAllBranches}</option>
                                            {uniqueBranches.map(b => (<option key={b} value={b}>{b}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm text-slate-300">{t.status}</h4>
                                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                            <option value="all">{t.filterAllStatuses}</option>
                                            <option value="new">{t.delivered}</option>
                                            <option value="in_progress">{t.reviewing}</option>
                                            <option value="resolved">{t.resolved}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm text-slate-300">{t.sortBy}</h4>
                                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                            <option value="newest">{t.newest}</option>
                                            <option value="oldest">{t.oldest}</option>
                                        </select>
                                    </div>
                                    <div className="pt-2">
                                        <Button variant="outline" size="sm" onClick={() => { setFilterBranch('all'); setFilterStatus('all'); setSortOrder('newest'); }} className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-8 text-xs">{t.cancel}</Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                  </div>

                  {feedbackList.length === 0 ? (
                    <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-12 text-center"><MessageSquare className="h-16 w-16 text-slate-600 mx-auto mb-4" /><h3 className="text-xl font-semibold text-white mb-2 break-words">{t.noFeedbacks}</h3><p className="text-slate-400 mb-6 break-words">{t.sendFirstFeedback}</p><button onClick={() => setCurrentView('dashboard')} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition">{t.sendFeedbackBtn}</button></div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAndSortedFeedbacks.length === 0 ? <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800"><Filter className="h-12 w-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 font-medium">Seçilen filtrelerle eşleşen geri bildirim bulunamadı.</p></div> : filteredAndSortedFeedbacks.map((feedback) => (
                        <div key={feedback.id} className="bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 transition-all cursor-pointer active:scale-[0.99] flex flex-col" onClick={() => setSelectedFeedback(feedback)}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3 gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${feedback.feedback_type === 'complaint' ? 'bg-red-500/10 text-red-400 border-red-500/20' : feedback.feedback_type === 'suggestion' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{feedback.feedback_type === 'complaint' ? `🔴 ${t.complaintBadge}` : feedback.feedback_type === 'suggestion' ? `💡 ${t.suggestionBadge}` : `⭐ ${t.reviewBadge}`}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${getStatusBadge(feedback, t).color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : getStatusBadge(feedback, t).color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{getStatusBadge(feedback, t).icon} {getStatusBadge(feedback, t).label}</span>
                                {(feedback.general_eval_rating || feedback.general_eval_comment) && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border bg-teal-500/10 text-teal-400 border-teal-500/20">
                                    🌟 {language === 'tr' ? 'Genel Değ.' : 'Gen. Eval.'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {feedback.feedback_images?.length > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700 text-xs text-teal-500 whitespace-nowrap">
                                    <ImageIcon className="h-3 w-3 flex-shrink-0" />
                                    <span>{feedback.feedback_images.length}</span>
                                  </div>
                                )}
                                <span className="text-sm text-slate-500 whitespace-nowrap">{formatDate(feedback.created_at, language)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-2 break-words">📍 {feedback.branches?.branch_name_tr || t.unknown}</p>
                            {feedback.rating && <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />)}</div>}
                            {feedback.message && <p className="text-slate-300 text-sm line-clamp-2 break-words">{feedback.message}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentView === 'stats' && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold text-white break-words">{t.stats}</h1>
                  {!isGuest && stats.userTitle && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="bg-teal-600/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap animate-in fade-in zoom-in-75 duration-500 hover:bg-teal-600/30 transition-all cursor-pointer group relative">
                          ✨ {stats.userTitle} <HelpCircle className="inline ml-1 h-3 w-3 opacity-70 group-hover:opacity-100" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="bg-slate-900 border-slate-800 text-white p-4 w-80 shadow-lg">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-teal-400 text-lg">{stats.userTitle}</h4>
                            <p className="text-sm text-slate-400 mt-1">
                              {stats.userTitle === t.userTitle.newVoice && t.userTitleInfo.newVoiceDesc}
                              {stats.userTitle === t.userTitle.experiencedObserver && t.userTitleInfo.experiencedObserverDesc}
                              {stats.userTitle === t.userTitle.vocalizAmbassador && t.userTitleInfo.vocalizAmbassadorDesc}
                            </p>
                          </div>
                          
                          <div className="border-t border-slate-700 pt-3">
                            <h5 className="text-sm font-semibold text-white mb-2">
                              {t.userTitleInfo.nextLevel}
                            </h5>
                            {stats.userTitle === t.userTitle.newVoice && (
                              <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm">
                                <p className="text-slate-300">
                                  {language === 'tr' 
                                    ? `${6 - stats.total} bildirim daha yaparsan "Deneyimli Gözlemci" olacaksın!`
                                    : `${6 - stats.total} more feedbacks to become "Experienced Observer"!`}
                                </p>
                              </div>
                            )}
                            {stats.userTitle === t.userTitle.experiencedObserver && (
                              <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm">
                                <p className="text-slate-300">
                                  {language === 'tr' 
                                    ? `${20 - stats.total} bildirim daha yaparsan "Vocalize Elçisi" olacaksın!`
                                    : `${20 - stats.total} more feedbacks to become "Vocalize Ambassador"!`}
                                </p>
                              </div>
                            )}
                            {stats.userTitle === t.userTitle.vocalizAmbassador && (
                              <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm">
                                <p className="text-slate-300 font-semibold">
                                  {t.userTitleInfo.maxLevel}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {/* --- GÜNCELLENEN KISIM: SAĞ ÜSTTEKİ SAYAÇ KALDIRILDI --- */}
              </div>

              {isGuest ? (
                <GuestCTA title={t.guestCTA.statsTitle} icon={<TrendingUp className="h-10 w-10 text-teal-500" />} />
              ) : stats.total === 0 ? (
                <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
                  <BarChart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium text-lg">{t.statsPage.noData}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-lg flex flex-col items-center justify-center hover:border-slate-700 transition-colors">
                    <div style={{
                      background: `conic-gradient(
                        rgb(239, 68, 68) 0deg ${((stats.complaints / stats.total) * 360)}deg,
                        rgb(59, 130, 246) ${((stats.complaints / stats.total) * 360)}deg ${(((stats.complaints + stats.suggestions) / stats.total) * 360)}deg,
                        rgb(234, 179, 8) ${(((stats.complaints + stats.suggestions) / stats.total) * 360)}deg 360deg
                      )`
                    }} className="w-48 h-48 rounded-full flex items-center justify-center mb-6 relative shadow-lg">
                      <div className="w-40 h-40 rounded-full bg-slate-900 flex flex-col items-center justify-center border-4 border-slate-900">
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-slate-400 mt-1">{t.totalFeedbacksCount}</p>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                        <span className="text-sm text-slate-300">{t.complaintBadge}: {stats.complaints}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                        <span className="text-sm text-slate-300">{t.suggestionBadge}: {stats.suggestions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                        <span className="text-sm text-slate-300">{t.reviewBadge}: {stats.reviews}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-yellow-500/30 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300 group-hover:text-yellow-300 transition-colors">{t.avgRating}</h3>
                        <Star className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-3xl font-bold text-white mb-1">{stats.avgRating ? stats.avgRating.toFixed(1) : '0.0'}</p>
                      <p className="text-xs text-slate-500">/5.0</p>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-green-500/30 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300 group-hover:text-green-300 transition-colors">{t.mostVisited}</h3>
                        <MapPin className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-base font-bold text-white truncate mb-1" title={stats.topBranch}>{stats.topBranch || t.unknown}</p>
                      <p className="text-xs text-slate-500">{stats.topBranchCount} {t.visits}</p>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-red-500/30 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300 group-hover:text-red-300 transition-colors">{language === 'tr' ? 'En Çok Sorun' : 'Most Issues'}</h3>
                        <AlertTriangle className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-base font-bold text-white truncate mb-1" title={stats.worstBranch}>{stats.worstBranch || t.unknown}</p>
                      <p className="text-xs text-slate-500">{stats.worstBranchCount} {t.complaintBadge}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-teal-600/20 to-teal-700/10 border border-teal-500/30 rounded-xl p-6 shadow-lg hover:border-teal-500/50 transition-all duration-300">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-teal-400" />
                      {t.businessSuggestion.title}
                    </h3>
                    <form onSubmit={handleBusinessSuggestion} className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-300 font-semibold mb-1.5 block">{t.businessSuggestion.businessName}</label>
                        <Input type="text" placeholder={t.businessSuggestion.businessNamePlaceholder} value={suggestedBusinessName} onChange={(e) => setSuggestedBusinessName(e.target.value)} className="bg-slate-800/80 border-slate-700 text-white text-sm focus:border-teal-500 focus:ring-teal-500/20" required />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-semibold mb-1.5 block">{t.businessSuggestion.location}</label>
                        <Input type="text" placeholder={t.businessSuggestion.locationPlaceholder} value={suggestedBusinessLocation} onChange={(e) => setSuggestedBusinessLocation(e.target.value)} className="bg-slate-800/80 border-slate-700 text-white text-sm focus:border-teal-500 focus:ring-teal-500/20" required />
                      </div>
                      <Button type="submit" disabled={suggestingBusiness} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-4 shadow-lg shadow-teal-900/20 hover:shadow-teal-900/40 transition-all">
                        {suggestingBusiness ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 mr-2" />
                            {t.businessSuggestion.suggest}
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-30">
        <div className="flex items-center justify-around py-3">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'dashboard' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><Home className="h-6 w-6" /><span className="text-xs font-medium">{t.home}</span></button>
          <button onClick={() => setCurrentView('feedbacks')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'feedbacks' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><List className="h-6 w-6" /><span className="text-xs font-medium">{t.notifications}</span></button>
          <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'stats' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><TrendingUp className="h-6 w-6" /><span className="text-xs font-medium">{t.statistics}</span></button>
          <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400 hover:text-white transition-colors"><Settings className="h-6 w-6" /><span className="text-xs font-medium">Ayarlar</span></button>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authDefaultTab} defaultRole="customer" />
      
      {/* BRANCH SELECTOR MODAL FOR CARD CLICK */}
      <Dialog open={showBranchSelector} onOpenChange={setShowBranchSelector}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Building2 className="h-6 w-6 text-teal-500" />
              {t.branchSelection}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleBranchSelectForFeedback(branch.id)}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 text-white p-4 rounded-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium group-hover:text-teal-300 transition-colors">
                    {branch.branch_name_tr}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 transition-all group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowBranchSelector(false)}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 text-white w-full"
            >
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedFeedback} onOpenChange={() => {
        setSelectedFeedback(null);
        setPreviewImage(null);
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
            <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                   <MessageCircle className="h-6 w-6 text-teal-500" />
                   {t.feedbackDetail}
                </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 w-full">
            {selectedFeedback && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800 flex-wrap gap-2">
                        <div className="flex gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${selectedFeedback.feedback_type === 'complaint' ? 'bg-red-500/10 text-red-400 border-red-500/20' : selectedFeedback.feedback_type === 'suggestion' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                {selectedFeedback.feedback_type === 'complaint' ? `🔴 ${t.complaintBadge}` : selectedFeedback.feedback_type === 'suggestion' ? `💡 ${t.suggestionBadge}` : `⭐ ${t.reviewBadge}`}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${getStatusBadge(selectedFeedback, t).color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' : getStatusBadge(selectedFeedback, t).color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {getStatusBadge(selectedFeedback, t).icon} {getStatusBadge(selectedFeedback, t).label}
                            </span>
                            {(selectedFeedback.general_eval_rating || selectedFeedback.general_eval_comment) && (
                                <span className="text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap bg-teal-500/10 text-teal-400 border-teal-500/20">
                                    🌟 {language === 'tr' ? 'Genel Değ.' : 'Gen. Eval.'}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(selectedFeedback.created_at, language)}</span>
                    </div>

                    <div>
                        {selectedFeedback.rating && (
                            <div className="mb-3">
                                <p className="text-xs text-slate-400 mb-1">{language === 'tr' ? 'Puan:' : 'Rating:'}</p>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < selectedFeedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />)}
                                </div>
                            </div>
                        )}
                        <h4 className="text-xs font-bold text-teal-500 uppercase mb-2 tracking-wide">{t.yourMessage}</h4>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
                            {selectedFeedback.message}
                        </div>
                    </div>

                    {(selectedFeedback.general_eval_rating || selectedFeedback.general_eval_comment) && (
                        <div>
                            <h4 className="text-xs font-bold text-teal-500 uppercase mb-2 tracking-wide">{t.generalEval}</h4>
                            {selectedFeedback.general_eval_rating && (
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < selectedFeedback.general_eval_rating ? 'text-teal-500 fill-teal-500' : 'text-gray-600'}`} />)}
                                </div>
                            )}
                            {selectedFeedback.general_eval_comment && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
                                    {selectedFeedback.general_eval_comment}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedFeedback.feedback_images?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-teal-500 uppercase mb-3 flex items-center gap-2"><ImageIcon className="w-3 h-3" /> {t.attachedImages}</h4>
                            <div className="grid grid-cols-3 gap-3">
                                {selectedFeedback.feedback_images.map((img, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group relative" onClick={() => setPreviewImage(img)}>
                                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="w-5 h-5 text-white" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-slate-800 flex-shrink-0">
              <Button onClick={() => setSelectedFeedback(null)} className="w-full bg-slate-800 hover:bg-slate-700">{t.close}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => {
            e.stopPropagation();
            setPreviewImage(null);
          }}>
            <button className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full text-white hover:bg-red-600 transition-colors cursor-pointer" type="button" onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
              }}>
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* SETTINGS MODAL */}
      <Dialog open={showSettingsModal} onOpenChange={(open) => {
        setShowSettingsModal(open);
        if (!open) setDeleteAccountConfirmed(false);
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Settings className="h-6 w-6 text-teal-500" />
              {language === 'tr' ? 'Ayarlar' : 'Settings'}
            </DialogTitle>
          </DialogHeader>
          
          {!isGuest ? (
            <>
              {/* TAB BUTTONS - Only for authenticated users */}
              <div className="flex gap-2 px-6 pt-4 flex-shrink-0 border-b border-slate-800">
                <button
                  onClick={() => setSettingsTab('profile')}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                    settingsTab === 'profile'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  {language === 'tr' ? 'Profil' : 'Profile'}
                </button>
                <button
                  onClick={() => setSettingsTab('security')}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                    settingsTab === 'security'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  {language === 'tr' ? 'Güvenlik' : 'Security'}
                </button>
                <button
                  onClick={() => setSettingsTab('account')}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                    settingsTab === 'account'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  {language === 'tr' ? 'Hesap' : 'Account'}
                </button>
              </div>
              
              {/* TAB CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* PROFILE TAB */}
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
                        className="bg-slate-800 border-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 font-semibold mb-2 block">
                        {language === 'tr' ? 'Yeni E-posta' : 'New Email'}
                      </label>
                      <Input
                        type="email"
                        placeholder="yeni@email.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                )}
                
                {/* SECURITY TAB */}
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
                        className="bg-slate-800 border-slate-700 text-white focus:border-teal-500 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                )}
                
                {/* ACCOUNT TAB - GÜNCELLENDİ (MODAL TETİKLEYİCİ) */}
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
              
              {/* FOOTER - ACTION BUTTONS & GLOBAL LOGOUT */}
              <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0 flex flex-col gap-3">
                {/* Tab Specific Actions */}
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

                {/* Global Actions (Always Visible) */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={() => { setShowSettingsModal(false); setSupportModalOpen(true); }}
                        variant="outline"
                        className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
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
                  onClick={() => setShowSettingsModal(false)}
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-slate-300 hover:bg-transparent h-8 text-xs"
                >
                  {language === 'tr' ? 'Pencereyi Kapat' : 'Close Window'}
                </Button>
              </div>
            </>
          ) : (
            // GUEST VIEW
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="bg-slate-800/80 p-8 rounded-full inline-flex mb-6">
                <UserPlus className="h-12 w-12 text-teal-500" />
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-3">
                {language === 'tr' ? 'Daha Fazla Özellik Açın' : 'Unlock More Features'}
              </h3>
              <p className="text-slate-400 text-center max-w-sm mb-6">
                {language === 'tr' 
                  ? 'Geri bildirimlerinizi takip edin, istatistiklerinizi görün ve daha fazla özelliği kullanın.' 
                  : 'Track your feedback, view statistics and unlock more features.'}
              </p>
              <Button 
                onClick={() => { handleRegisterClick(); setShowSettingsModal(false); }} 
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-base mb-4"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {t.register}
              </Button>
              
              <DialogFooter className="w-full mt-auto pt-6 border-t border-slate-800 flex flex-col gap-3">
                <Button
                    onClick={() => { setShowSettingsModal(false); setSupportModalOpen(true); }}
                    variant="outline"
                    className="w-full border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
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

      {/* YENİ EKLENEN HESAP SİLME ONAY MODALI */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={(open) => {
        setShowDeleteConfirmModal(open);
        if(!open) setDeleteAccountConfirmed(false); 
      }}>
        <DialogContent className="bg-slate-900 border-red-500/50 text-white max-w-md rounded-xl shadow-2xl shadow-red-900/20">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6" />
              {language === 'tr' ? 'Hesabınızı Silmek Üzeresiniz' : 'You Are About To Delete Your Account'}
            </DialogTitle>
            <DialogDescription className="text-slate-300 mt-2">
              {language === 'tr' 
                ? 'Bu işlem geri alınamaz. Hesabınız silindiğinde tüm geri bildirim geçmişiniz, profil bilgileriniz ve ayarlarınız kalıcı olarak silinecektir.' 
                : 'This action cannot be undone. All your feedback history, profile information, and settings will be permanently deleted.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-3 bg-red-950/30 p-4 rounded-lg border border-red-900/50">
              <Checkbox 
                id="finalDeleteConfirm" 
                checked={deleteAccountConfirmed} 
                onCheckedChange={setDeleteAccountConfirmed} 
                className="mt-1 border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
              />
              <label htmlFor="finalDeleteConfirm" className="text-sm text-red-200 cursor-pointer leading-tight">
                {language === 'tr' 
                  ? 'Sonuçları anlıyorum ve hesabımı kalıcı olarak silmeyi onaylıyorum.' 
                  : 'I understand the consequences and confirm the permanent deletion of my account.'}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setShowDeleteConfirmModal(false)}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 text-white"
            >
              {language === 'tr' ? 'Vazgeç' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSoftDeleteAccount}
              disabled={isDeletingAccount || !deleteAccountConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {language === 'tr' ? 'Siliniyor...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {language === 'tr' ? 'Evet, Hesabımı Sil' : 'Yes, Delete My Account'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700 text-white rounded-xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-teal-500" />
              {t.support.title}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSupportSubmit} className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label htmlFor="support-email" className="text-sm font-medium text-slate-300">
                {t.support.email} <span className="text-red-500">*</span>
              </label>
              <Input 
                id="support-email" 
                type="email" 
                placeholder="ornek@sirket.com" 
                value={supportEmail} 
                onChange={(e) => setSupportEmail(e.target.value)} 
                disabled={!!user?.email} 
                className={cn("bg-slate-900 border-slate-700 text-white rounded-lg h-11", !!user?.email && "opacity-70 cursor-not-allowed")} 
                required 
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="support-message" className="text-sm font-medium text-slate-300">
                {t.support.message} <span className="text-red-500">*</span>
              </label>
              <textarea 
                id="support-message" 
                rows="6" 
                placeholder={t.support.messagePlaceholder} 
                value={supportMessage} 
                onChange={(e) => setSupportMessage(e.target.value)} 
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors" 
                required 
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-500" />
                  {t.support.images}
                </label>
                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                  {supportImages.length}/3
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {supportImages.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="preview" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)} 
                      className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {supportImages.length < 3 && (
                  <label className="w-20 h-20 flex flex-col items-center justify-center border border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800/50 hover:border-teal-500/50 transition-all group bg-slate-900/30">
                    <Upload className="w-6 h-6 text-slate-500 mb-1 group-hover:text-teal-500 transition-colors" />
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors text-center px-1">
                      {t.support.upload}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handleSupportImageChange} 
                    />
                  </label>
                )}
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button 
                type="submit" 
                disabled={supportLoading} 
                className="bg-teal-600 hover:bg-teal-700 text-white w-full h-12 rounded-lg text-base font-medium transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-900/40"
              >
                {supportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t.support.sending}
                  </>
                ) : (
                  t.support.send
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showGuestWarningModal} onOpenChange={setShowGuestWarningModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-orange-400">
              {t.guestWarning.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            {t.guestWarning.text}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Checkbox 
              id="dontShow" 
              checked={dontShowGuestWarning} 
              onCheckedChange={setDontShowGuestWarning} 
            />
            <label htmlFor="dontShow" className="text-xs text-slate-400">
              {t.guestWarning.dontShow}
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={handleGuestWarningContinue}
            >
              {t.guestWarning.continueGuest}
            </Button>
            <Button onClick={handleGuestWarningLogin}>
              {t.guestWarning.loginToSend}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}