import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  QrCode, ArrowLeft, ImagePlus, X, CheckCircle2, Send, Loader2, Star, 
  AlertTriangle, Lightbulb, Info, Building2, AlertCircle, MapPin, 
  Calendar as CalendarIcon, Trash2, Maximize2, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

// ============================================================================
// STATIC DATA & HELPERS (Component Dışına Taşındı - Performans ve Hata Önleme İçin)
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
    errorLoad: "Veri yüklenirken sorun oluştu.",
    limitExceeded: "Sınır Aşıldı",
    limitDesc: (remaining) => `En fazla 3 görsel yükleyebilirsiniz.`,
    fileTooLarge: "Dosya Çok Büyük",
    fileTooLargeDesc: (name) => `${name} 5MB'dan küçük olmalıdır.`,
    back: "Geri Dön",
    titles: {
      complaint: "Şikayet Bildir", complaintSub: "Sorunu çözelim.",
      suggestion: "Öneride Bulun", suggestionSub: "Fikirleriniz değerli.",
      review: "Değerlendir", reviewSub: "Deneyiminizi puanlayın.",
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
    google: {
      title: "Harika Deneyim! 🌟",
      question: "Bu olumlu deneyiminizi Google'da da paylaşmak ister misiniz?",
      info: "Mesajınız otomatik kopyalandı - Google'da sadece yapıştırmanız yeterli!",
      shareButton: "Google'da Paylaş",
      skipButton: "Hayır, Teşekkürler"
    }
  },
  en: {
    errorLoad: "Error loading data.",
    limitExceeded: "Limit Exceeded",
    limitDesc: (remaining) => `Max 3 images allowed.`,
    fileTooLarge: "File Too Large",
    fileTooLargeDesc: (name) => `${name} must be smaller than 5MB.`,
    back: "Go Back",
    titles: {
      complaint: "Report Issue", complaintSub: "Let's fix it.",
      suggestion: "Make Suggestion", suggestionSub: "Your ideas matter.",
      review: "Rate Us", reviewSub: "Rate your experience.",
      default: "Feedback", defaultSub: "Share your thoughts"
    },
    infoBanner: "Sent instantly to the manager.",
    businessLabel: "Business", qrLabel: "✅ QR Verified",
    branch: { label: "Select Branch", placeholder: "Select Branch", auto: "Auto-selected via QR" },
    receipt: {
      label: "Receipt Status", noReceipt: "No Receipt", hasReceipt: "Have Receipt",
      uploadLabel: "Upload Receipt Image", placeholder: "Click to select image",
      uploaded: "Uploaded",
      dateLabel: "Estimated Visit Time", selectDateTitle: "Select Visit Time",
      confirmDate: "CONFIRM TIME", changeDate: "Change Time"
    },
    message: { label: "Description", placeholder: "Details...", minChars: "Min 10 chars" },
    rating: { label: "Rate", emojis: { 1: '😞 Very Bad', 2: '😟 Bad', 3: '😐 Average', 4: '😊 Good', 5: '😍 Excellent' } },
    general: { title: "General", satisfaction: "Satisfaction", placeholder: "Additional comments..." },
    images: { label: "Images", placeholder: "Add Photo", sub: "Max 3 images", uploaded: "images uploaded" },
    submit: { sending: "Sending...", send: "Send", error: "Error occurred.", errorValidation: "Missing fields." },
    disclaimer: "Response depends on the business.",
    success: { title: "Thank You!", desc: (name) => `Sent to ${name} manager.`, footer: "Thanks for choosing us.", button: "OK" },
    google: {
      title: "Great Experience! 🌟",
      question: "Would you like to share this positive experience on Google?",
      info: "Your message has been automatically copied - just paste it on Google!",
      shareButton: "Share on Google",
      skipButton: "No, Thanks"
    }
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
  
  // Data State
  const [businessName, setBusinessName] = useState('');
  const [branches, setBranches] = useState([]); 
  const [selectedBranch, setSelectedBranch] = useState(branchParam || '');
  const [qrCode, setQrCode] = useState(qrParam || null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form Data
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null); 
  const [visitDate, setVisitDate] = useState(getCurrentLocalISOString()); 

  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [generalRating, setGeneralRating] = useState(0);
  const [generalComment, setGeneralComment] = useState('');
  const [feedbackImages, setFeedbackImages] = useState([]);
  
  // UI States
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');

  const t = TEXTS[language] || TEXTS.tr;

  // INITIALIZATION
  useEffect(() => {
    const init = async () => {
      try {
        // Language initialization
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

            // Fetch ALL active branches
            const { data: allBranches } = await supabase.from('branches').select('id, branch_name_tr, google_review_url').eq('business_id', targetBusinessId).eq('is_active', true);
            
            if (allBranches) {
                setBranches(allBranches);
                
                // MANTIK DEĞİŞİKLİĞİ: Eğer branchParam değişirse veya branches ilk kez yükleniyorsa güncelle
                // Manuel seçimde tekrar buraya girmemesi için dependency array'den 'selectedBranch' zaten çıkarıldı.
                if (branchParam && allBranches.some(b => b.id === branchParam)) {
                    setSelectedBranch(branchParam);
                } else if (allBranches.length === 1) {
                    setSelectedBranch(allBranches[0].id);
                }
            }
        }
      } catch (error) {
        console.error('Error initializing feedback form:', error);
        // Hata durumunda statik metin göster (t.errorLoad yerine)
        toast({ title: "Hata", description: "Veri yüklenemedi", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    init();
  // ÖNEMLİ: Dependency Array'den 't' ve 'toast' kaldırıldı. Sadece veri parametreleri kaldı.
  }, [typeParam, businessParam, branchParam, qrParam, langParam]);

  // IMAGE HANDLERS
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 3 - feedbackImages.length;
    
    if (files.length > remainingSlots) {
      toast({ title: t.limitExceeded, description: t.limitDesc(remainingSlots), variant: "destructive" });
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t.fileTooLarge, description: t.fileTooLargeDesc(file.name), variant: "destructive" });
        return;
      }
      const preview = URL.createObjectURL(file);
      setFeedbackImages(prev => [...prev, { file, preview }]);
    });
  };

  const handleReceiptUpload = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t.fileTooLarge, description: t.fileTooLargeDesc(file.name), variant: "destructive" });
        return;
      }
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
  };

  const removeReceipt = () => {
      setReceiptFile(null);
      setReceiptPreview(null);
  };

  const removeImage = (index) => {
    setFeedbackImages(prev => prev.filter((_, i) => i !== index));
  };

  const openImageModal = (src) => {
    setImageModalSrc(src);
    setImageModalOpen(true);
  };

  // DATE HANDLERS
  const handleDateChange = (e) => {
      setVisitDate(e.target.value);
  };

  const handleDateBlur = () => {
      if (!visitDate) return;

      const inputDate = new Date(visitDate);
      const now = new Date();

      if (inputDate > now) {
         setVisitDate(getCurrentLocalISOString());
         toast({ title: "Geçersiz Tarih", description: "Gelecek bir tarih seçemezsiniz.", variant: "destructive" });
         return;
      }

      const inputYear = inputDate.getFullYear();
      if (inputYear < MIN_YEAR) {
          const parts = visitDate.split('-');
          if (parts.length >= 3) {
              const newDateString = `${MIN_YEAR}-${parts[1]}-${parts[2]}`;
              if (new Date(newDateString) > now) {
                  setVisitDate(getCurrentLocalISOString());
                  toast({ title: "Tarih Düzeltildi", description: "Geleceğe denk geldiği için bugüne ayarlandı.", className: "bg-slate-800 text-white" });
              } else {
                  setVisitDate(newDateString);
                  toast({ title: "Yıl Güncellendi", description: `Yıl ${MIN_YEAR} olarak güncellendi.`, className: "bg-slate-800 text-white" });
              }
          }
      }
  };

  // FORM VALIDATION
  const isFormValid = () => {
    if (!selectedBranch) return false;
    if (feedbackType === 'review' && rating === 0) return false;
    if ((feedbackType === 'complaint' || feedbackType === 'suggestion') && message.length < 10) return false;
    if (hasReceipt && !receiptFile) return false;
    if (!hasReceipt && (feedbackType === 'complaint' || feedbackType === 'suggestion') && !visitDate) return false;
    
    return true;
  };

  // SUBMIT
  const uploadFiles = async (files) => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('feedback-images').upload(fileName, file);
      if (!error) {
        const { data } = supabase.storage.from('feedback-images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const submitFeedback = async () => {
    if (!isFormValid()) { toast({ title: "Uyarı", description: t.submit.errorValidation, variant: "destructive" }); return; }
    setIsSubmitting(true);
    
    try {
      let receiptUrl = null;
      let feedbackImageUrls = [];

      if (hasReceipt && receiptFile) {
        const urls = await uploadFiles([receiptFile]);
        receiptUrl = urls[0];
      }

      if (feedbackImages.length > 0) {
        const files = feedbackImages.map(img => img.file);
        feedbackImageUrls = await uploadFiles(files);
      }

      const currentBusinessId = searchParams.get('business') || branches.find(b => b.id === selectedBranch)?.business_id;

      await supabase.from('feedbacks').insert({
        business_id: currentBusinessId,
        branch_id: selectedBranch,
        qr_code: qrCode || null,
        feedback_type: feedbackType,
        rating: feedbackType === 'review' ? rating : null,
        message,
        has_receipt: hasReceipt,
        receipt_images: receiptUrl ? [receiptUrl] : null,
        feedback_images: feedbackImageUrls,
        visit_datetime: new Date(visitDate).toISOString(),
        general_eval_rating: generalRating > 0 ? generalRating : null,
        general_eval_comment: generalComment || null,
        customer_email: isGuest ? null : (user?.email || null),
        customer_phone: isGuest ? null : (user?.phone || null),
        customer_name: isGuest ? 'Anonim' : (user?.user_metadata?.first_name || 'Müşteri'),
        status: 'new',
        created_at: new Date().toISOString(),
        lang: language
      });

      // Gönderilen mesajı sakla (Google review için)
      setSubmittedMessage(message);

      // Yüksek puan VE Google URL varsa prompt göster
      const selectedBranchData = branches.find(b => b.id === selectedBranch);
      const hasHighRating = rating >= 4 || generalRating >= 4;
      const hasGoogleUrl = selectedBranchData?.google_review_url;

      if (hasHighRating && hasGoogleUrl) {
        setShowGooglePrompt(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (error) {
      toast({ title: t.submit.error, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Review Functions
  const copyToClipboard = async (text) => {
    try {
      // Modern Clipboard API (Desktop + Mobile)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (err) {
        textArea.remove();
        return false;
      }
    } catch (err) {
      return false;
    }
  };

  const handleGoogleReview = async () => {
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    
    // Mesajı kopyala
    if (submittedMessage) {
      await copyToClipboard(submittedMessage);
    }
    
    // Google Review sayfasını aç
    if (selectedBranchData?.google_review_url) {
      window.open(selectedBranchData.google_review_url, '_blank');
    }
    
    // Modal'ları kapat ve yönlendir
    setShowGooglePrompt(false);
    setShowSuccessModal(true);
  };

  const handleSkipGoogle = () => {
    setShowGooglePrompt(false);
    setShowSuccessModal(true);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigate(`/customer-panel?${searchParams.toString()}`, { state: { showSuccessNotification: true, feedbackType } });
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="h-12 w-12 text-orange-500 animate-spin" /></div>;

  const logoUrl = "https://horizons-cdn.hostinger.com/6258d61f-4dee-43f7-9fc1-2388b2f01b03/13d4a6d0cb60030e231821b7e8ea74ad.png";
  const formInfo = getFormInfo(feedbackType, t.titles);

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-8 md:px-8 md:py-12 font-sans text-white overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/customer-panel')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 group">
            <div className="bg-slate-800 p-2 rounded-full group-hover:bg-slate-700 transition-colors"><ArrowLeft className="h-5 w-5" /></div>
            <span className="text-sm font-medium hidden sm:inline">{t.back}</span>
          </button>
          <img src={logoUrl} alt="Logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
        </div>

        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4 px-4 md:px-8 lg:px-12 py-6 md:py-8 lg:py-10 rounded-2xl">
            {formInfo.icon}
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${formInfo.gradient} leading-tight break-words text-center py-2`}>{formInfo.title}</h1>
          </div>
          <p className="text-slate-400 text-base md:text-lg font-medium mb-8 max-w-xl mx-auto px-4">{formInfo.subtitle}</p>
          <div className="bg-teal-500/10 border-l-4 border-teal-500 p-4 rounded-lg text-left max-w-xl mx-auto flex items-start gap-3"><Info className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" /><p className="text-teal-300 text-sm leading-relaxed break-words">{t.infoBanner}</p></div>
        </div>

        <div className="bg-[#1a2847] border border-slate-700 rounded-xl p-4 md:p-8 shadow-lg">
          <div className="mb-6 rounded-xl bg-slate-800 border-l-4 border-teal-500 p-4 flex items-start gap-4">
            <div className="bg-teal-500/20 p-2 rounded-full shrink-0"><Building2 className="h-6 w-6 text-teal-500" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">{t.businessLabel}</p>
              <h3 className="font-bold text-lg text-white truncate mb-2">{businessName}</h3>
              <div className="relative">
                <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg py-2 pl-3 pr-8 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 appearance-none transition-colors">
                  <option value="" disabled>{t.branch.placeholder}</option>
                  {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.branch_name_tr}</option>))}
                </select>
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {(feedbackType === 'complaint' || feedbackType === 'suggestion') && (
            <div className="mb-8">
              <label className="block text-sm text-gray-400 mb-3 font-semibold uppercase tracking-wide">{t.receipt.label}</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button type="button" onClick={() => { setHasReceipt(false); setReceiptFile(null); setReceiptPreview(null); }} className={`py-3 px-4 rounded-lg font-medium border-2 transition-all duration-200 flex items-center justify-center gap-2 ${!hasReceipt ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-700'}`}><X className="h-4 w-4" /> {t.receipt.noReceipt}</button>
                <button type="button" onClick={() => setHasReceipt(true)} className={`py-3 px-4 rounded-lg font-medium border-2 transition-all duration-200 flex items-center justify-center gap-2 ${hasReceipt ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-700'}`}><CheckCircle2 className="h-4 w-4" /> {t.receipt.hasReceipt}</button>
              </div>
              
              {hasReceipt && (
                <div className="animate-in fade-in slide-in-from-top-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <label className="block text-sm text-gray-300 mb-3 font-medium">{t.receipt.uploadLabel} <span className="text-red-500">*</span></label>
                  {receiptPreview ? (
                    <div className="relative h-32 w-full sm:w-48 rounded-lg overflow-hidden border border-slate-600 bg-black/40 group shrink-0 mx-auto sm:mx-0">
                      <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity cursor-zoom-in" onClick={() => openImageModal(receiptPreview)} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-6 h-6 text-white/80 drop-shadow-md" /></div>
                      <button onClick={removeReceipt} className="absolute top-1 right-1 bg-red-600/90 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition-colors z-10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-teal-500 hover:bg-slate-800/50 transition-all group cursor-pointer relative">
                      <input type="file" accept="image/*" onChange={handleReceiptUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <ImagePlus className="h-8 w-8 text-slate-500 mx-auto mb-2 group-hover:text-teal-500 transition-colors" />
                      <p className="text-slate-400 text-sm font-medium group-hover:text-white break-words">{t.receipt.placeholder}</p>
                    </div>
                  )}
                </div>
              )}
              
              {!hasReceipt && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm text-gray-400 mb-2 font-semibold">{t.receipt.dateLabel} <span className="text-red-500">*</span></label>
                  <div className="relative">
                      <input type="datetime-local" value={visitDate} onChange={handleDateChange} onBlur={handleDateBlur} min={MIN_DATE_STRING} max={getCurrentLocalISOString()} lang={language === 'tr' ? 'tr-TR' : 'en-US'} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 pl-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition [color-scheme:dark]" />
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wide">{t.message.label} <span className="text-red-500">*</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 1000))} placeholder={t.message.placeholder} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-4 placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-base" rows={5} maxLength={1000} />
            <div className="flex justify-between items-center mt-2"><p className={`text-xs font-medium ${message.length > 0 && message.length < 10 ? 'text-red-400' : 'text-slate-500'}`}>{t.message.minChars}</p><p className="text-xs text-slate-500">{message.length}/1000</p></div>
          </div>

          {feedbackType === 'review' && (
            <div className="mb-8 bg-slate-900/30 p-6 rounded-xl border border-slate-700/50">
              <label className="block text-sm text-gray-300 mb-4 font-semibold text-center uppercase tracking-wide">{t.rating.label} <span className="text-red-500">*</span></label>
              <div className="flex justify-center gap-2 md:gap-4 mb-2 flex-wrap">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setRating(star)} className="transition-all duration-200 hover:scale-110 focus:outline-none group"><Star className={`h-8 w-8 md:h-12 md:w-12 transition-colors ${star <= rating ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-slate-600 group-hover:text-yellow-500/50'}`} /></button>))}</div>
              {rating > 0 && <p className="text-center text-yellow-400 font-bold text-lg animate-in fade-in slide-in-from-bottom-2 mt-2">{getEmojiForRating(rating, t.rating.emojis)}</p>}
            </div>
          )}

          {(feedbackType === 'complaint' || feedbackType === 'suggestion') && (
            <div className="mb-8 bg-slate-900/30 p-6 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-4"><Info className="h-5 w-5 text-teal-500 shrink-0" /><h3 className="text-white font-semibold">{t.general.title}</h3></div>
              <div className="mb-4"><label className="block text-xs text-slate-400 mb-2 font-medium">{t.general.satisfaction}</label><div className="flex gap-2 flex-wrap">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setGeneralRating(star)} className="transition-all duration-150 hover:scale-110 focus:outline-none"><Star className={`h-8 w-8 md:h-9 md:w-9 ${star <= generalRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`} /></button>))}</div>{generalRating > 0 && <p className="text-xs text-yellow-400 mt-1 font-medium">{getEmojiForRating(generalRating, t.rating.emojis)}</p>}</div>
              <div><textarea value={generalComment} onChange={(e) => setGeneralComment(e.target.value.slice(0, 500))} placeholder={t.general.placeholder} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm" rows={3} maxLength={500} /><p className="text-xs text-slate-500 text-right mt-1">{generalComment.length}/500</p></div>
            </div>
          )}

          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-3 font-semibold uppercase tracking-wide">{t.images.label}</label>
            {feedbackImages.length < 3 && (<div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-500 hover:bg-slate-800/50 transition-all group relative cursor-pointer"><input type="file" accept="image/*" multiple onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="imageUpload" /><ImagePlus className="h-10 w-10 text-slate-500 mx-auto mb-2 group-hover:text-orange-500 transition-colors" /><p className="text-slate-400 text-sm font-medium group-hover:text-white">{t.images.placeholder}</p><p className="text-slate-500 text-xs mt-1">{t.images.sub}</p></div>)}
            {feedbackImages.length > 0 && (<div className="mt-4"><div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400 font-medium">{feedbackImages.length} {t.images.uploaded}</span></div><div className="grid grid-cols-3 sm:grid-cols-4 gap-3">{feedbackImages.map((img, index) => (<div key={index} className="relative aspect-square group bg-slate-800 rounded-lg overflow-hidden border border-slate-700"><img src={img.preview} alt={`Görsel`} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition" onClick={() => openImageModal(img.preview)} /><button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"><X className="h-3 w-3" /></button></div>))}</div></div>)}
          </div>

          <Button type="submit" onClick={submitFeedback} disabled={!isFormValid() || isSubmitting} className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 h-auto text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-orange-900/30 hover:scale-[1.01]">{isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />{t.submit.sending}</> : <><Send className="h-5 w-5 mr-2" />{t.submit.send}</>}</Button>
          <div className="mt-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3"><AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-red-300 text-sm leading-relaxed break-words">{t.disclaimer}</p></div>
        </div>
      </div>

      {imageModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm" onClick={() => setImageModalOpen(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-red-500 transition bg-slate-800/50 p-2 rounded-full" onClick={(e) => { e.stopPropagation(); setImageModalOpen(false); }}><X className="h-8 w-8" /></button>
          <img src={imageModalSrc} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* GOOGLE REVIEW PROMPT MODAL */}
      {showGooglePrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a2847] rounded-2xl p-6 md:p-8 max-w-md w-full text-center animate-in zoom-in-95 fade-in duration-300 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none"></div>
            
            {/* Icon */}
            <div className="bg-teal-500/20 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
              <Star className="h-10 w-10 md:h-12 md:w-12 text-teal-400 fill-teal-400" />
            </div>
            
            {/* Title */}
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight break-words">
              {t.google.title}
            </h2>
            
            {/* Question */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
              <p className="text-slate-300 leading-relaxed text-sm break-words">
                {t.google.question}
              </p>
            </div>
            
            {/* Info Badge */}
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 mb-6">
              <p className="text-teal-300 text-xs font-medium flex items-center justify-center gap-2 flex-wrap">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="break-words">{t.google.info}</span>
              </p>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleGoogleReview} 
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold py-3 md:py-4 h-auto text-sm md:text-base rounded-xl transition shadow-lg shadow-teal-900/20 hover:scale-[1.02]"
              >
                <Star className="mr-2 h-4 w-4 md:h-5 md:w-5 fill-white" />
                {t.google.shareButton}
              </Button>
              
              <Button 
                onClick={handleSkipGoogle} 
                variant="outline"
                className="w-full bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 font-medium py-3 md:py-4 h-auto text-sm md:text-base rounded-xl transition"
              >
                {t.google.skipButton}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a2847] rounded-2xl p-8 max-w-md w-full text-center animate-in zoom-in-95 fade-in duration-300 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
            <div className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]"><CheckCircle2 className="h-12 w-12 text-green-500" /></div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight break-words">{t.success.title}</h2>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-700/50"><p className="text-slate-300 leading-relaxed text-sm break-words">{t.success.desc(businessName || t.businessLabel)}</p><div className="mt-3 pt-3 border-t border-slate-700/50"><span className="text-green-400 font-bold text-sm flex items-center justify-center gap-2 flex-wrap"><Star className="h-4 w-4 fill-green-400 text-green-400 shrink-0" /> {t.success.footer}</span></div></div>
            <Button onClick={handleSuccessClose} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 h-auto text-base rounded-xl transition shadow-lg shadow-teal-900/20 hover:scale-[1.02]"><ArrowLeft className="mr-2 h-5 w-5" />{t.success.button}</Button>
          </div>
        </div>
      )}
    </div>
  );
}