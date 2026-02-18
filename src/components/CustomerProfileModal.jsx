import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Image as ImageIcon, RefreshCw, CheckSquare, Square, CheckCircle2, ListChecks
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCustomerName } from "@/lib/utils";
import FeedbackDetailModal from './FeedbackDetailModal';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const CustomerProfileModal = ({ isOpen, onClose, customerProfileId, customerEmail, businessId, onFlagsUpdate }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
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
  const [selectedIds, setSelectedIds] = useState([]);

  // RETRY LOGIC
  const fetchAttemptRef = useRef(0);
  const maxRetries = 3;

  const canFetchData = useMemo(() => {
    const hasBusinessId = !!businessId;
    const hasUser = !!user;
    return hasBusinessId && hasUser;
  }, [businessId, user]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFeedbacks([]);
      setProfile(null);
      setFilterType('all');
      setFilterStatus('all');
      setShowNotesOnly(false);
      fetchAttemptRef.current = 0;

      if (canFetchData) {
        fetchData();
      } else {
        const timer = setTimeout(() => {
          const checkBusinessId = !!businessId;
          const checkUser = !!user;
          if (checkBusinessId && checkUser) {
            fetchData();
          } else {
            setLoading(false);
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('auth.processError', { defaultValue: 'Oturum bilgileri eksik. Lütfen sayfayı yenileyin.' })
            });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, customerProfileId, customerEmail, businessId, canFetchData, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePopState = () => { onClose(); };
    window.history.pushState({ customerModal: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const fetchData = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    fetchAttemptRef.current += 1;

    try {
      let profileData = null;
      let userData = null;

      if (customerProfileId && customerProfileId !== 'guest') {
        const { data, error } = await supabase
          .from('customer_profiles')
          .select('*, users(first_name, last_name)')
          .eq('id', customerProfileId)
          .maybeSingle();
        if (!error && data) profileData = data;
      }

      if (!profileData && customerEmail) {
        const { data, error } = await supabase
          .from('customer_profiles')
          .select('*, users(first_name, last_name)')
          .eq('email', customerEmail)
          .maybeSingle();
        if (!error && data) profileData = data;
      }

      if (!profileData && customerEmail) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', customerEmail)
          .eq('user_type', 'customer')
          .maybeSingle();
        if (!error && data) userData = data;
      }

      let queryConditions = [];
      if (profileData?.id) queryConditions.push(`customer_profile_id.eq.${profileData.id}`);
      if (customerEmail) queryConditions.push(`customer_email.eq.${customerEmail}`);

      let feedbackData = [];
      if (queryConditions.length > 0) {
        const { data, error } = await supabase
          .from('feedbacks')
          .select(`
            *,
            branches (id, branch_name_tr),
            customer_profiles (id, admin_note),
            customer_age_group
          `)
          .eq('business_id', businessId)
          .ilike('customer_email', customerEmail)
          .order('created_at', { ascending: false });

        if (!error) {
          const processedData = data || [];
          setFeedbacks(processedData);
          feedbackData = processedData;
        }
      }

      const phoneFromHistory = feedbackData?.find(f => f.customer_phone)?.customer_phone || null;

      let businessSpecificData = null;
      if (profileData?.id && businessId) {
        const { data: bData } = await supabase
          .from('business_customers')
          .select('*')
          .eq('business_id', businessId)
          .eq('customer_profile_id', profileData.id)
          .maybeSingle();
        businessSpecificData = bData;
      }

      if (profileData) {
        const uFirst = profileData.users?.first_name || '';
        const uLast = profileData.users?.last_name || '';
        const rawName = uFirst ? `${uFirst} ${uLast}`.trim() : profileData.name;

        setProfile({
          ...profileData,
          formattedName: formatCustomerName(rawName),
          phone: profileData.phone || phoneFromHistory || '-',
          is_virtual: false,
          age_group: profileData.customer_age_group || feedbackData?.find(f => f.customer_age_group)?.customer_age_group || '-'
        });

        setNotes(businessSpecificData?.manager_notes || '');
        setFlags({
          vip: businessSpecificData?.is_vip || false,
          sensitive: businessSpecificData?.is_sensitive || false
        });

        if (profileData.flag_updated_by) {
          const { data: updater } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', profileData.flag_updated_by)
            .single();
          if (updater) {
            setFlagUpdaterInfo(`${updater.first_name} ${updater.last_name || ''}`.trim() +
              ` - ${new Date(profileData.flag_updated_at).toLocaleDateString(i18n.language)}`);
          }
        }
      } else {
        const nameSource = userData || {
          first_name: customerEmail?.split('@')[0] || t('customer.guest'),
          last_name: ''
        };
        const rawName = `${nameSource.first_name} ${nameSource.last_name || ''}`.trim();
        setProfile({
          id: null,
          user_id: userData?.id || null,
          email: customerEmail,
          name: rawName,
          formattedName: formatCustomerName(rawName),
          phone: userData?.phone || phoneFromHistory || '-',
          created_at: userData?.created_at || new Date().toISOString(),
          is_virtual: true,
          age_group: feedbackData?.find(f => f.customer_age_group)?.customer_age_group || '-'
        });
        setNotes('');
        setFlags({ vip: false, sensitive: false });
      }

      setLoading(false);
      fetchAttemptRef.current = 0;
    } catch (error) {
      console.error('❌ fetchData kritik hata:', error);
      if (fetchAttemptRef.current < maxRetries) {
        setRetrying(true);
        setTimeout(() => {
          setRetrying(false);
          fetchData();
        }, 1000 * fetchAttemptRef.current);
      } else {
        setLoading(false);
        toast({
          variant: "destructive",
          title: t('common.error'),
          description: t('form.errorLoad', { defaultValue: 'Müşteri bilgileri yüklenemedi. Lütfen modalı kapatıp tekrar açın.' })
        });
      }
    }
  }, [businessId, customerEmail, customerProfileId, user, toast]);

  const saveChanges = async (newFlags = flags, newNote = notes) => {
    if (!profile || !user) return;
    setIsSavingNotes(true);
    try {
      const now = new Date().toISOString();
      let targetProfileId = profile.id;

      if (profile.is_virtual) {
        const { data: newProfile, error } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: profile.user_id,
            email: profile.email,
            name: profile.name,
            phone: profile.phone === '-' ? null : profile.phone,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();
        if (error) throw error;
        targetProfileId = newProfile.id;
        setProfile(prev => ({ ...prev, ...newProfile, is_virtual: false }));
        if (profile.email) {
          await supabase
            .from('feedbacks')
            .update({ customer_profile_id: targetProfileId })
            .eq('customer_email', profile.email)
            .eq('business_id', businessId);
        }
      }

      const { error: bizError } = await supabase
        .from('business_customers')
        .upsert({
          business_id: businessId,
          customer_profile_id: targetProfileId,
          is_vip: newFlags.vip,
          is_sensitive: newFlags.sensitive,
          manager_notes: newNote,
          last_interaction_at: now,
          updated_at: now
        }, { onConflict: 'business_id, customer_profile_id' });

      if (bizError) throw bizError;
      toast({ title: t('common.save'), className: "bg-green-600 text-white border-none" });
      if (onFlagsUpdate) {
        onFlagsUpdate(targetProfileId, {
          vip: newFlags.vip,
          sensitive: newFlags.sensitive,
          admin_note: newNote
        }, profile.email);
      }
      const userName = user.user_metadata?.first_name || t('common.you', { defaultValue: 'Siz' });
      setFlagUpdaterInfo(`${userName} - ${new Date().toLocaleDateString(i18n.language)}`);
    } catch (e) {
      console.error('❌ saveChanges hatası:', e);
      toast({ variant: "destructive", title: t('common.error'), description: e.message });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleToggleVip = (val) => {
    const next = { ...flags, vip: val, sensitive: val ? false : flags.sensitive };
    setFlags(next);
    saveChanges(next, notes);
  };

  const handleToggleSensitive = (val) => {
    const next = { ...flags, sensitive: val, vip: val ? false : flags.vip };
    setFlags(next);
    saveChanges(next, notes);
  };

  const handleRetry = () => {
    fetchAttemptRef.current = 0;
    setLoading(true);
    fetchData();
  };

  const handleClose = () => {
    if (window.history.state?.customerModal) window.history.back();
    else onClose();
  };

  const getTypeBadge = (type) => {
    const styles = {
      complaint: "text-red-400 bg-red-900/20 border-red-900/30",
      suggestion: "text-blue-400 bg-blue-900/20 border-blue-900/30",
      evaluation: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30",
      review: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30",
      rating: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30"
    };
    const labels = {
      complaint: t('customer.complaintBadge'),
      suggestion: t('customer.suggestionBadge'),
      evaluation: t('customer.reviewBadge'),
      review: t('customer.reviewBadge'),
      rating: t('customer.reviewBadge')
    };
    return (
      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${styles[type] || "text-slate-400"}`}>
        {labels[type] || type}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      pending: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      escalated: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    const labels = {
      new: t('feedbackDetail.statuses.new'),
      pending: t('feedbackDetail.statuses.pending'),
      in_progress: t('feedbackDetail.statuses.in_progress'),
      resolved: t('feedbackDetail.statuses.resolved'),
      escalated: t('feedbackDetail.statuses.escalated')
    };
    return (
      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap ${styles[status] || "text-slate-500"}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const hasImages = (f) => (
    (f.feedback_images && f.feedback_images.length > 0) ||
    (f.receipt_images && f.receipt_images.length > 0)
  );

  const filteredList = useMemo(() => {
    return feedbacks.filter(f => {
      if (filterType !== 'all') {
        if (filterType === 'evaluation') {
          if (!['evaluation', 'review', 'rating'].includes(f.feedback_type)) return false;
        } else if (f.feedback_type !== filterType) return false;
      }
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (showNotesOnly && !f.manager_note) return false;
      return true;
    });
  }, [feedbacks, filterType, filterStatus, showNotesOnly]);

  const customerStats = useMemo(() => {
    if (!feedbacks.length) return { total: 0, avgRating: 0, avgGeneral: 0, complaint: 0, suggestion: 0, evaluation: 0 };
    let totalRating = 0;
    let ratingCount = 0;
    let totalGeneral = 0;
    let generalCount = 0;
    let typeCounts = { complaint: 0, suggestion: 0, evaluation: 0 };

    feedbacks.forEach(f => {
      // Skor hesapla
      const r = f.rating || f.overall_rating;
      if (r > 0) { totalRating += r; ratingCount++; }
      if (f.general_eval_rating > 0) { totalGeneral += f.general_eval_rating; generalCount++; }

      // Tip sayacı
      if (f.feedback_type === 'complaint') typeCounts.complaint++;
      else if (f.feedback_type === 'suggestion') typeCounts.suggestion++;
      else typeCounts.evaluation++; // evaluation, review, rating
    });

    return {
      total: feedbacks.length,
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0",
      avgGeneral: generalCount > 0 ? (totalGeneral / generalCount).toFixed(1) : "0.0",
      ...typeCounts
    };
  }, [feedbacks]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredList.length) setSelectedIds([]);
    else setSelectedIds(filteredList.map(f => f.id));
  };

  const handleBulkUpdate = async (status) => {
    if (selectedIds.length === 0) return;
    const updates = { status, resolved_at: status === 'resolved' ? new Date().toISOString() : null };
    const { error } = await supabase.from('feedbacks').update(updates).in('id', selectedIds);
    if (!error) {
      toast({ title: t('common.success'), description: `${selectedIds.length} ${t('common.updated')}`, className: "bg-green-600 text-white border-none" });
      setFeedbacks(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, ...updates } : f));
      setSelectedIds([]);
    } else { toast({ variant: "destructive", title: t('common.error') }); }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 text-slate-100 p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-400" /> {t('feedbackDetail.detail.viewProfile')}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm sr-only">{t('feedbackDetail.detail.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-slate-400 text-sm">{retrying ? t('common.loading') : t('common.loading')}</p>
              </div>
            ) : !profile ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <p className="text-slate-300">{t('form.errorLoad')}</p>
                <Button onClick={handleRetry} className="bg-teal-600 hover:bg-teal-700 text-white"><RefreshCw className="w-4 h-4 mr-2" /> {t('common.retry', { defaultValue: 'Tekrar Dene' })}</Button>
              </div>
            ) : (
              <>
                <div className="customer-info-block bg-gradient-to-br from-indigo-900/30 to-purple-900/20 rounded-lg p-5 border border-indigo-700/40 grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <User className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="min-w-0"><p className="text-xs text-slate-400 uppercase">{t('auth.fullName')}</p><p className="font-semibold truncate">{profile?.formattedName}</p></div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1"><p className="text-xs text-slate-400 uppercase">{t('auth.email')}</p><p className="font-semibold text-sm break-all">{profile?.email || '-'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone className="w-5 h-5 text-green-400 shrink-0" />
                    <div className="min-w-0"><p className="text-xs text-slate-400 uppercase">{t('feedbackDetail.detail.phone')}</p><p className="font-semibold">{profile?.phone || '-'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="min-w-0"><p className="text-xs text-slate-400 uppercase">{t('feedbackDetail.detail.date')}</p><p className="font-semibold">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(i18n.language) : '-'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <User className="w-5 h-5 text-indigo-300 shrink-0" />
                    <div className="min-w-0"><p className="text-xs text-slate-400 uppercase">{t('feedbackDetail.detail.ageGroup')}</p><p className="font-semibold text-indigo-300">{profile?.age_group || '-'}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {/* Skor Özeti */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('admin.analytics.brandVsExperience.title')}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">{t('admin.dashboard.metrics.avgRating')}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-extrabold text-yellow-500">{customerStats.avgRating}</span>
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        </div>
                      </div>
                      <div className="w-px h-8 bg-slate-700/50" />
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">{t('feedbackDetail.detail.generalEval')}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-extrabold text-blue-400">{customerStats.avgGeneral}</span>
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Etkileşim Dağılımı */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('admin.analytics.activityByTime.title')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-300">{t('feedbackDetail.types.complaint')}:</span>
                        <span className="text-xs font-bold text-white ml-auto pr-4">{customerStats.complaint}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs text-slate-300">{t('feedbackDetail.types.suggestion')}:</span>
                        <span className="text-xs font-bold text-white ml-auto pr-4">{customerStats.suggestion}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className="text-xs text-slate-300">{t('customer.reviewBadge')}:</span>
                        <span className="text-xs font-bold text-white ml-auto pr-4">{customerStats.evaluation}</span>
                      </div>
                      <div className="flex items-center gap-2 border-l border-slate-700/50 pl-3">
                        <span className="text-xs text-slate-500 italic">{t('admin.leaderboard.total')}:</span>
                        <span className="text-xs font-bold text-indigo-400 ml-auto pr-4">{customerStats.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><label className="text-sm font-medium text-purple-300 flex gap-2"><Crown className="w-4 h-4" /> VIP</label>
                        <Switch checked={flags.vip} onCheckedChange={handleToggleVip} className="data-[state=checked]:bg-purple-600" />
                      </div>
                      <div className="h-px bg-slate-700/50" />
                      <div className="flex justify-between items-center"><label className="text-sm font-medium text-orange-300 flex gap-2"><AlertTriangle className="w-4 h-4" /> Hassas</label>
                        <Switch checked={flags.sensitive} onCheckedChange={handleToggleSensitive} className="data-[state=checked]:bg-orange-600" />
                      </div>
                    </div>
                    {flagUpdaterInfo && <div className="mt-4 pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 italic">Son güncelleyen: {flagUpdaterInfo}</div>}
                  </div>
                  <div className="md:col-span-2 bg-blue-900/20 rounded-lg p-4 border border-blue-500/30 flex flex-col">
                    <h3 className="text-sm font-semibold text-blue-400 uppercase mb-2 flex gap-2"><FileText className="w-4 h-4" /> {t('feedbackDetail.detail.guestNote')}</h3>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-slate-900/80 border-slate-700 flex-1 min-h-[80px] text-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500" placeholder={t('common.privateNotePlaceholder', { defaultValue: 'Sadece bu işletme yöneticileri görebilir...' })} />
                    <div className="flex justify-end gap-2 mt-2">
                      {notes && <Button size="sm" onClick={() => { setNotes(''); saveChanges(flags, ''); }} disabled={isSavingNotes} className="h-7 bg-red-600/90 hover:bg-red-600 text-white border border-red-500/60 font-medium shadow-sm"><Trash2 className="w-3 h-3 mr-1" /> {t('common.delete')}</Button>}
                      <Button size="sm" onClick={() => saveChanges(flags, notes)} disabled={isSavingNotes} className="h-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold border border-blue-500/50 shadow-md">
                        {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} {t('common.save')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-bold text-white">{t('admin.sidebar.notifications')} ({filteredList.length})</h3>
                      {filteredList.length > 0 && <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-6 text-xs text-slate-400 hover:text-white">{selectedIds.length === filteredList.length ? t('common.deselectAll', { defaultValue: 'Seçimi Kaldır' }) : t('common.selectAll')}</Button>}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center w-full">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-800 border-slate-700">
                          <span className="truncate">{filterType === 'all' ? t('customer.all') : t(`feedbackDetail.types.${filterType}`, { defaultValue: filterType })}</span>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">{t('customer.all')}</SelectItem><SelectItem value="complaint">{t('customer.complaintBadge')}</SelectItem><SelectItem value="suggestion">{t('customer.suggestionBadge')}</SelectItem><SelectItem value="evaluation">{t('customer.reviewBadge')}</SelectItem></SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-800 border-slate-700">
                          <span className="truncate">{filterStatus === 'all' ? t('customer.filterAllStatuses') : t(`feedbackDetail.statuses.${filterStatus}`, { defaultValue: filterStatus })}</span>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">{t('customer.all')}</SelectItem><SelectItem value="new">{t('feedbackDetail.statuses.new')}</SelectItem><SelectItem value="pending">{t('feedbackDetail.statuses.pending')}</SelectItem><SelectItem value="in_progress">{t('feedbackDetail.statuses.in_progress')}</SelectItem><SelectItem value="escalated">{t('feedbackDetail.statuses.escalated')}</SelectItem><SelectItem value="resolved">{t('feedbackDetail.statuses.resolved')}</SelectItem></SelectContent>
                      </Select>
                      <div className="flex items-center space-x-2 bg-slate-800/50 px-2 py-1.5 rounded-md border border-slate-700 h-8">
                        <Checkbox id="notes-filter-modal" checked={showNotesOnly} onCheckedChange={setShowNotesOnly} className="border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 w-4 h-4" />
                        <label htmlFor="notes-filter-modal" className="text-xs font-medium leading-none text-slate-300 cursor-pointer select-none flex items-center gap-1"><StickyNote className="w-3 h-3 text-amber-400" /> {t('feedbackDetail.detail.managerNote')}</label>
                      </div>
                    </div>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="bg-indigo-900/40 border border-indigo-500/50 p-2 rounded-lg flex flex-col sm:flex-row items-center justify-between mb-3 gap-2">
                      <span className="text-sm text-indigo-200 font-medium ml-2">{selectedIds.length} {t('common.itemSelected')}</span>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleBulkUpdate('pending')} variant="ghost" className="h-7 text-xs text-indigo-300 hover:text-white hover:bg-indigo-800">{t('feedbackDetail.statuses.pending')}</Button>
                        <Button size="sm" onClick={() => handleBulkUpdate('in_progress')} variant="ghost" className="h-7 text-xs text-yellow-300 hover:text-white hover:bg-yellow-800">{t('feedbackDetail.statuses.in_progress')}</Button>
                        <Button size="sm" onClick={() => handleBulkUpdate('resolved')} className="h-7 bg-green-600 hover:bg-green-700 text-white border-none text-xs"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('feedbackDetail.statuses.resolved')}</Button>
                      </div>
                    </div>
                  )}

                  {filteredList.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-lg"><Filter className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" /><p className="text-slate-500 italic text-sm">{t('common.noData')}</p></div>
                  ) : (
                    <div className="space-y-3">
                      {filteredList.map(f => {
                        const r = f.rating || f.overall_rating;
                        const hasImgs = (f.feedback_images?.length > 0 || f.receipt_images?.length > 0);
                        const hasManagerNote = !!f.manager_note;
                        const hasComment = (f.message?.trim().length > 0 || f.general_eval_comment?.trim().length > 0);
                        return (
                          <div key={f.id} className="flex gap-3 items-start group/item">
                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }} className="mt-3 text-slate-500 hover:text-indigo-400 transition-colors shrink-0">
                              {selectedIds.includes(f.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div onClick={() => setDetailFeedback(f)} className="flex-1 group bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 transition-colors cursor-pointer relative overflow-hidden">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">{getTypeBadge(f.feedback_type)}<span className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString(i18n.language)}</span></div>
                                {getStatusBadge(f.status)}
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.feedback_type === 'complaint' ? 'bg-red-500' : f.feedback_type === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 line-clamp-2 break-words">{f.message || <span className="italic text-slate-600">{t('feedbackDetail.detail.noMessage')}</span>}</p>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                                    <div className="flex items-center gap-2 min-w-0"><span className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{f.branches?.branch_name_tr || t('customer.unknown')}</span>
                                      {r > 0 && <div className="flex items-center gap-0.5 text-yellow-500 shrink-0">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r ? 'fill-current' : 'text-slate-700 fill-none'}`} />)}</div>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {hasComment && <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-blue-400 border border-slate-600/50"><FileText className="w-3 h-3" /><span className="hidden sm:inline">{t('admin.feedbacks.generalEvalShort')}</span></div>}
                                      {hasImgs && <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-teal-400 border border-slate-600/50" title={t('admin.feedbacks.image')}><ImageIcon className="w-3 h-3" /><span className="hidden sm:inline">{t('admin.feedbacks.image')}</span></div>}
                                      {hasManagerNote && <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30" title={t('feedbackDetail.detail.managerNote')}><StickyNote className="w-3 h-3 fill-current" /></div>}
                                    </div>
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
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0 flex justify-end">
            <Button variant="outline" onClick={handleClose} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white font-medium shadow-none ring-0 focus:ring-0">{t('common.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {detailFeedback && (
        <FeedbackDetailModal
          isOpen={!!detailFeedback}
          onClose={() => setDetailFeedback(null)}
          feedback={detailFeedback}
          onStatusChange={(id, newStatus) => { setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f)); }}
        />
      )}
    </>
  );
};
export default CustomerProfileModal;