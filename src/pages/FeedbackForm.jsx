import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  QrCode, ArrowLeft, ImagePlus, X, CheckCircle2, Send, Loader2, Star, 
  AlertTriangle, Lightbulb, Info, Building2, AlertCircle, MapPin, 
  Calendar as CalendarIcon, Trash2, Maximize2, Clock, ThumbsUp, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

// ============================================================================
// STATIC DATA & HELPERS
// ============================================================================

const getEmojiForRating = (rating, emojis) => emojis[rating] || '';

const getFormInfo = (feedbackType, titles) => {
  if (feedbackType === 'complaint') return { 
    title: titles.complaint, subtitle: titles.complaintSub,
    icon: <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 text-red-500 shrink-0" />, gradient: "from-red-400 to-red-600"
  };
  if (feedbackType === 'suggestion') return { 
    title: titles.suggestion, subtitle: titles.suggestionSub,
    icon: <Lightbulb className="h-12 w-12 md:h-16 md:w-16 text-blue-500 shrink-0" />, gradient: "from-blue-400 to-blue-600"
  };
  if (feedbackType === 'review') return { 
    title: titles.review, subtitle: titles.reviewSub,
    icon: <Star className="h-12 w-12 md:h-16 md:w-16 text-yellow-500 shrink-0" />, gradient: "from-yellow-400 to-orange-500"
  };
  return { title: titles.default, subtitle: titles.defaultSub, icon: null, gradient: "from-slate-400 to-slate-600" };
};

const getCurrentLocalISOString = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
};

const MIN_YEAR = 2025;
const MIN_DATE_STRING = "2025-01-01T00:00";

