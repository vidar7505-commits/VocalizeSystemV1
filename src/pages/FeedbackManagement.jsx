import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAdminContext } from '@/contexts/AdminContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Search, RefreshCw, Calendar, MessageSquare, User, Star,
  ImageIcon, Filter, AlertTriangle, Crown, Siren,
  StickyNote, ChevronLeft, ChevronRight, FileText, BarChart,
  CheckSquare, Square, CheckCircle2, ListChecks, Phone // 🟢 Phone EKLENDİ
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import { useToast } from "@/components/ui/use-toast";
import { cn, formatCustomerName, getCustomerData } from "@/lib/utils";

const getStatusLabel = (s) => ({ new: 'Yeni', pending: 'Beklemede', in_progress: 'İşlemde', resolved: 'Çözüldü', escalated: 'Acil' }[s] || s);

const getTypeBadge = (type) => {
  const styles = { complaint: "text-red-400 bg-red-900/20 border-red-900/30", suggestion: "text-blue-400 bg-blue-900/20 border-blue-900/30", evaluation: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30", review: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30", rating: "text-yellow-400 bg-yellow-900/20 border-yellow-900/30" };
  const labels = { complaint: "Şikayet", suggestion: "Öneri", evaluation: "Değerlendirme", review: "Değerlendirme", rating: "Değerlendirme" };
  return <Badge variant="secondary" className={`text-xs px-2.5 py-1 ${styles[type] || "text-slate-400"}`}>{labels[type] || type}</Badge>;
};

