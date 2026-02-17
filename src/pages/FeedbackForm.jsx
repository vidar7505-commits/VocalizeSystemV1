import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  ArrowLeft, ImagePlus, X, CheckCircle2, Send, Loader2, Star,
  AlertTriangle, Lightbulb, Building2, MapPin,
  Calendar as CalendarIcon, Trash2, Maximize2, ChevronRight, Camera, Clock, PenLine, Instagram, Copy, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import BranchSelector from '@/components/BranchSelector';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';

const getEmojiForRating = (rating, emojis) => emojis[rating] || '';

const getReactionMessage = (rating, tf) => {
  if (rating === 1) return tf.reactions.oneStar;
  if (rating === 2) return tf.reactions.twoStar;
  if (rating === 3) return tf.reactions.threeStar;
  if (rating === 4) return tf.reactions.fourStar;
  if (rating === 5) return tf.reactions.fiveStar;
  return "";
};

const getDynamicPlaceholder = (rating, tf) => {
  if (rating === 0) return tf.general.placeholder;
  if (rating <= 2) return tf.general.placeholderLow;
  if (rating === 3) return tf.general.placeholderMid;
  return tf.general.placeholderHigh;
};

const getFormInfo = (feedbackType, titles) => {
  if (feedbackType === 'complaint') return {
    title: titles.complaint, subtitle: titles.complaintSub,
    icon: <AlertTriangle className="h-8 w-8 text-red-500" />, gradient: "from-red-400 to-red-600"
  };
  if (feedbackType === 'suggestion') return {
    title: titles.suggestion, subtitle: titles.suggestionSub,
    icon: <Lightbulb className="h-8 w-8 text-blue-500" />, gradient: "from-blue-400 to-blue-600"
  };
  if (feedbackType === 'review') return {
    title: titles.review, subtitle: titles.reviewSub,
    icon: <Star className="h-8 w-8 text-yellow-500" />, gradient: "from-yellow-400 to-orange-500"
  };
  return { title: titles.default, subtitle: titles.defaultSub, icon: null, gradient: "from-slate-400 to-slate-600" };
};

const getCurrentLocalISOString = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
};

