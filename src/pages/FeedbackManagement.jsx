import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAdminContext } from '@/contexts/AdminContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from 'react-i18next';
import {
  Loader2, Search, RefreshCw, Calendar, MessageSquare, User, Star,
  ImageIcon, Filter, AlertTriangle, Crown, Siren,
  StickyNote, ChevronLeft, ChevronRight, FileText, BarChart,
  CheckSquare, Square, CheckCircle2, ListChecks, Phone, Building2, FilterX
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import CustomerProfileModal from '@/components/CustomerProfileModal';
import { useToast } from "@/components/ui/use-toast";
import { cn, formatCustomerName, getCustomerData } from "@/lib/utils";

// Helper function for formatting date (assuming it's a utility or new local function)
const formatDate = (dateString, i18n) => {
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(dateString).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// --- UI HELPERS ---
const getStatusColor = (s) => {
  switch (s) {
    case 'new': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'pending': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'escalated': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  }
};

const getStatusLabel = (s, t) => {
  switch (s) {
    case 'new': return t('dashboard.status.new');
    case 'pending': return t('dashboard.status.pending');
    case 'in_progress': return t('dashboard.status.in_progress');
    case 'resolved': return t('dashboard.status.resolved');
    case 'escalated': return t('dashboard.status.escalated');
    default: return s;
  }
};

const getTypeColor = (t_type) => {
  switch (t_type) {
    case 'complaint': return "text-red-400 bg-red-900/20 border-red-900/30";
    case 'suggestion': return "text-blue-400 bg-blue-900/20 border-blue-900/30";
    case 'evaluation':
    case 'review':
    case 'rating': return "text-yellow-400 bg-yellow-900/20 border-yellow-900/30";
    default: return "text-slate-400";
  }
};

const getTypeLabel = (t_type, t) => {
  switch (t_type) {
    case 'complaint': return t('dashboard.types.complaint');
    case 'suggestion': return t('dashboard.types.suggestion');
    case 'evaluation':
    case 'review':
    case 'rating': return t('dashboard.types.evaluation');
    default: return t_type;
  }
};

const FeedbackCard = React.memo(React.forwardRef(({
  feedback,
  selectedIds,
  highlightedId,
  toggleSelect,
  handleFeedbackClick,
  handleOpenCustomerProfile
}, ref) => {
  const f = feedback;
  const { t, i18n } = useTranslation('admin'); // Assuming t is available here

  const customerName = getCustomerData(f, 'name');
  const smartName = formatCustomerName(customerName);
  const isVip = f.customer_profiles?.flag_vip_customer || f.flag_vip_customer;
  const isSensitive = f.customer_profiles?.flag_sensitive_customer || f.flag_sensitive_customer;
  const hasCustomerProfileNote = f.customer_profiles?.admin_note && f.customer_profiles.admin_note.trim().length > 0;
  const rating = f.rating || f.overall_rating;
  const hasImgs = ((f.feedback_images && f.feedback_images.length > 0) || (f.receipt_images && f.receipt_images.length > 0));
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
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap transition-colors ${getTypeColor(f.feedback_type)}`}>{getTypeLabel(f.feedback_type, t)}</Badge>
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap transition-colors ${getStatusColor(f.status)}`}>{getStatusLabel(f.status, t)}</Badge>
              {f.customer_age_group && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 whitespace-nowrap">
                  {f.customer_age_group} {t('feedback_management.card.age_suffix')}
                </Badge>
              )}
              <span className="text-slate-500 text-xs flex items-center gap-1 ml-auto md:ml-0"><Calendar className="w-3 h-3" />{formatDate(f.created_at, i18n)}</span>
              <Badge variant="outline" className="text-[11px] font-medium text-slate-400 border-slate-700 bg-slate-900/80 truncate max-w-[200px]">
                {(i18n.language.startsWith('en') && f.branches?.branch_name_en) ? f.branches.branch_name_en : (f.branches?.branch_name_tr || t('feedback_management.card.unknown_branch'))}
              </Badge>
            </div>
            <div className="flex gap-3 mt-1">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.feedback_type === 'complaint' ? 'bg-red-500' : f.feedback_type === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm line-clamp-2 leading-relaxed break-all">{f.message || <span className="text-slate-600 italic">{t('feedback_management.card.no_content')}</span>}</p>
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
                <span translate="no" className={cn("text-sm font-medium transition-colors truncate max-w-[140px] flex items-center gap-1", hasCustomerProfileNote ? "text-blue-400 font-bold" : "text-slate-300 group-hover/customer:text-indigo-300")} title={hasCustomerProfileNote ? t('feedback_management.card.customer_note') : ""}>
                  {smartName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto flex-wrap justify-end">
              {hasGeneralEval && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-blue-400 border border-slate-700"><BarChart className="w-3 h-3" /> <span className="hidden sm:inline">{t('feedback_management.card.general_eval_short')}</span></div>)}
              {hasImgs && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-teal-400 border border-slate-700"><ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline">{t('feedback_management.card.image')}</span></div>)}
              {hasManagerNote && (<div className="feedback-note-icon flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/25 text-amber-500 border-2 border-amber-500/50 shadow-sm" title={t('feedback_management.card.manager_note')}><StickyNote className="w-4 h-4 fill-current" /></div>)}
              {isVip && (<div className="flex items-center gap-1 px-3 py-1 bg-purple-900/30 rounded text-xs text-purple-300 border border-purple-500/30 font-medium"><Crown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('feedback_management.card.vip')}</span></div>)}
              {isSensitive && (<div className="flex items-center gap-1 px-3 py-1 bg-orange-900/30 rounded text-xs text-orange-300 border border-orange-500/30 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('feedback_management.card.sensitive')}</span></div>)}
              {f.guest_contact_info && (
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm"
                  title={t('feedback_management.card.guest_contact_request')}
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
  const { t } = useTranslation('admin');

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

  const prevFiltersRef = useRef({});

  // Main Data Fetcher - Triggered by filters or page changes
  useEffect(() => {
    if (!businessId) return;

    // 🟢 PAGINATION RESET LOGIC
    // Check if any filter (except currentPage) has changed since last fetch
    const currentFiltersHash = JSON.stringify({
      selectedBranchId, statusFilter, typeFilter, flagFilter, dateFilter, searchQuery, showUrgentOnly
    });

    if (prevFiltersRef.current.hash && prevFiltersRef.current.hash !== currentFiltersHash) {
      if (currentPage !== 1) {
        // Reset page to 1. This will cause THIS effect to re-run with currentPage=1.
        // We SKIP the fetch now to prevent the "page 5 empty" result flash.
        setCurrentPage(1);
        prevFiltersRef.current.hash = currentFiltersHash;
        return;
      }
    }
    prevFiltersRef.current.hash = currentFiltersHash;

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
      toast({ variant: "destructive", title: t('feedback_management.toast.feedback_not_found_title'), description: t('feedback_management.toast.feedback_not_found_description') });
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
  }, [pendingFeedbackId, loading, feedbacks, modalOpenAttempts, itemsPerPage, toast, t]);

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
      // 🟢 0. FLAG IDS (Fetch once per cycle if needed)
      let flaggedProfileIds = [];
      if (flagFilter !== 'all') {
        let flagQuery = supabase
          .from('business_customers')
          .select('customer_profile_id')
          .eq('business_id', businessId);

        if (flagFilter === 'vip') flagQuery = flagQuery.eq('is_vip', true);
        if (flagFilter === 'sensitive') flagQuery = flagQuery.eq('is_sensitive', true);

        const { data: flagData } = await flagQuery;
        flaggedProfileIds = flagData?.map(d => d.customer_profile_id).filter(Boolean) || [];
      }

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
        // Note: We use a hybrid check for historical (record-level) and current (business-level) flags
        if (flagFilter === 'vip') {
          if (flaggedProfileIds.length > 0) {
            res = res.or(`flag_vip_customer.eq.true,customer_profile_id.in.(${flaggedProfileIds.join(',')})`);
          } else {
            res = res.eq('flag_vip_customer', true);
          }
        }
        if (flagFilter === 'sensitive') {
          if (flaggedProfileIds.length > 0) {
            res = res.or(`flag_sensitive_customer.eq.true,customer_profile_id.in.(${flaggedProfileIds.join(',')})`);
          } else {
            res = res.eq('flag_sensitive_customer', true);
          }
        }

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
            id: profileId,
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
      toast({ variant: "destructive", title: t('feedback_management.toast.connection_error_title'), description: t('feedback_management.toast.connection_error_description') });
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
        title: t('feedback_management.toast.bulk_update_success_title'),
        description: t('feedback_management.toast.bulk_update_success_description', { count: selectedIds.length, status: getStatusLabel(targetStatus) }),
        className: "bg-green-600 text-white border-none"
      });
      setFeedbacks(prev => prev.map(f => selectedIds.includes(f.id) ? { ...f, ...updates } : f));
      setSelectedIds([]);
    } else {
      toast({ variant: "destructive", title: t('feedback_management.toast.bulk_update_error_title'), description: t('feedback_management.toast.bulk_update_error_description') });
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

  const dateFilters = [
    { id: 'all', label: t('feedback_management.filters.all_time') },
    { id: 'today', label: t('feedback_management.filters.today') },
    { id: 'last7', label: t('feedback_management.filters.last7') },
    { id: 'last30', label: t('feedback_management.filters.last30') },
    { id: 'last90', label: t('feedback_management.filters.last90') },
    { id: 'thisMonth', label: t('feedback_management.filters.this_month') },
    { id: 'lastMonth', label: t('feedback_management.filters.last_month') },
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-32 md:px-6 md:pt-0 lg:px-8 space-y-6 relative">
        {hasUrgentFeedbacks && (
          <div className="acil-durum-box bg-red-950/80 border border-red-600/50 rounded-lg p-3 flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.3)] shrink-0">
            <div className="flex items-center gap-3 animate-pulse"><div className="bg-red-600 p-2 rounded-full"><Siren className="w-5 h-5 text-white animate-spin-slow" /></div><div><h3 className="text-red-200 font-bold text-sm">{t('feedback_management.urgent_alert.title')}</h3><p className="text-red-300/80 text-xs">{t('feedback_management.urgent_alert.description')}</p></div></div>
            <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shrink-0" onClick={handleUrgentClick}>{t('feedback_management.urgent_alert.review_button')}</Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div><h1 className="text-3xl font-bold text-white tracking-tight">{t('feedback_management.title')}</h1><p className="text-slate-400 mt-1">{t('feedback_management.description')}</p></div>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-700 dark:text-slate-300"><RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />{t('feedback_management.actions.refresh')}</Button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shrink-0 shadow-sm relative z-10">
          {/* 🟢 MOBİL GÖRÜNÜM: Grid (2 sütun), Masaüstü: Flex */}
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:flex-wrap md:gap-3 xl:flex-nowrap">

            {/* Arama Inputu: Mobilde col-span-2 (Tam genişlik) */}
            <div className="relative col-span-2 md:flex-1 md:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder={t('feedback_management.search_placeholder')}
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-9 bg-[#111827] border-slate-700 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-10 transition-all rounded-lg text-slate-200 placeholder:text-slate-500 w-full"
              />
            </div>

            {/* Selects: Mobilde yan yana 2'li (varsayılan col-span-1), Masaüstünde esnek */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200">
                <span className="truncate"><span className="text-slate-500 mr-1">{t('feedback_management.filters.status')}:</span>{statusFilter === 'all' ? t('feedback_management.filters.all') : getStatusLabel(statusFilter, t)}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-800 text-slate-200">
                <SelectItem value="all">{t('feedback_management.filters.all_statuses')}</SelectItem>
                <SelectItem value="new">{t('dashboard.status.new')}</SelectItem>
                <SelectItem value="pending">{t('dashboard.status.pending')}</SelectItem>
                <SelectItem value="in_progress">{t('dashboard.status.in_progress')}</SelectItem>
                <SelectItem value="resolved">{t('dashboard.status.resolved')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[140px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200">
                <span className="truncate"><span className="text-slate-500 mr-1">{t('feedback_management.filters.type')}:</span>{typeFilter === 'all' ? t('feedback_management.filters.all') : getTypeLabel(typeFilter, t)}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-800 text-slate-200">
                <SelectItem value="all">{t('feedback_management.filters.all_types')}</SelectItem>
                <SelectItem value="complaint">{t('dashboard.types.complaint')}</SelectItem>
                <SelectItem value="suggestion">{t('dashboard.types.suggestion')}</SelectItem>
                <SelectItem value="evaluation">{t('dashboard.types.evaluation')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={flagFilter} onValueChange={setFlagFilter}>
              <SelectTrigger className="w-full md:w-[130px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200">
                <span className="truncate"><span className="text-slate-500 mr-1">{t('feedback_management.filters.flag')}:</span>{flagFilter === 'all' ? t('feedback_management.filters.all') : flagFilter === 'vip' ? t('feedback_management.filters.vip') : t('feedback_management.filters.sensitive')}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-800 text-slate-200">
                <SelectItem value="all">{t('feedback_management.filters.all_flags')}</SelectItem>
                <SelectItem value="vip">{t('feedback_management.filters.vip_customer')}</SelectItem>
                <SelectItem value="sensitive">{t('feedback_management.filters.sensitive_customer')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-[150px] bg-[#111827] border-slate-700 h-10 rounded-lg text-sm text-slate-200">
                <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-400 shrink-0" />
                <span className="truncate">{dateFilters.find(f => f.id === dateFilter)?.label || t('feedback_management.filters.date')}</span>
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-800 text-slate-200">
                {dateFilters.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Temizle Butonu: Mobilde tam satır (col-span-2) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setFlagFilter('all');
                setDateFilter('last30');
                setLocalSearchQuery('');
                setSearchQuery('');
                setShowNotesOnly(false);
                setShowUrgentOnly(false);
              }}
              className="col-span-2 md:col-span-1 h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg justify-center"
            >
              <FilterX className="w-3.5 h-3.5 mr-1.5" />{t('feedback_management.filters.clear')}
            </Button>
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
                <ListChecks className="w-3.5 h-3.5 text-indigo-400" /> {t('feedback_management.actions.select_all')}
              </label>
            </div>

            <div className="flex items-center space-x-2"><Checkbox id="notes-filter" checked={showNotesOnly} onCheckedChange={setShowNotesOnly} className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" /><label htmlFor="notes-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 flex items-center gap-1.5 cursor-pointer"><StickyNote className="w-3.5 h-3.5 text-amber-400" /><span className="whitespace-nowrap">{t('feedback_management.filters.with_notes')}</span></label></div>
            <div className="flex items-center space-x-2"><Checkbox id="urgent-filter" checked={showUrgentOnly} onCheckedChange={setShowUrgentOnly} className="border-slate-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" /><label htmlFor="urgent-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 flex items-center gap-1.5 cursor-pointer"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="whitespace-nowrap">{t('feedback_management.filters.urgent_only')}</span></label></div>
          </div>
        </div>

        <div className="mt-4">
          {selectedIds.length > 0 && (
            <div className="bg-indigo-900/30 border border-indigo-500/50 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between animate-in fade-in slide-in-from-top-2 mb-4 shadow-lg sticky top-20 z-20 backdrop-blur-md gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full"><CheckSquare className="w-5 h-5 text-white" /></div>
                <h3 className="text-indigo-100 font-bold text-sm">{t('feedback_management.alerts.selected_items', { count: selectedIds.length })}</h3>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-slate-300 hover:text-white hover:bg-slate-800 h-8">{t('feedback_management.actions.cancel')}</Button>

                <Button size="sm" onClick={() => handleBulkUpdate('pending')} className="bg-indigo-600/80 hover:bg-indigo-600 text-white h-8 text-xs border border-indigo-500/50">
                  {t('dashboard.status.pending')}
                </Button>
                <Button size="sm" onClick={() => handleBulkUpdate('in_progress')} className="bg-yellow-600/80 hover:bg-yellow-600 text-white h-8 text-xs border border-yellow-500/50">
                  {t('dashboard.status.in_progress')}
                </Button>
                <Button size="sm" onClick={() => handleBulkUpdate('resolved')} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs border-none shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> {t('feedback_management.actions.mark_resolved')}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-sm font-medium">{t('feedback_management.loading_feedbacks')}</p></div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800"><div className="bg-slate-800/50 p-4 rounded-full"><MessageSquare className="w-8 h-8 text-slate-500" /></div><div className="text-center"><h3 className="text-lg font-medium text-slate-300">{t('feedback_management.no_records_found')}</h3></div></div>
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
                {t('feedback_management.pagination.total')} <span className="text-teal-500 font-medium">{totalServerCount}</span> {t('feedback_management.pagination.records')} <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalServerCount)}</span> {t('feedback_management.pagination.showing')}
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