const getStatusBadge = (status) => {
  const styles = { new: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", pending: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", resolved: "bg-green-500/10 text-green-500 border-green-500/20", escalated: "bg-red-500/10 text-red-500 border-red-500/20" };
  const labels = { new: "Yeni", pending: "Beklemede", in_progress: "İşlemde", resolved: "Çözüldü", escalated: "Acil" };
  return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap transition-colors ${styles[status] || "bg-slate-500/10 text-slate-500"}`}>{labels[status] || status}</Badge>;
};

const hasImages = (f) => ((f.feedback_images && f.feedback_images.length > 0) || (f.receipt_images && f.receipt_images.length > 0));

const FeedbackCard = React.memo(React.forwardRef(({
  feedback,
  selectedIds,
  highlightedId,
  toggleSelect,
  handleFeedbackClick,
  handleOpenCustomerProfile
}, ref) => {
  const f = feedback;
  const customerName = getCustomerData(f, 'name');
  const smartName = formatCustomerName(customerName);
  const isVip = f.customer_profiles?.flag_vip_customer || f.flag_vip_customer;
  const isSensitive = f.customer_profiles?.flag_sensitive_customer || f.flag_sensitive_customer;
  const hasCustomerProfileNote = f.customer_profiles?.admin_note && f.customer_profiles.admin_note.trim().length > 0;
  const rating = f.rating || f.overall_rating;
  const hasImgs = hasImages(f);
  const isEscalated = f.status === 'escalated';
  const hasManagerNote = !!f.manager_note;
  const hasGeneralEval = (Number(f.general_eval_rating) > 0) || (f.general_eval_comment && f.general_eval_comment.trim().length > 0);
  const isHighlighted = highlightedId === f.id;
  const isSelected = selectedIds.includes(f.id);

  return (
    <div
      ref={ref}
      className={cn(
        "flex gap-3 items-start transition-all duration-300 scroll-mt-32",
        isHighlighted ? "scale-[1.01]" : ""
      )}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }}
        className="mt-6 text-slate-600 hover:text-indigo-400 transition-colors shrink-0 p-1"
      >
        {isSelected
          ? <CheckSquare className="w-6 h-6 text-indigo-500" />
          : <Square className="w-6 h-6" />}
      </button>

      <div
        onClick={() => handleFeedbackClick(f)}
        className={cn(
          "feedback-activity-card flex-1 group rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden shadow-sm border duration-200 ease-in-out",
          isHighlighted && "feedback-card-highlighted",
          isHighlighted
            ? "bg-teal-900/30 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-2 ring-teal-500/50"
            : (isEscalated ? "feedback-row-escalated bg-red-950/40 border-red-500/50 hover:bg-red-900/50 hover:border-red-400 animate-pulse-subtle" : "bg-slate-900/50 hover:bg-slate-800 border-slate-800 hover:border-700"),
          isSelected ? "border-indigo-500/50 bg-indigo-900/10" : ""
        )}
      >
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full min-w-0 pr-0 md:pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {getTypeBadge(f.feedback_type)}
              {getStatusBadge(f.status)}
              <span className="text-slate-500 text-xs flex items-center gap-1 ml-auto md:ml-0"><Calendar className="w-3 h-3" />{new Date(f.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <Badge variant="outline" className="text-[11px] font-medium text-slate-400 border-slate-700 bg-slate-900/80 truncate max-w-[200px]">{f.branches?.branch_name_tr || "Şube Bilinmiyor"}</Badge>
            </div>
            <div className="flex gap-3 mt-1">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.feedback_type === 'complaint' ? 'bg-red-500' : f.feedback_type === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm line-clamp-2 leading-relaxed break-all">{f.message || <span className="text-slate-600 italic">Mesaj içeriği yok</span>}</p>
                {(f.feedback_type === 'review' || Number(f.general_eval_rating) > 0) && rating > 0 && (
                  <div className="flex items-center gap-0.5 mt-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-yellow-500 text-yellow-500' : 'fill-none text-slate-700'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto md:min-w-[200px] md:shrink-0 flex md:flex-col justify-between md:items-end gap-2 pl-0 md:pl-4 md:border-l border-slate-800/50 mt-4 md:mt-0">
            <div className="flex items-center gap-2 group/customer hover:bg-slate-800 p-1.5 rounded-lg -ml-1.5 md:ml-0 transition-colors mr-auto md:mr-0 cursor-pointer" onClick={(e) => handleOpenCustomerProfile(e, f)}>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover/customer:border-indigo-500/50 transition-colors"><User className="w-4 h-4 text-slate-400 group-hover/customer:text-indigo-400" /></div>
              <div className="flex flex-col items-start md:items-end">
                <span className={cn("text-sm font-medium transition-colors truncate max-w-[140px] flex items-center gap-1", hasCustomerProfileNote ? "text-blue-400 font-bold" : "text-slate-300 group-hover/customer:text-indigo-300")} title={hasCustomerProfileNote ? "Müşteri Notu Mevcut" : ""}>
                  {smartName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto flex-wrap justify-end">
              {hasGeneralEval && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-blue-400 border border-slate-700"><BarChart className="w-3 h-3" /> <span className="hidden sm:inline">Genel D.</span></div>)}
              {hasImgs && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-teal-400 border border-slate-700"><ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline">Görsel</span></div>)}
              {hasManagerNote && (<div className="feedback-note-icon flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/25 text-amber-500 border-2 border-amber-500/50 shadow-sm" title="Yönetici notu var"><StickyNote className="w-4 h-4 fill-current" /></div>)}
              {isVip && (<div className="flex items-center gap-1 px-3 py-1 bg-purple-900/30 rounded text-xs text-purple-300 border border-purple-500/30 font-medium"><Crown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">VIP</span></div>)}
              {isSensitive && (<div className="flex items-center gap-1 px-3 py-1 bg-orange-900/30 rounded text-xs text-orange-300 border border-orange-500/30 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hassas</span></div>)}
              {f.guest_contact_info && (
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm"
                  title="Misafir İletişim İsteği Var"
                >
                  <Phone className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}));

const FeedbackManagement = () => {
  const { businessId, selectedBranchId, escalatedCount } = useAdminContext();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState(''); // Debounce için

  // Filtreler
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('last30');
  const [showNotesOnly, setShowNotesOnly] = useState(false);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  // Server-Side Pagination (Enterprise: 50 items per batch)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [totalServerCount, setTotalServerCount] = useState(0);

  // Modallar
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Mobil Fix State'leri
  const [highlightedId, setHighlightedId] = useState(null);
  const [targetScrollId, setTargetScrollId] = useState(null);
  const [pendingFeedbackId, setPendingFeedbackId] = useState(null);
  const [modalOpenAttempts, setModalOpenAttempts] = useState(0);

  // SEÇİM STATE'LERİ
  const [selectedIds, setSelectedIds] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileScrollToList, setMobileScrollToList] = useState(false);

  const itemRefs = useRef({});
  const pendingTimeoutRef = useRef(null);
  const feedbackListRef = useRef(null);
  const realtimeDebounceRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Search Debounce implementation
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 500);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [localSearchQuery]);

  // 🟢 Request ID to prevent race conditions
  const fetchRequestId = useRef(0);

  // Main Data Fetcher - Triggered by filters or page changes
  useEffect(() => {
    if (!businessId) return;
    fetchFeedbacks();

    // Setup realtime subscription (🟢 DEBOUNCED)
    const channel = supabase.channel('feedback_list_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` },
        () => {
          if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
          realtimeDebounceRef.current = setTimeout(() => { fetchFeedbacks(); }, 1500);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    };
  }, [businessId, selectedBranchId, statusFilter, typeFilter, flagFilter, dateFilter, searchQuery, showUrgentOnly, currentPage]);

  // URL state: urgent filtresi veya openFeedbackId
  useEffect(() => {
    if (location.state?.filter === 'urgent') {
      // 🟢 ACİL DURUM: Tüm diğer filtreleri sıfırla ki sonuçlar doğru gelsin
      setStatusFilter('all');
      setTypeFilter('all');
      setFlagFilter('all');
      setDateFilter('all');
      setLocalSearchQuery('');
      setSearchQuery('');
      setShowNotesOnly(false);
      setPendingFeedbackId(null);
      localStorage.removeItem('vocalize_pending_feedback');

      setShowUrgentOnly(true);
      if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileScrollToList(true);

      // Sayfa yüklendiğinde de çalışsın
      setTimeout(() => {
        scrollToFeedbacks();
      }, 500);

      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (location.state?.openFeedbackId) {
      const targetId = location.state.openFeedbackId;
      setPendingFeedbackId(targetId);
      // 🟢 REMOVE: Do not persist in localStorage here. Rely on state.
      // localStorage.setItem('vocalize_pending_feedback', targetId); 
      setModalOpenAttempts(0);
      navigate(location.pathname, { replace: true, state: {} });
    }
    else {
      // 🟢 CONSUME-ONCE PATTERN: Read & Clear immediately
      const storedId = localStorage.getItem('vocalize_pending_feedback');
      if (storedId) {
        if (!pendingFeedbackId) {
          setPendingFeedbackId(storedId);
          setModalOpenAttempts(0);
        }
        // 🟢 CRITICAL FIX: Remove immediately to prevent loops if app crashes later
        localStorage.removeItem('vocalize_pending_feedback');
      }
    }
  }, [location.state, navigate, location.pathname, pendingFeedbackId]);

  // Mobilde acil filtresiyle gelindiğinde listeyi görünür yap
  useEffect(() => {
    // 🟢 SCROLL TRIGGER: Wait for loading to finish and reference to exist
    if (mobileScrollToList && !loading && feedbacks.length >= 0 && feedbackListRef.current) {
      const t = setTimeout(() => {
        scrollToFeedbacks();
        setMobileScrollToList(false);
      }, 100); // Small delay to ensure layout is stable
      return () => clearTimeout(t);
    }
  }, [mobileScrollToList, loading, feedbacks.length]);

  // ID İşleme
  useEffect(() => {
    if (!pendingFeedbackId) return;
    if (loading || feedbacks.length === 0) return;

    if (modalOpenAttempts >= 10) {
      toast({ variant: "destructive", title: "Bildirim Bulunamadı", description: "Aranan geri bildirim silinmiş veya farklı bir şubede olabilir." });
      setPendingFeedbackId(null);
      localStorage.removeItem('vocalize_pending_feedback');
      setModalOpenAttempts(0);
      return;
    }

    const targetFeedback = feedbacks.find(f => f.id === pendingFeedbackId);

    if (targetFeedback) {
      setStatusFilter('all');
      setTypeFilter('all');
      setFlagFilter('all');
      setDateFilter('all');
      setShowNotesOnly(false);
      setShowUrgentOnly(false);
      setSearchQuery('');

      const index = feedbacks.findIndex(f => f.id === pendingFeedbackId);
      const targetPage = Math.ceil((index + 1) / itemsPerPage);
      setCurrentPage(targetPage);
      setHighlightedId(pendingFeedbackId);
      setTargetScrollId(pendingFeedbackId);

      setTimeout(() => {
        setSelectedFeedback(targetFeedback);
        setIsDetailModalOpen(true);
        setPendingFeedbackId(null);
        localStorage.removeItem('vocalize_pending_feedback');
        setModalOpenAttempts(0);
      }, 100);

    } else {
      setModalOpenAttempts(prev => prev + 1);
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = setTimeout(() => { setModalOpenAttempts(prev => prev); }, 300);
    }
    return () => { if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current); };
  }, [pendingFeedbackId, loading, feedbacks, modalOpenAttempts, itemsPerPage, toast]);

  // Scroll
  useEffect(() => {
    if (targetScrollId && itemRefs.current[targetScrollId]) {
      const element = itemRefs.current[targetScrollId];
      const timer = setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTargetScrollId(null);
      }, 1000);
      const highlightTimer = setTimeout(() => setHighlightedId(null), 5000);
      return () => { clearTimeout(timer); clearTimeout(highlightTimer); };
    }
  }, [targetScrollId, currentPage, loading]);

  useEffect(() => {
    return () => {
      localStorage.removeItem('vocalize_pending_feedback');
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  const fetchFeedbacks = async () => {
    if (!businessId) return;

    const currentRequestId = ++fetchRequestId.current;
    setLoading(true);

    try {
      // 🟢 SERVER-SIDE FILTER BUILDER
      const buildQuery = (q) => {
        let res = q.eq('business_id', businessId);

        // Branch Filter
        if (selectedBranchId !== 'all') res = res.eq('branch_id', selectedBranchId);

        // Status & Urgent Filters
        if (showUrgentOnly) {
          res = res.eq('status', 'escalated');
        } else if (statusFilter !== 'all') {
          res = res.eq('status', statusFilter);
        }

        // Type Filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'evaluation') {
            res = res.in('feedback_type', ['evaluation', 'review', 'rating']);
          } else {
            res = res.eq('feedback_type', typeFilter);
          }
        }

        // Flag Filters (VIP / Sensitive)
        if (flagFilter === 'vip') res = res.eq('flag_vip_customer', true);
        if (flagFilter === 'sensitive') res = res.eq('flag_sensitive_customer', true);

        // Date Filter
        if (dateFilter !== 'all') {
          const today = new Date();
          let startDate, endDate;
          switch (dateFilter) {
            case 'today': startDate = startOfDay(today); endDate = endOfDay(today); break;
            case 'last7': startDate = subDays(today, 7); endDate = endOfDay(today); break;
            case 'last30': startDate = subDays(today, 30); endDate = endOfDay(today); break;
            case 'last90': startDate = subDays(today, 90); endDate = endOfDay(today); break;
            case 'thisMonth': startDate = startOfMonth(today); endDate = endOfMonth(today); break;
            case 'lastMonth': startDate = startOfMonth(subMonths(today, 1)); endDate = endOfMonth(subMonths(today, 1)); break;
            default: break;
          }
          if (startDate) res = res.gte('created_at', startDate.toISOString());
          if (endDate) res = res.lte('created_at', endDate.toISOString());
        }

        // Search Query
        if (searchQuery.trim().length > 0) {
          const term = searchQuery.trim();
          // Note: We search in multiple columns
          res = res.or(`message.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,customer_phone.ilike.%${term}%`);
        }

        return res;
      };

      // 🟢 1. Toplam sayıyı al (Sayfalama için filtreler dahil)
      let countQuery = supabase.from('feedbacks').select('id', { count: 'exact', head: true });
      countQuery = buildQuery(countQuery);
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      setTotalServerCount(count || 0);

      // 🟢 2. Verileri çek
      const rangeStart = (currentPage - 1) * itemsPerPage;
      const rangeEnd = rangeStart + itemsPerPage - 1;

      let dataQuery = supabase.from('feedbacks').select(`
          *,
          guest_contact_info,
          branches(id, branch_name_tr),
          customer_profiles(
            id, name, email, phone,
            flag_vip_customer, flag_sensitive_customer, admin_note,
            users(first_name, last_name)
          ),
          manager_note_updater:manager_note_updated_by(first_name, last_name)
        `);
      dataQuery = buildQuery(dataQuery);
      const { data: feedbacksData, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (error) throw error;
      let mergedFeedbacks = feedbacksData || [];

      // 🔴 CROSS-MATCH: PID olmayan ama email olanlar için profil çek (Hybrid Detection)
      const missingPidEmails = mergedFeedbacks
        .filter(f => !f.customer_profile_id && f.customer_email && f.customer_email.length > 5)
        .map(f => f.customer_email);

      if (missingPidEmails.length > 0) {
        const { data: matchedProfiles } = await supabase
          .from('customer_profiles')
          .select('*, users(first_name, last_name)')
          .in('email', missingPidEmails);

        if (matchedProfiles?.length > 0) {
          mergedFeedbacks = mergedFeedbacks.map(f => {
            if (!f.customer_profile_id && f.customer_email) {
              const matched = matchedProfiles.find(p => p.email === f.customer_email);
              if (matched) return { ...f, customer_profiles: matched };
            }
            return f;
          });
        }
      }

      const { data: bizCustomers, error: bizError } = await supabase
        .from('business_customers')
        .select('customer_profile_id, is_vip, is_sensitive, manager_notes')
        .eq('business_id', businessId);

      if (bizError) console.error("Business customers fetch error:", bizError);

      mergedFeedbacks = mergedFeedbacks.map(f => {
        const profileId = f.customer_profile_id || f.customer_profiles?.id;
        const bizData = bizCustomers?.find(bc => bc.customer_profile_id === profileId);
        const effectiveVip = bizData ? bizData.is_vip : (f.flag_vip_customer || f.customer_profiles?.flag_vip_customer || false);
        const effectiveSensitive = bizData ? bizData.is_sensitive : (f.flag_sensitive_customer || f.customer_profiles?.flag_sensitive_customer || false);
        const effectiveNote = bizData ? bizData.manager_notes : (f.customer_profiles?.admin_note || '');

        return {
          ...f,
          flag_vip_customer: effectiveVip,
          flag_sensitive_customer: effectiveSensitive,
          customer_profiles: {
            ...(f.customer_profiles || {}),
            flag_vip_customer: effectiveVip,
            flag_sensitive_customer: effectiveSensitive,
            admin_note: effectiveNote,
            users: f.customer_profiles?.users
          }
        };
      });

      if (currentRequestId === fetchRequestId.current) {
        setFeedbacks(mergedFeedbacks);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Verileriniz yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin." });
    } finally {
      if (currentRequestId === fetchRequestId.current) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeedbacks().finally(() => setIsRefreshing(false));
  };

  const handleFlagsUpdate = (profileId, newFlags, relatedEmail) => {
    setFeedbacks(prev => prev.map(f => {
      if (!f) return f;
      const currentProfileId = f.customer_profile_id || f.customer_profiles?.id;
      const currentEmail = f.customer_email || f.customer_profiles?.email;
      const matchesId = profileId && currentProfileId === profileId;
      const matchesEmail = relatedEmail && currentEmail === relatedEmail;

      if (matchesId || matchesEmail) {
        return {
          ...f,
          customer_profile_id: profileId || currentProfileId,
          customer_profiles: {
            ...(f.customer_profiles || {}),
            id: profileId || currentProfileId,
            flag_vip_customer: newFlags.vip,
            flag_sensitive_customer: newFlags.sensitive,
            admin_note: newFlags.admin_note
          },
          flag_vip_customer: newFlags.vip,
          flag_sensitive_customer: newFlags.sensitive
        };
      }
      return f;
    }));
  };


  const toggleSelect = React.useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleSelectAll = () => {
    const allSelected = filteredFeedbacks.length > 0 && filteredFeedbacks.every(f => selectedIds.includes(f.id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      const pageIds = filteredFeedbacks.map(f => f.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkUpdate = async (targetStatus) => {
    if (selectedIds.length === 0) return;
    setLoading(true);

    const updates = {
      status: targetStatus,
      resolved_at: targetStatus === 'resolved' ? new Date().toISOString() : null
    };

    const { error } = await supabase.from('feedbacks').update(updates).in('id', selectedIds);

    if (!error) {
      toast({
        title: "İşlem Başarılı",
        description: `${selectedIds.length} bildirim "${getStatusLabel(targetStatus)}" olarak güncellendi.`,
        className: "bg-green-600 text-white border-none"
      });
      setFeedbacks(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, ...updates } : f));
      setSelectedIds([]);
    } else {
      toast({ variant: "destructive", title: "Hata", description: "Güncelleme başarısız." });
    }
    setLoading(false);
  };

  // Client-side filtering remains only for complex cases or forcing visibility (highlighted items)
  const filteredFeedbacks = useMemo(() => {
    // Note: Most filters are now moved to server-side in fetchFeedbacks.
    // We keep client-side filtering here to bridge any potential sync gap
    // or to force display of specific IDs (highlighted, etc.)
    return feedbacks.filter(f => {
      const isSpecial = f.id === highlightedId || f.id === targetScrollId || f.id === pendingFeedbackId;
      if (isSpecial) return true;

      // Note: "showNotesOnly" is refined here as it depends on joined customer profile note
      if (showNotesOnly) {
        const hasCustomerNote = f.customer_profiles?.admin_note && f.customer_profiles.admin_note.trim().length > 0;
        if (!f.manager_note && !hasCustomerNote) return false;
      }

      return true;
    });
  }, [feedbacks, showNotesOnly, highlightedId, targetScrollId, pendingFeedbackId]);

  useEffect(() => {
    if (!targetScrollId && !highlightedId && !pendingFeedbackId) {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter, typeFilter, flagFilter, dateFilter, showNotesOnly, showUrgentOnly]);

  // 🟢 GLOBAL URGENT CHECK (Server-Side Count)
  // feedback.some check was flawed because pagination hides urgent items on other pages.
  const hasUrgentFeedbacks = escalatedCount > 0;

  // 🟢 ACİL SCROLL İŞLEMİ (Buton Tıklaması)
  const scrollToFeedbacks = () => {
    // 1. Container'ı bul (AdminLayout içindeki main: .overflow-y-auto)
    // AdminLayout yapısında <main> etiketi scroll edilen asıl elementtir.
    const mainContainer = document.querySelector('main');

    if (feedbackListRef.current && mainContainer) {
      // Container'a göre pozisyon hesapla
      const listRect = feedbackListRef.current.getBoundingClientRect();
      const mainRect = mainContainer.getBoundingClientRect();
      const currentScrollTop = mainContainer.scrollTop;

      // Hedef: Listenin tepesi container'ın tepesine gelsin (-20px pay)
      // listRect.top - mainRect.top = Elementin container görünür alanının tepesine olan uzaklığı
      const relativeTop = listRect.top - mainRect.top;
      const targetScrollTop = currentScrollTop + relativeTop - 20;

      mainContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    } else if (feedbackListRef.current) {
      // Fallback (Layout yapısı değişirse veya main bulunamazsa)
      feedbackListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUrgentClick = () => {
    setShowUrgentOnly(true);
    setIsRefreshing(true);

    // Filtreleri sıfırla
    setStatusFilter('all');
    setTypeFilter('all');
    setFlagFilter('all');
    setDateFilter('all');
    setLocalSearchQuery('');
    setSearchQuery('');

    // 🟢 RACE CONDITION FIX: Use state-based trigger
    setMobileScrollToList(true);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleFeedbackClick = React.useCallback((feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  }, []);

  const handleOpenCustomerProfile = React.useCallback((e, feedback) => {
    e.stopPropagation();
    const profileId = feedback.customer_profile_id || (feedback.customer_profiles?.id) || null;
    const profileEmail = getCustomerData(feedback, 'email');
    setSelectedCustomer({ id: profileId, email: profileEmail });
    setCustomerModalOpen(true);
  }, []);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-32 md:px-6 md:pt-0 lg:px-8 space-y-6 relative">
        {hasUrgentFeedbacks && (
          <div className="acil-durum-box bg-red-950/80 border border-red-600/50 rounded-lg p-3 flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.3)] shrink-0">
            <div className="flex items-center gap-3 animate-pulse"><div className="bg-red-600 p-2 rounded-full"><Siren className="w-5 h-5 text-white animate-spin-slow" /></div><div><h3 className="text-red-200 font-bold text-sm">ACİL DURUM: Müdahale Gerektiren Geri Bildirimler Var!</h3><p className="text-red-300/80 text-xs">Müşteri memnuniyetini sağlamak için lütfen acil geri bildirimleri inceleyin.</p></div></div>
            <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shrink-0" onClick={handleUrgentClick}>İncele</Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div><h1 className="text-3xl font-bold text-white tracking-tight">Geri Bildirim Yönetimi</h1><p className="text-slate-400 mt-1">Müşteri geri bildirimlerini inceleyin, filtreleyin ve yönetin.</p></div>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-700 dark:text-slate-300"><RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />Yenile</Button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shrink-0 shadow-sm relative z-10">
          {/* 🟢 MOBİL GÖRÜNÜM: Grid (2 sütun), Masaüstü: Flex */}
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:flex-wrap md:gap-3 xl:flex-nowrap">

            {/* Arama Inputu: Mobilde col-span-2 (Tam genişlik) */}
            <div className="relative col-span-2 md:flex-1 md:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Mesaj, isim, email veya telefon..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-9 bg-[#111827] border-slate-700 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-10 transition-all rounded-lg text-slate-200 placeholder:text-slate-500 w-full"
              />
            </div>

            {/* Selects: Mobilde yan yana 2'li (varsayılan col-span-1), Masaüstünde esnek */}
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-[140px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200"><span className="truncate"><span className="text-slate-500 mr-1">Durum:</span>{statusFilter === 'all' ? 'Tümü' : statusFilter === 'new' ? 'Yeni' : statusFilter === 'pending' ? 'Beklemede' : statusFilter === 'in_progress' ? 'İşlemde' : 'Çözüldü'}</span></SelectTrigger><SelectContent className="bg-[#111827] border-slate-800 text-slate-200"><SelectItem value="all">Tüm Durumlar</SelectItem><SelectItem value="new">Yeni</SelectItem><SelectItem value="pending">Beklemede</SelectItem><SelectItem value="in_progress">İşlemde</SelectItem><SelectItem value="resolved">Çözüldü</SelectItem></SelectContent></Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full md:w-[140px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200"><span className="truncate"><span className="text-slate-500 mr-1">Tip:</span>{typeFilter === 'all' ? 'Tümü' : typeFilter === 'complaint' ? 'Şikayet' : typeFilter === 'suggestion' ? 'Öneri' : 'Değerlendirme'}</span></SelectTrigger><SelectContent className="bg-[#111827] border-slate-800 text-slate-200"><SelectItem value="all">Tüm Tipler</SelectItem><SelectItem value="complaint">Şikayet</SelectItem><SelectItem value="suggestion">Öneri</SelectItem><SelectItem value="evaluation">Değerlendirme</SelectItem></SelectContent></Select>
            <Select value={flagFilter} onValueChange={setFlagFilter}><SelectTrigger className="w-full md:w-[130px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200"><span className="truncate"><span className="text-slate-500 mr-1">Bayrak:</span>{flagFilter === 'all' ? 'Tümü' : flagFilter === 'vip' ? 'VIP' : 'Hassas'}</span></SelectTrigger><SelectContent className="bg-[#111827] border-slate-800 text-slate-200"><SelectItem value="all">Tüm (Bayrak)</SelectItem><SelectItem value="vip">VIP Müşteri</SelectItem><SelectItem value="sensitive">Hassas Müşteri</SelectItem></SelectContent></Select>
            <Select value={dateFilter} onValueChange={setDateFilter}><SelectTrigger className="w-full md:w-[150px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200"><Calendar className="w-3.5 h-3.5 mr-2 text-indigo-400 shrink-0" /><span className="truncate">{{ 'all': 'Tüm Zamanlar', 'today': 'Bugün', 'last7': 'Son 7 Gün', 'last30': 'Son 30 Gün', 'last90': 'Son 90 Gün', 'thisMonth': 'Bu Ay', 'lastMonth': 'Geçen Ay' }[dateFilter] || 'Tarih'}</span></SelectTrigger><SelectContent className="bg-[#111827] border-slate-800 text-slate-200"><SelectItem value="all">Tüm Zamanlar</SelectItem><SelectItem value="today">Bugün</SelectItem><SelectItem value="last7">Son 7 Gün</SelectItem><SelectItem value="last30">Son 30 Gün</SelectItem><SelectItem value="last90">Son 90 Gün</SelectItem><SelectItem value="thisMonth">Bu Ay</SelectItem><SelectItem value="lastMonth">Geçen Ay</SelectItem></SelectContent></Select>

            {/* Temizle Butonu: Mobilde tam satır (col-span-2) */}
            <Button variant="ghost" size="sm" onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setFlagFilter('all');
              setDateFilter('last30');
              setLocalSearchQuery('');
              setSearchQuery('');
              setShowNotesOnly(false);
              setShowUrgentOnly(false);
            }} className="col-span-2 md:col-span-1 h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg justify-center"><Filter className="w-3.5 h-3.5 mr-1.5" />Temizle</Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1 border-t border-slate-800/50">
            <div className="flex items-center space-x-2 border-r border-slate-700/50 pr-6 mr-2">
              <Checkbox
                id="select-all"
                checked={filteredFeedbacks.length > 0 && filteredFeedbacks.every(f => selectedIds.includes(f.id))}
                onCheckedChange={handleSelectAll}
                className="border-slate-500 data-[state=checked]:bg-indigo-500 w-4 h-4"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-slate-300 cursor-pointer flex items-center gap-1.5 select-none">
                <ListChecks className="w-3.5 h-3.5 text-indigo-400" /> Tümünü Seç
              </label>
            </div>

            <div className="flex items-center space-x-2"><Checkbox id="notes-filter" checked={showNotesOnly} onCheckedChange={setShowNotesOnly} className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" /><label htmlFor="notes-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 flex items-center gap-1.5 cursor-pointer"><StickyNote className="w-3.5 h-3.5 text-amber-400" /><span className="whitespace-nowrap">Notlular</span></label></div>
            <div className="flex items-center space-x-2"><Checkbox id="urgent-filter" checked={showUrgentOnly} onCheckedChange={setShowUrgentOnly} className="border-slate-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" /><label htmlFor="urgent-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 flex items-center gap-1.5 cursor-pointer"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="whitespace-nowrap">Acil Olanlar</span></label></div>
          </div>
        </div>

        <div className="mt-4">
          {selectedIds.length > 0 && (
            <div className="bg-indigo-900/30 border border-indigo-500/50 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between animate-in fade-in slide-in-from-top-2 mb-4 shadow-lg sticky top-20 z-20 backdrop-blur-md gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full"><CheckSquare className="w-5 h-5 text-white" /></div>
                <h3 className="text-indigo-100 font-bold text-sm">{selectedIds.length} Öğe Seçildi</h3>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-slate-300 hover:text-white h-8">İptal</Button>

                <Button size="sm" onClick={() => handleBulkUpdate('pending')} className="bg-indigo-600/80 hover:bg-indigo-600 text-white h-8 text-xs border border-indigo-500/50">
                  Beklemede
                </Button>
                <Button size="sm" onClick={() => handleBulkUpdate('in_progress')} className="bg-yellow-600/80 hover:bg-yellow-600 text-white h-8 text-xs border border-yellow-500/50">
                  İşlemde
                </Button>
                <Button size="sm" onClick={() => handleBulkUpdate('resolved')} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs border-none shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Çözüldü Yap
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-sm font-medium">Geri bildirimler yükleniyor...</p></div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800"><div className="bg-slate-800/50 p-4 rounded-full"><MessageSquare className="w-8 h-8 text-slate-500" /></div><div className="text-center"><h3 className="text-lg font-medium text-slate-300">Kayıt bulunamadı</h3></div></div>
          ) : (
            <>
              <div ref={feedbackListRef} className={cn("transition-opacity duration-300", isRefreshing && "opacity-50")}>
                <div className="grid gap-3">
                  {filteredFeedbacks.map((f) => (
                    <FeedbackCard
                      key={f.id}
                      ref={(el) => { if (el) itemRefs.current[f.id] = el; }}
                      feedback={f}
                      selectedIds={selectedIds}
                      highlightedId={highlightedId}
                      toggleSelect={toggleSelect}
                      handleFeedbackClick={handleFeedbackClick}
                      handleOpenCustomerProfile={handleOpenCustomerProfile}
                    />
                  ))}
                </div>

                {/* 🟢 DAHA FAZLA YÜKLE BUTONU (Server-side pagination) */}
              </div>
            </>
          )}

          {/* 🟢 SERVER-SIDE STANDARD PAGINATION - Always visible if total > itemsPerPage */}
          {totalServerCount > itemsPerPage && (
            <div className="flex flex-col items-center gap-4 mt-8 pb-8">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1 || loading}
                  className="border-teal-500/30 text-teal-500 hover:bg-teal-500/10 disabled:opacity-30 h-9 w-9 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(totalServerCount / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => {
                      const totalPages = Math.ceil(totalServerCount / itemsPerPage);
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, idx, arr) => {
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="text-slate-600 px-2">...</span>}
                          <Button
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                              "min-w-[36px] h-9 font-bold transition-all",
                              currentPage === page
                                ? "bg-teal-500 hover:bg-teal-600 text-slate-900 shadow-[0_0_15px_rgba(20,184,166,0.5)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const totalPages = Math.ceil(totalServerCount / itemsPerPage);
                    const newPage = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === Math.ceil(totalServerCount / itemsPerPage) || loading}
                  className="border-teal-500/30 text-teal-500 hover:bg-teal-500/10 disabled:opacity-30 h-9 w-9 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-center text-xs text-slate-500">
                Toplam <span className="text-teal-500 font-medium">{totalServerCount}</span> kayıttan <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalServerCount)}</span> arası gösteriliyor
              </div>
            </div>
          )}
        </div>

        {/* MODALLAR EN DIŞTA */}
        {selectedFeedback && (
          <FeedbackDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            feedback={selectedFeedback}
            onFeedbackUpdate={(id, u) => setFeedbacks(p => p.map(f => f.id === id ? { ...f, ...u } : f))}
            onFlagsUpdate={handleFlagsUpdate}
          />
        )}

        {customerModalOpen && (
          <CustomerProfileModal
            isOpen={customerModalOpen}
            onClose={() => setCustomerModalOpen(false)}
            customerProfileId={selectedCustomer?.id}
            customerEmail={selectedCustomer?.email}
            businessId={businessId}
            onFlagsUpdate={handleFlagsUpdate}
          />
        )}
      </div>
    </>
  );
};

export default FeedbackManagement;