export default function FeedbackForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isGuest } = useAuth();

  const typeParam = searchParams.get('type');
  const businessParam = searchParams.get('business');
  const branchParam = searchParams.get('branch');
  const qrParam = searchParams.get('qr');
  const langParam = searchParams.get('lang');
  const guestParam = searchParams.get('guest');

  const language = i18n.language.split('-')[0] || 'tr';
  const [feedbackType, setFeedbackType] = useState('complaint');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = feedbackType === 'complaint' ? 3 : 2;

  const [businessName, setBusinessName] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(branchParam || '');
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [googleRedirectUrl, setGoogleRedirectUrl] = useState(null);
  const [instagramRedirectUrl, setInstagramRedirectUrl] = useState(null);
  const [currentFeedbackId, setCurrentFeedbackId] = useState(null);

  const [animatingStar, setAnimatingStar] = useState(null);

  const [wantsGuestContact, setWantsGuestContact] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [customerAgeGroup, setCustomerAgeGroup] = useState(null);

  const tf = useMemo(() => t('form', { returnObjects: true }), [t]);

  useEffect(() => {
    const init = async () => {
      try {
        if (langParam && (langParam === 'tr' || langParam === 'en')) {
          i18n.changeLanguage(langParam);
        }

        if (isGuest) {
          const age = localStorage.getItem('vocalize_customer_age_group');
          if (age) setCustomerAgeGroup(age);
        } else if (user) {
          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('age_group')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.age_group) setCustomerAgeGroup(profile.age_group);
        }

        const validTypes = ['complaint', 'suggestion', 'review'];
        setFeedbackType(validTypes.includes(typeParam) ? typeParam : 'complaint');

        let targetBusinessId = businessParam;
        if (!targetBusinessId && branchParam) {
          const { data } = await supabase.from('branches').select('business_id').eq('id', branchParam).single();
          if (data) targetBusinessId = data.business_id;
        }

        if (targetBusinessId) {
          const { data: biz } = await supabase.from('businesses').select('business_name').eq('id', targetBusinessId).single();
          if (biz) setBusinessName(biz.business_name);

          const { data: allBranches } = await supabase
            .from('branches')
            .select('id, branch_name_tr, google_review_url, instagram_url')
            .eq('business_id', targetBusinessId)
            .eq('is_active', true);

          if (allBranches) {
            setBranches(allBranches);
            if (branchParam && allBranches.some(b => b.id === branchParam)) {
              setSelectedBranch(branchParam);
            } else if (allBranches.length === 1) {
              setSelectedBranch(allBranches[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [typeParam, businessParam, branchParam, langParam, isGuest, user, i18n]);

  const handleStarClick = (starValue, isGeneral = false) => {
    if (isGeneral) {
      if (generalRating === starValue) {
        setGeneralRating(0);
        return;
      }
      setGeneralRating(starValue);
    } else {
      if (rating === starValue) {
        setRating(0);
        return;
      }
      setRating(starValue);
    }

    if (starValue >= 3) {
      setAnimatingStar(starValue);
      setTimeout(() => setAnimatingStar(null), 400);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + feedbackImages.length > 3) {
      toast({ title: tf.limitExceeded, description: tf.limitDesc, variant: "destructive" });
      return;
    }

    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      initialQuality: 0.7
    };

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: tf.fileTooLarge, variant: "destructive" });
        continue;
      }

      try {
        const compressedFile = await imageCompression(file, options);
        setFeedbackImages(prev => [...prev, { file: compressedFile, preview: URL.createObjectURL(compressedFile) }]);
      } catch (error) {
        console.error("Image compression error:", error);
        setFeedbackImages(prev => [...prev, { file, preview: URL.createObjectURL(file) }]);
      }
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      initialQuality: 0.7
    };

    try {
      const compressedFile = await imageCompression(file, options);
      setReceiptFile(compressedFile);
      setReceiptPreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Receipt compression error:", error);
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const isStepValid = () => {
    if (!selectedBranch) return false;

    const isGeneralEvalValid = () => {
      if (generalComment.trim().length > 0) {
        return generalRating > 0;
      }
      return true;
    };

    if (feedbackType === 'complaint') {
      if (currentStep === 1) return hasReceipt ? !!receiptFile : !!visitDate;
      if (currentStep === 2) return message.trim().length >= 10;
      if (currentStep === 3) {
        if (isGuest && wantsGuestContact) {
          if (!(guestName.trim().length > 1 && guestPhone.trim().length > 9)) return false;
        }
        return isGeneralEvalValid();
      }
      return true;
    }

    if (feedbackType === 'suggestion') {
      if (currentStep === 1) return message.trim().length >= 10;
      if (currentStep === 2) return isGeneralEvalValid();
      return true;
    }

    if (feedbackType === 'review') {
      if (currentStep === 1) return rating > 0;
      if (currentStep === 2) return true;
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (isStepValid()) setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    else toast({ title: t('common.error'), description: tf.submit.errorValidation, variant: "destructive" });
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else {
      const params = new URLSearchParams();
      if (businessParam) params.set('business', businessParam);
      if (branchParam) params.set('branch', branchParam);
      if (guestParam) params.set('guest', guestParam);
      if (qrParam) params.set('qr', qrParam);
      if (langParam) params.set('lang', langParam);
      navigate(`/customer-panel?${params.toString()}`);
    }
  };

  const uploadFiles = async (files) => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileName = `${Date.now()}_${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('feedback-images').upload(fileName, file);
      if (!error) {
        const { data } = supabase.storage.from('feedback-images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const submitFeedback = async () => {
    if (!isStepValid()) return;
    setIsSubmitting(true);

    try {
      const currentBusinessId = businessParam || branches.find(b => b.id === selectedBranch)?.business_id;
      const currentBranch = branches.find(b => b.id === selectedBranch);

      const calculatedOverallRating = feedbackType === 'review' ? rating : (generalRating > 0 ? generalRating : 5);
      const actualRating = feedbackType === 'review' ? rating : generalRating;

      if (feedbackType !== 'complaint') {
        if (actualRating >= 4 && currentBranch?.google_review_url) {
          setGoogleRedirectUrl(currentBranch.google_review_url);
        }
        if (actualRating >= 3 && currentBranch?.instagram_url) {
          setInstagramRedirectUrl(currentBranch.instagram_url);
        }
      }

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

      const { data, error } = await supabase.from('feedbacks').insert({
        business_id: currentBusinessId,
        branch_id: selectedBranch,
        feedback_type: feedbackType,
        rating: feedbackType === 'review' ? rating : null,
        overall_rating: calculatedOverallRating,
        message: message.trim() || null,
        has_receipt: hasReceipt,
        receipt_images: receiptUrl ? [receiptUrl] : null,
        feedback_images: feedbackImageUrls,
        visit_datetime: new Date(visitDate).toISOString(),
        general_eval_rating: generalRating > 0 ? generalRating : null,
        general_eval_comment: generalComment.trim() || null,
        customer_email: isGuest ? null : (user?.email || null),
        customer_name: isGuest ? t('customer.anonymous') : (user?.user_metadata?.full_name || t('customer.customer')),
        guest_contact_info: (isGuest && wantsGuestContact && (guestName || guestPhone)) ? {
          name: guestName,
          phone: guestPhone
        } : null,
        customer_age_group: customerAgeGroup,
        status: 'new',
        lang: language
      }).select().single();

      if (error) throw error;
      setCurrentFeedbackId(data.id);
      setShowSuccessModal(true);

      if (isGuest) {
        localStorage.removeItem('vocalize_guest_mode');
        localStorage.removeItem('vocalize_guest_warning_dismissed');
      }

    } catch (error) {
      toast({ title: tf.submit.error, description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formInfo = getFormInfo(feedbackType, tf.titles);

  const handleGoogleShare = async () => {
    let textToCopy = "";
    if (feedbackType === 'review') {
      textToCopy = message;
    } else {
      textToCopy = generalComment;
    }

    try {
      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        toast({
          title: t('feedbackDetail.detail.copy'),
          description: tf.google.copiedToast,
          className: "bg-green-600 text-white border-none"
        });
      }
    } catch (err) {
      console.error("Clipboard error:", err);
    }

    if (googleRedirectUrl) {
      setTimeout(() => {
        window.open(googleRedirectUrl, '_blank');
      }, 500);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
        <div key={step} className={`h-1.5 rounded-full transition-all duration-300 ${step <= currentStep ? (step === currentStep ? 'w-8 bg-teal-500' : 'w-4 bg-teal-800') : 'w-2 bg-slate-700'}`} />
      ))}
    </div>
  );

  if (isLoading) return <div className="h-dvh bg-[#0f172a] flex items-center justify-center"><Loader2 className="h-10 w-10 text-teal-500 animate-spin" /></div>;

  return (
    <div className="h-dvh w-full bg-[#0f172a] text-white flex flex-col overflow-hidden relative">

      <div className="flex-none pt-safe px-4 pb-2 bg-[#0f172a] z-10">
        <div className="flex justify-between items-center py-3">
          <button onClick={handleBack} className="p-2 -ml-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="font-semibold text-lg">{formInfo.title}</span>
          <div className="w-10" />
        </div>
        {renderStepIndicator()}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth">
        <div className="max-w-md mx-auto h-full flex flex-col pt-6 min-h-[400px]">

          {feedbackType === 'complaint' && currentStep === 1 && (
            <div className="step-content space-y-6">
              <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <CalendarIcon className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">{tf.stepsUI.evidenceTitle}</h2>
                <p className="text-slate-400">{tf.stepsUI.evidenceDesc}</p>
              </div>

              {branches.length > 1 && (
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <BranchSelector
                    branches={branches}
                    selectedBranch={selectedBranch}
                    onSelect={setSelectedBranch}
                  />
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-300 ml-1">{tf.receipt.label}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setHasReceipt(false); setReceiptFile(null); }} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${!hasReceipt ? 'bg-red-500/10 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <X className="h-6 w-6" />
                    <span className="font-medium">{tf.receipt.noReceipt}</span>
                  </button>
                  <button onClick={() => setHasReceipt(true)} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${hasReceipt ? 'bg-teal-500/10 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="font-medium">{tf.receipt.hasReceipt}</span>
                  </button>
                </div>
              </div>

              {hasReceipt ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <label className="block bg-slate-800 border-2 border-dashed border-slate-600 hover:border-teal-500 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                    <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                    {receiptPreview ? (
                      <div className="relative">
                        <img src={receiptPreview} className="h-48 w-full object-contain rounded-lg mx-auto" alt="Receipt Preview" />
                        <button onClick={(e) => { e.preventDefault(); setReceiptFile(null); setReceiptPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X className="h-4 w-4 text-white" /></button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-10 w-10 text-slate-400 mx-auto group-hover:text-teal-400 transition-colors" />
                        <p className="text-sm text-slate-400 font-medium">{tf.receipt.placeholder}</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <label className="text-sm text-slate-400 mb-2 block">{tf.receipt.dateLabel}</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      lang={language === 'tr' ? 'tr-TR' : 'en-US'}
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      max={getCurrentLocalISOString()}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white [color-scheme:dark] focus:border-teal-500 outline-none"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
                  </div>
                  {visitDate && (
                    <div className="mt-3 flex items-center gap-2 text-teal-400 text-sm font-medium bg-teal-500/10 p-3 rounded-lg border border-teal-500/20">
                      <Clock className="w-4 h-4 shrink-0" />
                      {format(new Date(visitDate), language === 'tr' ? 'd MMMM yyyy, EEEE - HH:mm' : 'MMMM do yyyy, EEEE - h:mm a', { locale: language === 'tr' ? tr : enUS })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {((feedbackType === 'complaint' && currentStep === 2) || (feedbackType === 'suggestion' && currentStep === 1)) && (
            <div className="step-content space-y-6 h-full flex flex-col">
              <div className="text-center space-y-2 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">
                  {feedbackType === 'complaint' ? tf.stepsUI.problemTitle : tf.stepsUI.suggestionTitle}
                </h2>
                <p className="text-slate-400">{tf.stepsUI.problemDesc}</p>
              </div>
              <div className="flex-1 min-h-[200px]">
                <div className="relative h-full bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
                  <div className="absolute top-4 left-4 text-slate-500 pointer-events-none">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 1000) setMessage(val);
                    }}
                    maxLength={1000}
                    placeholder={tf.message.placeholder}
                    className="w-full h-full bg-transparent p-4 pl-12 text-base text-white placeholder:text-slate-500 resize-none outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <p className={`text-xs text-right ${message.length < 10 ? 'text-red-400' : 'text-teal-500'}`}>{message.length}/1000 (Min 10)</p>
            </div>
          )}

          {feedbackType === 'review' && currentStep === 1 && (
            <div className="step-content flex flex-col items-center justify-center space-y-8 py-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">{tf.stepsUI.rateTitle}</h2>
                <p className="text-slate-400">{tf.stepsUI.rateDesc}</p>
              </div>

              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className={`group transition-transform focus:outline-none ${animatingStar === star && star >= 3 ? 'animate-star-pop' : 'hover:scale-110 active:scale-95'}`}
                  >
                    <Star className={cn(
                      "w-12 h-12 transition-colors duration-300",
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                        : "text-slate-700"
                    )} />
                  </button>
                ))}
              </div>

              <div className="h-10 flex items-center justify-center">
                {rating > 0 && (
                  <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className={`text-xl font-bold ${rating >= 4 ? 'text-green-400' : rating === 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {getEmojiForRating(rating, tf.rating.emojis)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{getReactionMessage(rating, tf)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {((feedbackType === 'complaint' && currentStep === 3) || (feedbackType === 'suggestion' && currentStep === 2) || (feedbackType === 'review' && currentStep === 2)) && (
            <div className="step-content space-y-6 pb-20">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white">{tf.stepsUI.finalTitle}</h2>
                <p className="text-slate-400">{tf.stepsUI.finalDesc}</p>
              </div>

              {feedbackType !== 'review' && (
                <div
                  className={cn(
                    "bg-slate-800/30 p-5 rounded-2xl border transition-all duration-500 space-y-4 shadow-sm",
                    generalRating >= 4 ? "border-yellow-500/50 glow-success bg-slate-800/60" :
                      generalRating === 3 ? "border-orange-400/40" :
                        generalRating > 0 ? "border-red-500/40 bg-red-500/5" :
                          "border-slate-700"
                  )}
                >
                  <div className="text-center">
                    <label className="text-sm text-slate-300 mb-3 block font-medium">{tf.general.title} ({t('common.optional', { defaultValue: 'Optional' })})</label>
                    <div className="flex justify-center gap-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleStarClick(star, true)}
                          className={animatingStar === star && star >= 3 ? 'animate-star-pop' : 'transition-transform duration-200 active:scale-95'}
                        >
                          <Star className={cn(
                            "w-9 h-9 transition-colors duration-300",
                            star <= generalRating
                              ? (generalRating >= 4 ? "fill-yellow-400 text-yellow-400" :
                                generalRating === 3 ? "fill-orange-400 text-orange-400" :
                                  "fill-red-500 text-red-500")
                              : "text-slate-700"
                          )} />
                        </button>
                      ))}
                    </div>

                    {generalRating > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                        <p className={cn(
                          "text-xs mt-3 font-medium px-3 py-1.5 rounded-full inline-block border",
                          generalRating >= 4 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                            generalRating === 3 ? "text-orange-300 bg-orange-400/10 border-orange-400/20" :
                              "text-red-300 bg-red-500/10 border-red-500/20"
                        )}>
                          {getReactionMessage(generalRating, tf)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative group">
                    <div className="absolute top-3 left-3 text-slate-500 group-focus-within:text-teal-500 transition-colors pointer-events-none">
                      <PenLine className="w-4 h-4" />
                    </div>
                    <textarea
                      value={generalComment}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 500) setGeneralComment(val);
                      }}
                      maxLength={500}
                      placeholder={getDynamicPlaceholder(generalRating, tf)}
                      className="w-full bg-slate-950/50 border border-slate-600/50 rounded-xl p-3 pl-10 text-sm text-white resize-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                      rows={3}
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] ${generalComment.length >= 500 ? 'text-red-400' : 'text-slate-500'}`}>
                        {generalComment.length}/500
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {feedbackType === 'review' && (
                <div className="relative h-32 bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
                  <div className="absolute top-4 left-4 text-slate-500 pointer-events-none">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 1000) setMessage(val);
                    }}
                    maxLength={1000}
                    placeholder={tf.message.placeholder}
                    className="w-full h-full bg-transparent p-4 pl-12 text-white resize-none outline-none placeholder:text-slate-500"
                  />
                  <div className="absolute bottom-2 right-4">
                    <span className={`text-[10px] ${message.length >= 1000 ? 'text-red-400' : 'text-slate-500'}`}>
                      {message.length}/1000
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-300">{tf.stepsUI.extraImages}</label>
                  <span className="text-xs text-slate-500">{feedbackImages.length}/3</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {feedbackImages.map((img, i) => (
                    <div key={i} className="relative aspect-square bg-black rounded-lg overflow-hidden border border-slate-700 group">
                      <img src={img.preview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Feedback Preview" />
                      <button onClick={() => setFeedbackImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 p-1"><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                  {feedbackImages.length < 3 && (
                    <label className="aspect-square bg-slate-800/50 border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-teal-500/50 transition-all group">
                      <ImagePlus className="w-6 h-6 text-slate-500 group-hover:text-teal-500 transition-colors" />
                      <span className="text-[10px] text-slate-500 mt-1 group-hover:text-slate-300">{tf.stepsUI.addPhoto}</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>

              {isGuest && feedbackType === 'complaint' && (
                <div className="bg-orange-900/10 border border-orange-500/20 rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-full shrink-0">
                      <Phone className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white mb-1">{tf.guestContact.title}</h4>
                      <p className="text-xs text-slate-400 mb-3">
                        {tf.guestContact.desc}
                      </p>

                      {!wantsGuestContact ? (
                        <Button
                          onClick={() => setWantsGuestContact(true)}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white border-none h-9 text-xs font-semibold shadow-lg shadow-orange-900/20"
                        >
                          {tf.guestContact.yes}
                        </Button>
                      ) : (
                        <div className="space-y-3 mt-3 animate-in fade-in zoom-in-95">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 ml-1">{tf.guestContact.name}</label>
                            <input
                              type="text"
                              value={guestName}
                              onChange={(e) => {
                                const val = e.target.value;
                                const formatted = val.replace(/(^|\s)[a-zğüşiöç]/g, (c) => c.toLocaleUpperCase('tr-TR'));
                                setGuestName(formatted);
                              }}
                              placeholder={tf.guestContact.namePlaceholder}
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none capitalize"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 ml-1">{tf.guestContact.phone}</label>
                            <input
                              type="tel"
                              value={guestPhone}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9+]/g, '');
                                setGuestPhone(val);
                              }}
                              placeholder="0555..."
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none font-mono tracking-wide"
                            />
                          </div>
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => { setWantsGuestContact(false); setGuestName(''); setGuestPhone(''); }}
                              className="text-xs text-slate-400 hover:text-red-400 underline py-2 px-3 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              {tf.guestContact.cancel}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <div className="flex-none p-4 pb-safe bg-[#0f172a] border-t border-slate-800 z-20">
        <Button
          onClick={currentStep === totalSteps ? submitFeedback : handleNext}
          disabled={!isStepValid() || isSubmitting}
          className={cn(
            "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95",
            "bg-gradient-to-r hover:opacity-90",
            formInfo.gradient
          )}
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> :
            (currentStep === totalSteps) ?
              <span className="flex items-center gap-2">{tf.submit.send} <Send className="w-5 h-5" /></span> :
              <span className="flex items-center gap-2">{tf.next} <ChevronRight className="w-5 h-5" /></span>
          }
        </Button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl p-8 text-center border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none" />

            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">
              {googleRedirectUrl ? tf.google.title : tf.success.title}
            </h2>

            <p className="text-slate-400 mb-8 text-lg">
              {googleRedirectUrl ? tf.google.desc : t('form.success.desc', { name: businessName || "management" })}
            </p>

            {googleRedirectUrl && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center animate-in zoom-in duration-500">
                  <p className="text-blue-300 font-bold text-sm flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> {tf.google.copyAlert}
                  </p>
                </div>
                <Button onClick={handleGoogleShare} className="w-full bg-teal-600 text-white hover:bg-teal-500 h-14 rounded-xl font-bold text-lg animate-pulse shadow-xl shadow-teal-500/20">
                  {tf.google.yesButton}
                </Button>

                {instagramRedirectUrl && (
                  <Button onClick={() => window.open(instagramRedirectUrl, '_blank')} variant="outline" className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10 h-12 rounded-xl border-2 transition-all duration-300">
                    <Instagram className="w-4 h-4 mr-2 stroke-[2.5px]" /> {tf.google.instaButton}
                  </Button>
                )}

                <button onClick={() => navigate('/customer-panel')} className="text-slate-500 text-sm font-medium p-2 hover:text-white transition-colors">
                  {tf.google.noButton}
                </button>
              </div>
            )}

            {!googleRedirectUrl && instagramRedirectUrl && (
              <div className="space-y-4">
                <Button onClick={() => window.open(instagramRedirectUrl, '_blank')} className="w-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white h-14 rounded-xl font-bold text-lg shadow-xl shadow-pink-600/20 transition-all duration-300">
                  <Instagram className="w-6 h-6 mr-2 stroke-[2.5px]" /> {tf.google.instaButton}
                </Button>
                <Button onClick={() => navigate('/customer-panel')} variant="ghost" className="w-full text-slate-400 hover:text-white">
                  {tf.success.homeButton}
                </Button>
              </div>
            )}

            {!googleRedirectUrl && !instagramRedirectUrl && (
              <Button onClick={() => navigate('/customer-panel')} className="w-full bg-slate-700 hover:bg-slate-600 h-12 rounded-xl text-white font-bold">
                {tf.success.homeButton}
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
