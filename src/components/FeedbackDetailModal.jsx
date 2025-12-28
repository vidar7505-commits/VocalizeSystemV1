import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Star, Calendar, User, Mail, Phone, MessageSquare,
  AlertTriangle, Image as ImageIcon, Building2, StickyNote, Save, 
  Loader2, Crown, FileText, Copy, Hash, Download,
  ZoomIn, ChevronLeft, ChevronRight, Siren, Trash2, Lightbulb, Receipt,
  BarChart, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import CustomerProfileModal from './CustomerProfileModal';
import { cn, formatCustomerName, getCustomerData } from "@/lib/utils";

const FeedbackDetailModal = ({ feedback, isOpen, onClose, onFeedbackUpdate, onStatusChange, scrollToNotes = false }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(feedback?.status || 'new');
  const [managerNote, setManagerNote] = useState('');
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState(null);

  const [customerStats, setCustomerStats] = useState(null);
  const [customerJoinDate, setCustomerJoinDate] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

  const [liveProfileData, setLiveProfileData] = useState(null);
  const notesSectionRef = useRef(null);

  // --- SÜZGEÇ (HATA ÖNLEYİCİ) ---
  const normalizeUrl = (u) => {
    if (!u) return null;
    const s = String(u).trim();
    if (/^[a-zA-Z]:\\/.test(s) || s.includes("\\")) return null; 
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:") || s.startsWith("data:")) return s;
    return null;
  };

  const activeName = liveProfileData?.name || getCustomerData(feedback, 'name');
  const formattedName = formatCustomerName(activeName);
  const displayPhone = (liveProfileData?.phone && liveProfileData.phone.length > 3) ? liveProfileData.phone : (feedback.customer_phone || '-');
  const displayEmail = (liveProfileData?.email && liveProfileData.email.length > 3) ? liveProfileData.email : (feedback.customer_email || '-');
  const isVip = liveProfileData?.flag_vip_customer || feedback?.customer_profiles?.flag_vip_customer || feedback?.flag_vip_customer || false;
  const isSensitive = liveProfileData?.flag_sensitive_customer || feedback?.customer_profiles?.flag_sensitive_customer || feedback?.flag_sensitive_customer || false;
  const customerProfileNote = liveProfileData?.admin_note || feedback?.customer_profiles?.admin_note || null;

  // GÜVENLİ RESİM LİSTESİ
  const allImages = [
    ...(feedback?.feedback_images || []), 
    ...(feedback?.image_urls || []), 
    feedback?.product_image_url, 
    ...(feedback?.receipt_images || []), 
    feedback?.receipt_url
  ].map(normalizeUrl).filter(Boolean);

  const hasGeneralEval = feedback.general_eval_rating || feedback.general_eval_comment;

  useEffect(() => { if (isOpen && scrollToNotes && notesSectionRef.current) setTimeout(() => notesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }, [isOpen, scrollToNotes]);

  useEffect(() => {
    if (feedback && isOpen) {
      setCurrentStatus(feedback.status);
      setManagerNote(feedback.manager_note || '');
      setLiveProfileData(null);
      fetchCustomerData();
      if (feedback.manager_note_updated_at && feedback.manager_note_updated_by) fetchUpdaterInfo(feedback.manager_note_updated_by, feedback.manager_note_updated_at);
    }
  }, [feedback, isOpen]);

  const fetchCustomerData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const cEmail = getCustomerData(feedback, 'email');
      const cProfileId = feedback.customer_profile_id;
      let statsQuery = supabase.from('feedbacks').select('feedback_type', { count: 'exact' }).eq('business_id', feedback.business_id);
      if (cProfileId) statsQuery = statsQuery.eq('customer_profile_id', cProfileId);
      else if (cEmail) statsQuery = statsQuery.eq('customer_email', cEmail);
      else { setStatsLoading(false); return; }

      const { data: statsData } = await statsQuery;
      if (statsData) {
        setCustomerStats({
          total: statsData.length,
          complaints: statsData.filter(f => f.feedback_type === 'complaint').length,
          suggestions: statsData.filter(f => f.feedback_type === 'suggestion').length,
          evaluations: statsData.filter(f => ['evaluation', 'rating', 'review'].includes(f.feedback_type)).length
        });
      }

      let profileData = null;
      if (cProfileId && cProfileId !== 'guest') {
        const { data } = await supabase.from('customer_profiles').select('*, users(first_name, last_name)').eq('id', cProfileId).maybeSingle();
        profileData = data;
      } else if (cEmail) {
        const { data } = await supabase.from('customer_profiles').select('*, users(first_name, last_name)').eq('email', cEmail).maybeSingle();
        profileData = data;
      }
      if (profileData) { setLiveProfileData(profileData); setCustomerJoinDate(profileData.created_at); }
    } catch (err) { console.error("Error", err); } finally { setStatsLoading(false); }
  }, [feedback]);

  const fetchUpdaterInfo = async (userId, updatedAt) => {
    if (!userId) return;
    const { data } = await supabase.from('users').select('first_name, last_name').eq('id', userId).single();
    if (data) setLastUpdatedInfo(`${data.first_name} ${data.last_name || ''} - ${new Date(updatedAt).toLocaleString('tr-TR')}`);
  };

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('feedbacks').update({ status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', feedback.id);
      if (error) throw error;
      setCurrentStatus(newStatus);
      toast({ title: "Güncellendi", description: `Durum: ${getStatusLabel(newStatus)}` });
      if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { status: newStatus });
      else if (onStatusChange) onStatusChange(feedback.id, newStatus);
    } catch (e) { toast({ variant: "destructive", title: "Hata" }); } finally { setIsUpdating(false); }
  };

  const handleSaveNote = async () => {
    if (!user) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('feedbacks').update({ manager_note: managerNote, manager_note_updated_by: user.id, manager_note_updated_at: new Date().toISOString() }).eq('id', feedback.id);
      if (error) throw error;
      toast({ title: "Not kaydedildi" });
      if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { manager_note: managerNote });
      const { data } = await supabase.from('users').select('first_name, last_name').eq('id', user.id).single();
      if (data) setLastUpdatedInfo(`${data.first_name} ${data.last_name || ''} - ${new Date().toLocaleString('tr-TR')}`);
    } catch (e) { toast({ variant: "destructive", title: "Hata" }); } finally { setIsSavingNote(false); }
  };

  const handleRemoveNote = async () => {
    if (!user) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('feedbacks').update({ manager_note: '', manager_note_updated_by: user.id, manager_note_updated_at: new Date().toISOString() }).eq('id', feedback.id);
      if (error) throw error;
      setManagerNote('');
      toast({ title: "Not silindi" });
      if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { manager_note: '' });
    } catch (e) { toast({ variant: "destructive", title: "Hata" }); } finally { setIsSavingNote(false); }
  };

  const handlePrevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  const handleNextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const handleOpenImage = () => { const link = document.createElement('a'); link.href = allImages[currentImageIndex]; link.target = '_blank'; link.click(); };

  const getStatusLabel = (status) => {
    const labels = { new: "Yeni", pending: "Beklemede", in_progress: "İşlemde", resolved: "Çözüldü", escalated: "Acil" };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = { new: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", pending: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", resolved: "bg-green-500/10 text-green-500 border-green-500/20", escalated: "bg-red-500/10 text-red-500 border-red-500/20" };
    return colors[status] || "bg-slate-500/10 text-slate-500";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-900 border border-slate-700 text-slate-100 p-0">
          <DialogHeader className="sticky top-0 bg-slate-900 z-20 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0" /> Geri Bildirim Detayı
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
            {/* Customer Info */}
            <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700/50 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase flex items-center gap-2">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Müşteri
                </h3>
                {customerProfileNote && <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400">Not Var</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">Ad Soyad</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{formattedName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">E-posta</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">Telefon</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{displayPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">Şube</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{feedback?.branches?.branch_name_tr || '-'}</p>
                  </div>
                </div>
              </div>
              {(isVip || isSensitive) && (
                <div className="flex flex-wrap gap-2">
                  {isVip && <Badge className="bg-purple-900/30 text-purple-300 border-purple-500/30"><Crown className="w-3 h-3 mr-1" /> VIP</Badge>}
                  {isSensitive && <Badge className="bg-orange-900/30 text-orange-300 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Hassas</Badge>}
                </div>
              )}
            </div>

            {/* Feedback Info */}
            <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700/50 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-900/50 p-2 sm:p-3 rounded border border-slate-700/30">
                  <p className="text-slate-500 text-[10px]">Tarih</p>
                  <p className="font-semibold text-white text-sm">{new Date(feedback.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="bg-slate-900/50 p-2 sm:p-3 rounded border border-slate-700/30">
                  <p className="text-slate-500 text-[10px]">Durum</p>
                  <p className="font-semibold text-white text-sm">{getStatusLabel(feedback.status)}</p>
                </div>
                <div className="bg-slate-900/50 p-2 sm:p-3 rounded border border-slate-700/30">
                  <p className="text-slate-500 text-[10px]">Tür</p>
                  <p className="font-semibold text-white text-sm truncate">{feedback.feedback_type}</p>
                </div>
              </div>
            </div>

            {/* Rating */}
            {feedback.rating && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs font-semibold text-yellow-400 uppercase mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" /> Puanlama
                </h4>
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 sm:w-5 sm:h-5 ${i < feedback.rating ? "fill-yellow-500 text-yellow-500" : "fill-none text-slate-600"}`} />
                  ))}
                  <span className="text-sm font-bold text-white ml-2">{feedback.rating} / 5</span>
                </div>
              </div>
            )}

            {/* General Eval */}
            {hasGeneralEval && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 sm:p-4 space-y-2">
                <h4 className="text-xs font-semibold text-teal-400 uppercase flex items-center gap-2">
                  <BarChart className="w-3.5 h-3.5" /> Genel Değerlendirme
                </h4>
                {feedback.general_eval_rating && (
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < feedback.general_eval_rating ? "fill-yellow-500 text-yellow-500" : "fill-none text-slate-600"}`} />
                    ))}
                    <span className="text-xs sm:text-sm font-bold text-white">{feedback.general_eval_rating} / 5</span>
                  </div>
                )}
                {feedback.general_eval_comment && (
                  <div className="bg-slate-900/50 p-2 sm:p-3 rounded-md border border-slate-700/30">
                    <p className="text-xs sm:text-sm text-slate-300 italic break-words">"{feedback.general_eval_comment}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700/50 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Müşteri Mesajı
              </h4>
              <div className="bg-slate-900/80 p-3 sm:p-4 rounded-md border border-slate-700/50 min-h-[60px] sm:min-h-[80px]">
                <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed break-words">{feedback.message || <span className="text-slate-500 italic">Mesaj yok.</span>}</p>
              </div>

              {/* Images */}
              {allImages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-teal-400 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" /> Görseller ({allImages.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {allImages.map((url, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-square bg-slate-950 rounded-lg border border-slate-700 overflow-hidden cursor-zoom-in group" 
                        onClick={() => { setLightboxImages(allImages); setCurrentImageIndex(idx); setLightboxOpen(true); }}
                      >
                        <img src={url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="feedback" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div ref={notesSectionRef} className="bg-amber-900/10 rounded-lg p-3 sm:p-4 border border-amber-700/30 scroll-mt-20 space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <StickyNote className="w-3.5 h-3.5" /> Yönetici Notu
              </h3>
              <textarea 
                className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-slate-200 min-h-[80px] sm:min-h-[100px] resize-none" 
                placeholder="Özel notlar..." 
                value={managerNote} 
                onChange={(e) => setManagerNote(e.target.value)} 
              />
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 italic">{lastUpdatedInfo}</span>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRemoveNote} 
                    disabled={isSavingNote || !managerNote} 
                    className="h-7 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Sil
                  </Button>
                  <Button 
                    onClick={handleSaveNote} 
                    disabled={isSavingNote} 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
                  >
                    {isSavingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-2" />} Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-slate-800 flex-shrink-0 space-y-3 bg-slate-900/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['pending', 'in_progress', 'resolved', 'escalated'].map(status => (
                <Button 
                  key={status} 
                  onClick={() => handleStatusUpdate(status)} 
                  disabled={isUpdating || currentStatus === status} 
                  variant="outline" 
                  className={`border-slate-700 text-xs h-8 ${currentStatus === status ? getStatusColor(status) : 'text-slate-400'}`}
                >
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-8"
              >
                Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/95 p-3 sm:p-4 animate-in fade-in duration-300"
          onClick={() => setLightboxOpen(false)}
        >
          <Button 
            variant="ghost" 
            className="absolute top-3 sm:top-5 right-3 sm:right-5 text-white hover:bg-white/20 rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 z-[100001]" 
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </Button>

          <div className="relative w-full h-full pointer-events-none flex flex-col items-center justify-center">
            {allImages.length > 1 && (
              <Button 
                variant="ghost" 
                className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full w-10 h-10 sm:w-14 sm:h-14 p-0 z-[100001] pointer-events-auto" 
                onClick={handlePrevImage}
              >
                <ChevronLeft className="w-6 h-6 sm:w-10 sm:h-10" />
              </Button>
            )}

            <img 
              src={allImages[currentImageIndex]} 
              className="relative z-[100000] max-w-[90vw] max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
              alt="Geri bildirim görseli" 
              onClick={(e) => e.stopPropagation()}
            />

            {allImages.length > 1 && (
              <Button 
                variant="ghost" 
                className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full w-10 h-10 sm:w-14 sm:h-14 p-0 z-[100001] pointer-events-auto" 
                onClick={handleNextImage}
              >
                <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10" />
              </Button>
            )}

            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-6 z-[100001] pointer-events-auto bg-black/50 px-3 sm:px-6 py-2 sm:py-3 rounded-full backdrop-blur-sm">
              <span className="text-white/90 text-xs sm:text-sm font-medium">{currentImageIndex + 1} / {allImages.length}</span>
              <div className="h-3 sm:h-4 w-px bg-white/30" />
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 h-auto p-0 px-2 font-normal gap-1 text-xs sm:text-sm" 
                onClick={handleOpenImage}
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" /> 
                <span className="hidden sm:inline">Görseli Aç</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && <CustomerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} customerProfileId={feedback.customer_profile_id} customerEmail={displayEmail !== '-' ? displayEmail : null} businessId={feedback.business_id} onFlagsUpdate={(id, f, email) => { setLiveProfileData(prev => ({ ...prev, flag_vip_customer: f.vip, flag_sensitive_customer: f.sensitive, admin_note: f.admin_note })); }} />}
    </>
  );
};

export default FeedbackDetailModal;