const TEXTS = {
  tr: {
    // ... (Diğer hata mesajları aynen kalabilir)
    errorLoad: "Veri yüklenirken sorun oluştu.",
    limitExceeded: "Sınır Aşıldı",
    limitDesc: (remaining) => `En fazla 3 görsel yükleyebilirsiniz.`,
    fileTooLarge: "Dosya Çok Büyük",
    fileTooLargeDesc: (name) => `${name} 5MB'dan küçük olmalıdır.`,
    back: "Geri Dön",
    titles: {
      // ✅ GÜNCELLENEN METİNLER (İstediğin Gibi)
      complaint: "Şikayet Bildir", complaintSub: "Bir sorun mu yaşadınız? Hemen bildirin!",
      suggestion: "Öneride Bulun", suggestionSub: "Fikirleriniz bizim için değerli.",
      review: "Değerlendir", reviewSub: "Deneyiminizi puanlayın!",
      default: "Geri Bildirim", defaultSub: "Görüşlerinizi paylaşın"
    },
    infoBanner: "Geri bildiriminiz anında yöneticiye iletilir.",
    businessLabel: "İşletme", qrLabel: "✅ QR Doğrulama",
    branch: { label: "Şube Seçin", placeholder: "Şube Seçiniz", auto: "QR ile otomatik seçildi" },
    receipt: {
      label: "Fiş Durumu", noReceipt: "Fişim Yok", hasReceipt: "Fişim Var",
      uploadLabel: "Fiş Görseli", placeholder: "Yükle", uploaded: "Yüklendi",
      dateLabel: "Tahmini Ziyaret Zamanı", selectDateTitle: "Ziyaret Zamanı Seçiniz",
      confirmDate: "ZAMANI ONAYLA", changeDate: "Zamanı Değiştir"
    },
    message: { label: "Açıklama", placeholder: "Detayları yazın...", minChars: "Min 10 karakter" },
    rating: { label: "Puanlayın", emojis: { 1: '😞 Çok Kötü', 2: '😟 Kötü', 3: '😐 Orta', 4: '😊 İyi', 5: '😍 Mükemmel' } },
    general: { title: "Genel Değerlendirme", satisfaction: "Memnuniyet", placeholder: "Eklemek istedikleriniz..." },
    images: { label: "Görseller", placeholder: "Fotoğraf Ekle", sub: "Max 3 adet", uploaded: "yüklendi" },
    submit: { sending: "Gönderiliyor...", send: "Gönder", error: "Hata oluştu.", errorValidation: "Eksik alanlar var." },
    disclaimer: "Geri dönüş süreci işletmeye bağlıdır.",
    success: { title: "Teşekkürler!", desc: (name) => `Bildiriminiz ${name} yöneticisine iletildi.`, footer: "Bizi tercih ettiğiniz için teşekkürler.", button: "Tamam" },
    googleReview: {
        title: "Deneyiminizi Paylaşın!",
        text: "Bu güzel deneyimi Google'da paylaşarak bize destek olmak ister misiniz?",
        yes: "Evet, Google'da Paylaş",
        no: "Hayır, Teşekkürler",
        copied: "Yorumunuz kopyalandı! Google'a yapıştırabilirsiniz."
    }
  },
  en: {
    // İngilizceler de uyumlu hale getirildi
    titles: {
      complaint: "Report Issue", complaintSub: "Experienced an issue? Report it now!",
      suggestion: "Make Suggestion", suggestionSub: "Your ideas matter to us.",
      review: "Rate Us", reviewSub: "Rate your experience!",
      default: "Feedback", defaultSub: "Share your thoughts"
    },
    // ... Diğerleri aynı
    errorLoad: "Error loading data.",
    // ...
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FeedbackForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isGuest } = useAuth();

  // Params
  const typeParam = searchParams.get('type');
  const businessParam = searchParams.get('business');
  const branchParam = searchParams.get('branch');
  const qrParam = searchParams.get('qr');
  const langParam = searchParams.get('lang');

  // STATE MANAGEMENT
  const [language, setLanguage] = useState('tr');
  const [feedbackType, setFeedbackType] = useState('complaint');
  
  const [businessName, setBusinessName] = useState('');
  const [branches, setBranches] = useState([]); 
  const [selectedBranch, setSelectedBranch] = useState(branchParam || '');
  const [currentBranchData, setCurrentBranchData] = useState(null); 
  const [qrCode, setQrCode] = useState(qrParam || null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null); 
  const [visitDate, setVisitDate] = useState(getCurrentLocalISOString()); 

  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [generalRating, setGeneralRating] = useState(0);
  const [generalComment, setGeneralComment] = useState('');
  const [feedbackImages, setFeedbackImages] = useState([]);
  
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const t = TEXTS[language] || TEXTS.tr;

  // ... (useEffect Initialization kısmı aynen kalacak) ...
  useEffect(() => {
    const init = async () => {
      try {
        const storedLang = localStorage.getItem('vocalize_lang');
        if (langParam && (langParam === 'tr' || langParam === 'en')) {
          setLanguage(langParam);
        } else if (storedLang && (storedLang === 'tr' || storedLang === 'en')) {
          setLanguage(storedLang);
        }

        const validTypes = ['complaint', 'suggestion', 'review'];
        setFeedbackType(validTypes.includes(typeParam) ? typeParam : 'complaint');

        let targetBusinessId = businessParam;

        if (!targetBusinessId && branchParam) {
           const { data: branchData } = await supabase.from('branches').select('business_id').eq('id', branchParam).single();
           if (branchData) targetBusinessId = branchData.business_id;
        }

        if (targetBusinessId) {
            const { data: bizData } = await supabase.from('businesses').select('business_name').eq('id', targetBusinessId).single();
            if (bizData) setBusinessName(bizData.business_name);

            const { data: allBranches } = await supabase.from('branches')
                .select('id, branch_name_tr, business_id, google_review_url')
                .eq('business_id', targetBusinessId)
                .eq('is_active', true);
            
            if (allBranches) {
                setBranches(allBranches);
                
                if (branchParam && allBranches.some(b => b.id === branchParam)) {
                    setSelectedBranch(branchParam);
                    setCurrentBranchData(allBranches.find(b => b.id === branchParam));
                } else if (allBranches.length === 1) {
                    setSelectedBranch(allBranches[0].id);
                    setCurrentBranchData(allBranches[0]);
                }
            }
        }
      } catch (error) {
        console.error('Error initializing feedback form:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [typeParam, businessParam, branchParam, qrParam, langParam]);

  // ... (handleBranchChange, Image handlers, Date handlers vs. AYNEN KALACAK) ...
  const handleBranchChange = (branchId) => {
      setSelectedBranch(branchId);
      const branchData = branches.find(b => b.id === branchId);
      setCurrentBranchData(branchData);
  };
  const handleImageUpload = (e) => { /*... Mevcut kod ...*/ };
  const handleReceiptUpload = (e) => { /*... Mevcut kod ...*/ };
  const removeReceipt = () => { /*... Mevcut kod ...*/ };
  const removeImage = (index) => { /*... Mevcut kod ...*/ };
  const openImageModal = (src) => { /*... Mevcut kod ...*/ };
  const handleDateChange = (e) => { setVisitDate(e.target.value); };
  const handleDateBlur = () => { /*... Mevcut kod ...*/ };
  const isFormValid = () => { /*... Mevcut kod ...*/ };
  const uploadFiles = async (files) => { /*... Mevcut kod ...*/ };
  const submitFeedback = async () => { /*... Mevcut kod ...*/ };

  // ✅ DÜZELTME: Başarı Modalını Kapatıp Panele Dönme
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // REPLACE: TRUE çok önemli, böylece geri butonuna basınca forma dönmez
    navigate(`/customer-panel?${searchParams.toString()}`, { 
        replace: true, 
        state: { showSuccessNotification: true, feedbackType } 
    });
  };

  const handleGoogleRedirect = () => {
      if (message) {
          navigator.clipboard.writeText(message).then(() => {
              toast({ title: t.googleReview.copied, className: "bg-green-600 text-white border-none" });
          }).catch(err => console.error('Copy failed', err));
      }
      if (currentBranchData?.google_review_url) {
          window.open(currentBranchData.google_review_url, '_blank');
      }
      handleSuccessClose();
  };

  // ✅ DÜZELTME: Geri Butonu Fonksiyonu
  const handleBack = () => {
      // Direkt panele git ve history'i replace et
      navigate(`/customer-panel?${searchParams.toString()}`, { replace: true });
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="h-12 w-12 text-orange-500 animate-spin" /></div>;

  const logoUrl = "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/13d4a6d0cb60030e231821b7e8ea74ad.png";
  const formInfo = getFormInfo(feedbackType, t.titles);
  const currentRating = feedbackType === 'review' ? rating : generalRating;
  const showGoogleRedirect = currentBranchData?.google_review_url && currentRating >= 4;

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-8 md:px-8 md:py-12 font-sans text-white overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          {/* ✅ GÜNCELLENEN GERİ BUTONU */}
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 group">
            <div className="bg-slate-800 p-2 rounded-full group-hover:bg-slate-700 transition-colors"><ArrowLeft className="h-5 w-5" /></div>
            <span className="text-sm font-medium hidden sm:inline">{t.back}</span>
          </button>
          <img src={logoUrl} alt="Logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
        </div>

        {/* ... (Geri kalan JSX yapısı aynen kalacak) ... */}
        {/* Form içeriği, başlıklar, inputlar vb. */}
        {/* Sadece getFormInfo ile çektiğimiz başlıklar artık düzgün gelecek */}
        
        {/* ... */}
      </div>
      
      {/* Modallar ... */}
    </div>
  );
}