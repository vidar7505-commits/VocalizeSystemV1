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
    // Yerel yolları engelle
    if (/^[a-zA-Z]:\\/.test(s) || s.includes("\\")) return null; 
    // Sadece web linklerini kabul et
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
      const now = new Date().toISOString();
      const { error } = await supabase.from('feedbacks').update({ manager_note: managerNote, manager_note_updated_by: user.id, manager_note_updated_at: now }).eq('id', feedback.id);
      if (error) throw error;
      toast({ title: "Not Kaydedildi", className: "bg-green-600 text-white border-none" });
      setLastUpdatedInfo(`Siz - ${new Date(now).toLocaleString('tr-TR')}`);
      if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { manager_note: managerNote });
      else if (onStatusChange) onStatusChange(feedback.id, currentStatus, managerNote);
    } catch (e) { toast({ variant: "destructive", title: "Hata" }); } finally { setIsSavingNote(false); }
  };

  const handleRemoveNote = async () => {
    if (!user) return;
    setIsSavingNote(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('feedbacks').update({ manager_note: null, manager_note_updated_by: user.id, manager_note_updated_at: now }).eq('id', feedback.id);
      if (error) throw error;
      setManagerNote('');
      toast({ title: "Not Silindi", className: "bg-red-600 text-white border-none" });
      setLastUpdatedInfo(`Siz - ${new Date(now).toLocaleString('tr-TR')}`);
      if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { manager_note: null });
      else if (onStatusChange) onStatusChange(feedback.id, currentStatus, null);
    } catch (e) { toast({ variant: "destructive", title: "Hata" }); } finally { setIsSavingNote(false); }
  };

  // --- LIGHTBOX İŞLEVLERİ ---
  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // En Güvenli Yöntem: Yeni Sekmede Aç
  const handleOpenImage = (e) => {
    e.stopPropagation();
    const url = allImages[currentImageIndex];
    if (url) window.open(url, '_blank');
  };

  const getStatusLabel = (s) => ({ new: 'Yeni', pending: 'Beklemede', in_progress: 'İşlemde', resolved: 'Çözüldü', escalated: 'Acil' }[s] || s);
  const getStatusColor = (s) => ({ new: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', pending: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50', in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', resolved: 'bg-green-500/20 text-green-400 border-green-500/50', escalated: 'bg-red-500/20 text-red-500 border-red-500 font-bold' }[s] || 'bg-slate-700');
  const getTypeLabel = (t) => ({ complaint: 'Şikayet', suggestion: 'Öneri', evaluation: 'Değerlendirme', review: 'Değerlendirme', rating: 'Değerlendirme' }[t] || 'Geri Bildirim');
  const getHeaderIcon = () => { if (currentStatus === 'escalated') return <Siren className="w-6 h-6 text-white animate-spin-slow" />; return feedback.feedback_type === 'complaint' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Star className="w-5 h-5 text-yellow-500" />; };

  if (!feedback) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="text-slate-100 max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border-slate-800 p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 min-w-0">
                <div className={`p-2 rounded-full flex-shrink-0 ${currentStatus === 'escalated' ? 'bg-red-600 shadow-lg animate-pulse' : 'bg-slate-800'}`}>{getHeaderIcon()}</div>
                <span className="text-white">
                  {currentStatus === 'escalated' ? 'ACİL MÜDAHALE GEREKLİ' : `${getTypeLabel(feedback.feedback_type)} Detayı`}
                </span>
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-shrink-0">
                 {isVip && <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 rounded text-[10px] text-purple-300 border border-purple-500/30 font-medium whitespace-nowrap"><Crown className="w-3 h-3" /><span>VIP</span></div>}
                 {isSensitive && <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 rounded text-[10px] text-orange-300 border border-orange-500/30 font-medium whitespace-nowrap"><AlertTriangle className="w-3 h-3" /><span>Hassas</span></div>}
                 <Badge className={`${getStatusColor(currentStatus)} px-3 py-1 text-sm whitespace-nowrap`}>{getStatusLabel(currentStatus)}</Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 w-full">
            {managerNote && (<div onClick={() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-amber-900/30 transition-colors group"><div className="flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-500" /><span className="text-sm text-amber-200 font-medium">Yönetici notu var</span></div><span className="text-xs text-amber-400 underline">Görüntüle</span></div>)}

            <div className={`rounded-lg p-4 border relative overflow-hidden ${currentStatus === 'escalated' ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Müşteri Bilgileri</h3>
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-white break-words" title={customerProfileNote ? "Müşteri Notu Mevcut" : ""}>{formattedName}</span>
                    </div>
                    {customerJoinDate && (<div className="flex items-center gap-2 text-xs text-slate-400"><User className="w-3 h-3 text-slate-500" /><span>Üyelik: {new Date(customerJoinDate).toLocaleDateString('tr-TR')}</span></div>)}
                  </div>
                  {customerStats ? (
                    <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-medium text-slate-300">Toplam: {customerStats.total}</span>
                      <span className="text-red-400">Şikayet: {customerStats.complaints}</span>
                      <span className="text-blue-400">Öneri: {customerStats.suggestions}</span>
                      <span className="text-yellow-400">Değ.: {customerStats.evaluations}</span>
                    </div>
                  ) : statsLoading ? (<div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor...</div>) : (<div className="text-xs text-slate-500 italic mt-1">Veri yok.</div>)}
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(true)} className="h-8 text-xs border-teal-500/40 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 w-full md:w-auto"><User className="w-3.5 h-3.5 mr-1.5" /> Profili Görüntüle</Button>
                  </div>
                </div>
                <div className="bg-[#111827] p-4 rounded-lg border border-slate-700/50 flex flex-col gap-2 min-w-[250px]">
                  <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Hash className="w-3 h-3" /> Teknik Bilgiler</h3>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-3 py-2"><div className="flex flex-col overflow-hidden flex-1"><span className="text-[10px] text-slate-500">Referans ID</span><code className="text-[10px] sm:text-xs text-indigo-300 font-mono break-all select-all" title={feedback?.id}>{feedback?.id}</code></div><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400" onClick={() => { navigator.clipboard.writeText(feedback.id); toast({ description: "Kopyalandı" }); }}><Copy className="w-4 h-4" /></Button></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-slate-700/50 pt-3 mt-2">
                <div className="flex items-center gap-2 text-slate-300"><Mail className="w-3.5 h-3.5 text-slate-500" /> <span className={!displayEmail || displayEmail === '-' ? "text-slate-500 italic" : ""}>{displayEmail}</span></div>
                <div className="flex items-center gap-2 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-500" /> <span className={!displayPhone || displayPhone === '-' ? "text-slate-500 italic" : ""}>{displayPhone}</span></div>
                <div className="flex items-center gap-2 text-slate-300"><Building2 className="w-3.5 h-3.5 text-slate-500" /> {feedback.branches?.branch_name_tr || 'Bilinmiyor'}</div>
                <div className="flex items-center gap-2 text-slate-300"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {new Date(feedback.created_at).toLocaleString('tr-TR')}</div>
              </div>
            </div>

            {customerProfileNote && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex gap-3 overflow-hidden">
                <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden"><h4 className="text-sm font-bold text-blue-400 mb-1">Müşteri Hakkında Genel Not</h4><p className="text-sm text-slate-300 italic whitespace-pre-wrap break-words">{customerProfileNote}</p></div>
              </div>
            )}

            {hasGeneralEval && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 overflow-hidden">
                <h4 className="text-xs font-semibold text-teal-400 uppercase mb-2 flex items-center gap-2">
                  <BarChart className="w-3.5 h-3.5" /> Genel Değerlendirme
                </h4>
                <div className="flex flex-col gap-2">
                  {feedback.general_eval_rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < feedback.general_eval_rating ? "fill-yellow-500 text-yellow-500" : "fill-none text-slate-600"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-white ml-1">{feedback.general_eval_rating} / 5</span>
                    </div>
                  )}
                  {feedback.general_eval_comment && (
                    <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700/30">
                      <p className="text-sm text-slate-300 italic">"{feedback.general_eval_comment}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`rounded-lg p-5 border overflow-hidden ${currentStatus === 'escalated' ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="mb-2"><h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Müşteri Mesajı</h4></div>
              <div className="bg-slate-900/80 p-4 rounded-md border border-slate-700/50 min-h-[80px] overflow-hidden">
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words">{feedback.message || <span className="text-slate-500 italic">Mesaj yok.</span>}</p>
                
                {/* ✅ DÜZELTİLDİ: ANA DEĞERLENDİRME PUANI EKLENDİ */}
                {(feedback.rating || feedback.overall_rating) && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/30">
                    <span className="text-xs text-slate-400 font-medium">Puan:</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < (feedback.rating || feedback.overall_rating) ? "fill-yellow-500 text-yellow-500" : "fill-none text-slate-600"}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-yellow-500 ml-1">
                      {feedback.rating || feedback.overall_rating} / 5
                    </span>
                  </div>
                )}
              </div>
              
              {allImages.length > 0 && (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-teal-400 mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Görseller ({allImages.length})</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {allImages.map((url, idx) => (
                        <div 
                          key={idx} 
                          className="relative aspect-square bg-slate-950 rounded-lg border-2 border-slate-700 overflow-hidden cursor-zoom-in group" 
                          onClick={() => { setLightboxImages(allImages); setCurrentImageIndex(idx); setLightboxOpen(true); }}
                        >
                          <img src={url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="feedback" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                             <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={notesSectionRef} className="bg-amber-900/10 rounded-lg p-4 border border-amber-700/30 scroll-mt-20 overflow-hidden">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-2"><StickyNote className="w-4 h-4" /> Yönetici Notu</h3></div>
              <textarea className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-3 text-sm text-slate-200 min-h-[100px]" placeholder="Özel notlar..." value={managerNote} onChange={(e) => setManagerNote(e.target.value)} />
              <div className="flex justify-between items-center mt-3"><span className="text-xs text-slate-500 italic">{lastUpdatedInfo}</span>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleRemoveNote} disabled={isSavingNote || !managerNote} className="h-8 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50"><Trash2 className="w-3 h-3 mr-1" /> Sil</Button>
                  <Button onClick={handleSaveNote} disabled={isSavingNote} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-8">{isSavingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-2" />} Kaydet</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['pending', 'in_progress', 'resolved', 'escalated'].map(status => (<Button key={status} onClick={() => handleStatusUpdate(status)} disabled={isUpdating || currentStatus === status} variant="outline" className={`border-slate-700 text-xs md:text-sm ${currentStatus === status ? getStatusColor(status) : 'text-slate-400'}`}>{getStatusLabel(status)}</Button>))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Kapat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* --- LIGHTBOX (KESİN VE BASİT ÇÖZÜM) --- */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Kapat Butonu */}
          <Button 
            variant="ghost" 
            className="absolute top-5 right-5 text-white hover:bg-white/20 rounded-full w-12 h-12 p-0 z-[100001]" 
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
          >
            <X className="w-8 h-8" />
          </Button>

          {/* İçerik */}
          <div className="relative w-full h-full pointer-events-none flex flex-col items-center justify-center">
            
            {allImages.length > 1 && (
              <Button variant="ghost" className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full w-16 h-16 p-0 z-[100001] pointer-events-auto" onClick={handlePrevImage}>
                <ChevronLeft className="w-10 h-10" />
              </Button>
            )}

            <img 
              src={allImages[currentImageIndex]} 
              className="relative z-[100000] max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
              alt="Geri bildirim görseli" 
            />

            {allImages.length > 1 && (
              <Button variant="ghost" className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full w-16 h-16 p-0 z-[100001] pointer-events-auto" onClick={handleNextImage}>
                <ChevronRight className="w-10 h-10" />
              </Button>
            )}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[100001] pointer-events-auto bg-black/50 px-6 py-3 rounded-full backdrop-blur-sm">
              <span className="text-white/90 text-sm font-medium select-none">{currentImageIndex + 1} / {allImages.length}</span>
              <div className="h-4 w-px bg-white/30" />
              {/* SADECE AÇMA BUTONU */}
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 h-auto p-0 px-2 font-normal gap-2" 
                onClick={handleOpenImage}
              >
                <ExternalLink className="w-4 h-4" /> 
                <span className="hidden sm:inline">Görseli Aç</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && <CustomerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} customerProfileId={feedback.customer_profile_id} customerEmail={displayEmail !== '-' ? displayEmail : null} businessId={feedback.business_id} onFlagsUpdate={(id, f, email) => { setLiveProfileData(prev => ({ ...prev, flag_vip_customer: f.vip, flag_sensitive_customer: f.sensitive, admin_note: f.admin_note })); if (onFeedbackUpdate) onFeedbackUpdate(feedback.id, { customer_profile_id: id }); }} />}
    </>
  );
};

export default FeedbackDetailModal;