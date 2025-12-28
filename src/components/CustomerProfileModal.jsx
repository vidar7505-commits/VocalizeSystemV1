import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox"; 
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  User, Mail, Phone, Calendar, Star,
  AlertTriangle, Crown, Save, Loader2, MapPin, StickyNote, Filter, FileText, Trash2,
  Image as ImageIcon 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCustomerName } from "@/lib/utils";
import FeedbackDetailModal from './FeedbackDetailModal'; 

const CustomerProfileModal = ({ isOpen, onClose, customerProfileId, customerEmail, businessId, onFlagsUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [flagUpdaterInfo, setFlagUpdaterInfo] = useState(null);
  
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [flags, setFlags] = useState({ vip: false, sensitive: false });
  
  const [detailFeedback, setDetailFeedback] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNotesOnly, setShowNotesOnly] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFeedbacks([]);
      setProfile(null);
      setFilterType('all');
      setFilterStatus('all');
      setShowNotesOnly(false);
      fetchData();
    }
  }, [isOpen, customerProfileId, customerEmail, businessId]);

  const fetchData = useCallback(async () => {
    if (!businessId) return;

    try {
      let profileData = null;
      let userData = null;

      if (customerProfileId && customerProfileId !== 'guest') {
        const { data } = await supabase.from('customer_profiles').select('*, users(first_name, last_name)').eq('id', customerProfileId).maybeSingle();
        profileData = data;
      }

      if (!profileData && customerEmail) {
        const { data } = await supabase.from('customer_profiles').select('*, users(first_name, last_name)').eq('email', customerEmail).maybeSingle();
        profileData = data;
      }

      if (!profileData && customerEmail) {
         const { data } = await supabase.from('users').select('*').eq('email', customerEmail).eq('user_type', 'customer').maybeSingle();
         userData = data;
      }

      let queryConditions = [];
      if (profileData?.id) queryConditions.push(`customer_profile_id.eq.${profileData.id}`);
      if (customerEmail) queryConditions.push(`customer_email.eq.${customerEmail}`);

      let feedbackData = [];

      if (queryConditions.length > 0) {
          const orString = queryConditions.join(',');
          const { data, error } = await supabase
            .from('feedbacks')
            .select(`
                *,
                branches (id, branch_name_tr),
                customer_profiles (id, admin_note, flag_vip_customer, flag_sensitive_customer)
            `)
            .eq('business_id', businessId)
            .or(orString)
            .order('created_at', { ascending: false });
            
          if (!error) feedbackData = data;
      }

      setFeedbacks(feedbackData || []);

      const phoneFromHistory = feedbackData?.find(f => f.customer_phone)?.customer_phone || null;

      if (profileData) {
        const uFirst = profileData.users?.first_name || '';
        const uLast = profileData.users?.last_name || '';
        const rawName = uFirst ? `${uFirst} ${uLast}` : profileData.name;

        setProfile({ ...profileData, formattedName: formatCustomerName(rawName), phone: profileData.phone || phoneFromHistory || '-', is_virtual: false });
        setNotes(profileData.admin_note || '');
        setFlags({ vip: profileData.flag_vip_customer || false, sensitive: profileData.flag_sensitive_customer || false });

        if (profileData.flag_updated_by) {
          const { data: updater } = await supabase.from('users').select('first_name, last_name').eq('id', profileData.flag_updated_by).maybeSingle();
          if (updater) setFlagUpdaterInfo(`${updater.first_name} ${updater.last_name || ''}`);
        }
      }
      setLoading(false);
    } catch (e) { console.error("Error:", e); setLoading(false); }
  }, [businessId, customerProfileId, customerEmail]);

  const handleToggleVip = useCallback(async (checked) => {
    setFlags(prev => ({ ...prev, vip: checked }));
    await saveChanges({ ...flags, vip: checked }, notes);
  }, [flags, notes]);

  const handleToggleSensitive = useCallback(async (checked) => {
    setFlags(prev => ({ ...prev, sensitive: checked }));
    await saveChanges({ ...flags, sensitive: checked }, notes);
  }, [flags, notes]);

  const saveChanges = async (updatedFlags, updatedNotes) => {
    if (!profile?.id || !user) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase.from('customer_profiles').update({
        admin_note: updatedNotes,
        flag_vip_customer: updatedFlags.vip,
        flag_sensitive_customer: updatedFlags.sensitive,
        flag_updated_by: user.id,
        flag_updated_at: new Date().toISOString()
      }).eq('id', profile.id);
      
      if (error) throw error;
      setFlags(updatedFlags);
      setNotes(updatedNotes);
      toast({ title: "Kaydedildi", description: "Müşteri bilgileri güncellendi." });
      if (onFlagsUpdate) onFlagsUpdate(profile.id, updatedFlags, profile.email);
    } catch (e) { toast({ variant: "destructive", title: "Hata", description: "Değişiklikler kaydedilemedi." }); } finally { setIsSavingNotes(false); }
  };

  const getTypeBadge = (type) => {
    const styles = { complaint: "text-red-400 bg-red-900/20 border-red-900/30", suggestion: "text-blue-400 bg-blue-900/20 border-blue-900/30", evaluation: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30", review: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30", rating: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30" };
    const labels = { complaint: "Şikayet", suggestion: "Öneri", evaluation: "Değerlendirme", review: "Değerlendirme", rating: "Değerlendirme" };
    return <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${styles[type] || "text-slate-400"}`}>{labels[type] || type}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = { new: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", pending: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", resolved: "bg-green-500/10 text-green-500 border-green-500/20", escalated: "bg-red-500/10 text-red-500 border-red-500/20" };
    const labels = { new: "Yeni", pending: "Beklemede", in_progress: "İşlemde", resolved: "Çözüldü", escalated: "Acil" };
    return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap transition-colors ${styles[status] || "bg-slate-500/10 text-slate-500"}`}>{labels[status] || status}</Badge>;
  };

  const hasImages = (f) => {
    return ((f.feedback_images && f.feedback_images.length > 0) || (f.image_urls && f.image_urls.length > 0) || (f.receipt_images && f.receipt_images.length > 0) || f.receipt_url || f.product_image_url);
  };

  const filteredList = useMemo(() => {
    return feedbacks.filter(f => {
        if (filterType !== 'all') { if (filterType === 'evaluation') { if (!['evaluation', 'review', 'rating'].includes(f.feedback_type)) return false; } else { if (f.feedback_type !== filterType) return false; } }
        if (filterStatus !== 'all' && f.status !== filterStatus) return false;
        if (showNotesOnly && !f.manager_note) return false;
        return true;
    });
  }, [feedbacks, filterType, filterStatus, showNotesOnly]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 text-slate-100 p-4 sm:p-6">
          <DialogHeader className="sticky top-0 bg-slate-900 z-10 pb-3 border-b border-slate-800">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" /> Müşteri Profili
            </DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 rounded-lg p-4 sm:p-5 border border-indigo-700/40 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <User className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 uppercase">İsim</p>
                    <p className="font-semibold text-sm truncate">{profile?.formattedName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 uppercase">E-posta</p>
                    <p className="font-semibold text-sm truncate">{profile?.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="w-5 h-5 text-green-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 uppercase">Telefon</p>
                    <p className="font-semibold text-sm truncate">{profile?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 uppercase">Kayıt</p>
                    <p className="font-semibold text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-800/40 rounded-lg p-3 sm:p-4 border border-slate-700/50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm font-medium text-purple-300 flex gap-2 min-w-0">
                        <Crown className="w-4 h-4 shrink-0" /> VIP
                      </label>
                      <Switch checked={flags.vip} onCheckedChange={handleToggleVip} className="data-[state=checked]:bg-purple-600" />
                    </div>
                    <div className="h-px bg-slate-700/50" />
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm font-medium text-orange-300 flex gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> Hassas
                      </label>
                      <Switch checked={flags.sensitive} onCheckedChange={handleToggleSensitive} className="data-[state=checked]:bg-orange-600" />
                    </div>
                  </div>
                  {flagUpdaterInfo && <div className="mt-4 pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 italic">Son güncelleyen: {flagUpdaterInfo}</div>}
                </div>
                
                <div className="sm:col-span-2 bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-500/30 flex flex-col">
                  <h3 className="text-xs sm:text-sm font-semibold text-blue-400 uppercase mb-2 flex gap-2 items-center min-w-0">
                    <FileText className="w-4 h-4 shrink-0" /> Özel Notlar
                  </h3>
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="bg-slate-900/80 border-slate-700 flex-1 min-h-[80px] text-slate-200 text-sm" 
                    placeholder="Müşteri hakkında notlar..." 
                  />
                  <div className="flex justify-end gap-2 mt-2 flex-wrap">
                    {notes && (
                      <Button 
                        size="sm" 
                        onClick={() => { setNotes(''); saveChanges(flags, ''); }} 
                        disabled={isSavingNotes} 
                        className="h-7 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Sil
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => saveChanges(flags, notes)} 
                      disabled={isSavingNotes} 
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Kaydet
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 pb-2 border-b border-slate-700">
                  <h3 className="text-sm sm:text-lg font-bold text-white">Geri Bildirim Geçmişi ({filteredList.length})</h3>
                  <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-auto h-8 text-xs bg-slate-800 border-slate-700">
                        <span className="truncate">{filterType === 'all' ? 'Tüm Tipler' : filterType === 'complaint' ? 'Şikayet' : filterType === 'suggestion' ? 'Öneri' : 'Değerlendirme'}</span>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="complaint">Şikayet</SelectItem>
                        <SelectItem value="suggestion">Öneri</SelectItem>
                        <SelectItem value="evaluation">Değerlendirme</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-auto h-8 text-xs bg-slate-800 border-slate-700">
                        <span className="truncate">{filterStatus === 'all' ? 'Tüm Durumlar' : filterStatus === 'new' ? 'Yeni' : filterStatus === 'pending' ? 'Beklemede' : filterStatus === 'in_progress' ? 'İşlemde' : filterStatus === 'escalated' ? 'Acil' : 'Çözüldü'}</span>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="new">Yeni</SelectItem>
                        <SelectItem value="pending">Beklemede</SelectItem>
                        <SelectItem value="in_progress">İşlemde</SelectItem>
                        <SelectItem value="escalated">Acil</SelectItem>
                        <SelectItem value="resolved">Çözüldü</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 bg-slate-800/50 px-2 py-1.5 rounded-md border border-slate-700 h-8">
                      <Checkbox 
                        id="notes-filter-modal" 
                        checked={showNotesOnly} 
                        onCheckedChange={setShowNotesOnly} 
                        className="border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 w-4 h-4" 
                      />
                      <label htmlFor="notes-filter-modal" className="text-xs font-medium leading-none text-slate-300 cursor-pointer select-none flex items-center gap-1 min-w-0">
                        <StickyNote className="w-3 h-3 text-amber-400 shrink-0" /> <span className="hidden sm:inline">Notlu</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {filteredList.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 border border-dashed border-slate-700/50 rounded-lg">
                    <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-slate-500 italic text-xs sm:text-sm">Kayıt bulunamadı.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {filteredList.map(f => {
                      const rating = f.rating || f.overall_rating;
                      const hasImgs = hasImages(f);
                      const hasManagerNote = !!f.manager_note;
                      return (
                        <div 
                          key={f.id} 
                          onClick={() => setDetailFeedback(f)} 
                          className="group bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 transition-colors cursor-pointer relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              {getTypeBadge(f.feedback_type)}
                              <span className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                            {getStatusBadge(f.status)}
                          </div>
                          <div className="flex gap-2 sm:gap-3 items-start">
                            <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${f.feedback_type === 'complaint' ? 'bg-red-500' : f.feedback_type === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{f.message || <span className="italic text-slate-600">Mesaj yok</span>}</p>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30 gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap"><MapPin className="w-3 h-3" /> {f.branches?.branch_name_tr || 'Şube Yok'}</span>
                                  {rating > 0 && (
                                    <div className="flex items-center gap-0.5 text-yellow-500">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < rating ? 'fill-current' : 'text-slate-700 fill-none'}`} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {hasImgs && (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700/50 rounded text-[9px] sm:text-[10px] text-teal-400 border border-slate-600/50 whitespace-nowrap" title="Görsel Var">
                                      <ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline text-xs">Görsel</span>
                                    </div>
                                  )}
                                  {hasManagerNote && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0" title="Yönetici Notu Var">
                                      <StickyNote className="w-3 h-3 fill-current" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {detailFeedback && <FeedbackDetailModal isOpen={!!detailFeedback} onClose={() => setDetailFeedback(null)} feedback={detailFeedback} onStatusChange={(id, newStatus) => { setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f)); }} />}
    </>
  );
};

export default CustomerProfileModal;