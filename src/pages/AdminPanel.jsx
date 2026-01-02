// ... (Importlar aynı)
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAdminContext } from '@/contexts/AdminContext';
import { 
  MessageSquare, Star, AlertTriangle, Calendar, Loader2, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, User, Phone, 
  Image as ImageIcon, StickyNote, Crown, FileText, Siren
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area } from 'recharts';
import { subDays, startOfDay, endOfDay, subMonths, startOfMonth } from 'date-fns';
import { cn, formatCustomerName, getCustomerData, calculateDelta } from "@/lib/utils";
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import CustomerProfileModal from '@/components/CustomerProfileModal';

// ... (SparklineCard, getTypeBadge, getStatusBadge, hasImages aynı) ...
// (Buraya yer kaplamasın diye önceki sub-component kodlarını aynen kopyalayabilirsiniz, değişmedi)
const SparklineCard = ({ title, value, delta, deltaType, icon: Icon, colorClass, sparkData, loading, isInverseMetric = false }) => {
  let sentimentColor = "bg-slate-800 text-slate-400 border-slate-700"; 
  let TrendIcon = Minus;

  if (deltaType === 'increase') {
     TrendIcon = ArrowUpRight;
     sentimentColor = isInverseMetric 
        ? "bg-rose-950/30 text-rose-400 border-rose-500/20" 
        : "bg-emerald-950/30 text-emerald-400 border-emerald-500/20"; 
  } else if (deltaType === 'decrease') {
     TrendIcon = ArrowDownRight;
     sentimentColor = isInverseMetric
        ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20" 
        : "bg-rose-950/30 text-rose-400 border-rose-500/20"; 
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition-all hover:border-slate-700 h-[160px] flex flex-col justify-between group">
      <div className="flex justify-between items-start relative z-20">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 rounded animate-pulse mt-1"></div>
          ) : (
            <h3 className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</h3>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 border border-white/5`}>
          <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div className="relative z-20 flex items-center gap-2 mt-1">
        {!loading && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sentimentColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{delta}</span>
          </div>
        )}
        <span className="text-xs text-slate-500">geçen döneme göre</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none z-10 group-hover:opacity-30 transition-opacity">
        {!loading && sparkData && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.8} className={colorClass.replace('bg-', 'text-')} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} className={colorClass.replace('bg-', 'text-')} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="currentColor" fill={`url(#gradient-${title})`} strokeWidth={2} className={colorClass.replace('bg-', 'text-')} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
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
const hasImages = (f) => {
  return ((f.feedback_images && f.feedback_images.length > 0) || (f.image_urls && f.image_urls.length > 0) || (f.receipt_images && f.receipt_images.length > 0) || f.receipt_url || f.product_image_url);
};

const AdminPanel = () => {
  const { businessId, selectedBranchId, branches, dateRange, setDateRange } = useAdminContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [metrics, setMetrics] = useState({
    total: { value: 0, delta: '0%', type: 'neutral' },
    complaints: { value: 0, delta: '0%', type: 'neutral' },
    resolved: { value: 0, delta: '0%', type: 'neutral' },
    rating: { value: '0.0', delta: '0.0 Puan', type: 'neutral' },
  });

  const [sparklineData, setSparklineData] = useState({ total: [], complaints: [], resolved: [], rating: [] });
  const [ratingDistribution, setRatingDistribution] = useState([]);
  const [feedbackTypeDistribution, setFeedbackTypeDistribution] = useState([]);
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (location.state?.openFeedbackId && recentFeedbacks.length > 0) {
      const targetFeedback = recentFeedbacks.find(f => f.id === location.state.openFeedbackId);
      if (targetFeedback) {
        setSelectedFeedback(targetFeedback);
        setIsDetailModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, recentFeedbacks]);

  const displayTitle = selectedBranchId === 'all' 
    ? "Ana Panel" 
    : branches.find(b => b.id === selectedBranchId)?.branch_name_tr || "Ana Panel";

  // 🟢 DÜZELTME: Anahtarlar İngilizce yapıldı (AdminContext 'last7' ile eşleşmesi için)
  const dateOptions = { 
    'today': 'Bugün', 
    'last7': 'Son 7 Gün', 
    'last30': 'Son 30 Gün', 
    'thisMonth': 'Bu Ay' 
  };

  const getDateIntervals = useCallback(() => {
    const now = new Date();
    let currentStart, prevStart;
    // AdminContext'teki anahtarlar ile uyumlu hale getirildi
    switch (dateRange) {
        case 'today': currentStart = startOfDay(now); prevStart = startOfDay(subDays(now, 1)); break;
        case 'last7': currentStart = subDays(now, 7); prevStart = subDays(now, 14); break;
        case 'last30': currentStart = subDays(now, 30); prevStart = subDays(now, 60); break;
        case 'thisMonth': currentStart = startOfMonth(now); prevStart = startOfMonth(subMonths(now, 1)); break;
        default: currentStart = subDays(now, 30); prevStart = subDays(now, 60); break;
    }
    return { currentStart, prevStart };
  }, [dateRange]);

  // ... (fetchData ve diğer useEffect'ler aynı mantıkla devam eder, buraya sığdırmak için sadece değişen yerleri vurguluyorum. Tüm kod bloğunu aşağıda vereceğim) ...
  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setLoadingFeedbacks(true);
    try {
      const { currentStart, prevStart } = getDateIntervals();
      let query = supabase.from('feedbacks')
        .select('id, created_at, status, feedback_type, rating, general_eval_rating, resolved_at')
        .eq('business_id', businessId)
        .gte('created_at', prevStart.toISOString()); 
      if (selectedBranchId !== 'all') query = query.eq('branch_id', selectedBranchId);
      const { data: rawData, error } = await query;
      if (error) throw error;
      const currentData = rawData.filter(f => new Date(f.created_at) >= currentStart);
      const prevData = rawData.filter(f => new Date(f.created_at) < currentStart && new Date(f.created_at) >= prevStart);
      setHasData(currentData.length > 0);
      const totalCurr = currentData.length;
      const totalPrev = prevData.length;
      const isPending = (s) => ['new', 'pending', 'in_progress', 'escalated'].includes(s);
      const pendingCurr = currentData.filter(f => f.feedback_type === 'complaint' && isPending(f.status)).length;
      const pendingPrev = prevData.filter(f => f.feedback_type === 'complaint' && isPending(f.status)).length;
      const resolvedCurr = currentData.filter(f => f.status === 'resolved').length;
      const resolvedPrev = prevData.filter(f => f.status === 'resolved').length;
      const getAvg = (ds) => {
          const rated = ds.filter(f => f.rating || f.general_eval_rating).map(f => f.rating || f.general_eval_rating);
          if (rated.length === 0) return 0;
          return rated.reduce((a, b) => a + b, 0) / rated.length;
      };
      const ratingCurr = getAvg(currentData);
      const ratingPrev = getAvg(prevData);
      const totalDelta = calculateDelta(totalCurr, totalPrev, 'total');
      const pendingDelta = calculateDelta(pendingCurr, pendingPrev, 'complaints');
      const resolvedDelta = calculateDelta(resolvedCurr, resolvedPrev, 'resolved');
      const ratingDelta = calculateDelta(ratingCurr, ratingPrev, 'rating');
      setMetrics({
        total: { value: totalCurr, delta: totalDelta.val, type: totalDelta.type },
        complaints: { value: pendingCurr, delta: pendingDelta.val, type: pendingDelta.type },
        resolved: { value: resolvedCurr, delta: resolvedDelta.val, type: resolvedDelta.type },
        rating: { value: ratingCurr.toFixed(1), delta: ratingDelta.val, type: ratingDelta.type }
      });
      const bucketCount = dateRange === 'today' ? 24 : (dateRange === 'last7' ? 7 : 15);
      const generateSparkline = (filterFn) => {
          const daysMap = new Map();
          const startT = currentStart.getTime();
          const endT = new Date().getTime(); 
          const step = (endT - startT) / (bucketCount || 10);
          for (let i = 0; i < bucketCount; i++) daysMap.set(i, { count: 0, sum: 0 });
          currentData.filter(filterFn).forEach(f => {
              const t = new Date(f.created_at).getTime();
              const idx = Math.min(Math.floor((t - startT) / step), bucketCount - 1);
              if (idx >= 0) {
                 const item = daysMap.get(idx);
                 item.count += 1;
                 item.sum += (f.rating || f.general_eval_rating || 0);
              }
          });
          return Array.from(daysMap.values()).map(v => ({ value: v.count }));
      };
      const generateRatingSparkline = () => {
        const startT = currentStart.getTime();
        const endT = new Date().getTime();
        const step = (endT - startT) / (bucketCount || 10);
        const daysMap = new Map();
        for (let i = 0; i < bucketCount; i++) daysMap.set(i, { count: 0, sum: 0 });
        currentData.filter(f => f.rating || f.general_eval_rating).forEach(f => {
          const t = new Date(f.created_at).getTime();
          const idx = Math.min(Math.floor((t - startT) / step), bucketCount - 1);
          if (idx >= 0) {
            const item = daysMap.get(idx);
            item.count++;
            item.sum += (f.rating || f.general_eval_rating);
          }
        });
        return Array.from(daysMap.values()).map(v => ({ value: v.count > 0 ? Number((v.sum / v.count).toFixed(1)) : 0 }));
      };
      setSparklineData({
          total: generateSparkline(() => true),
          complaints: generateSparkline(f => f.feedback_type === 'complaint' && isPending(f.status)),
          resolved: generateSparkline(f => f.status === 'resolved'),
          rating: generateRatingSparkline()
      });
      const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      currentData.forEach(f => {
          const r = f.rating || f.general_eval_rating;
          if (r && starCounts[r] !== undefined) starCounts[r]++;
      });
      setRatingDistribution([
          { name: '5 Yıldız', count: starCounts[5], fill: '#22c55e' }, 
          { name: '4 Yıldız', count: starCounts[4], fill: '#4ade80' }, 
          { name: '3 Yıldız', count: starCounts[3], fill: '#facc15' }, 
          { name: '2 Yıldız', count: starCounts[2], fill: '#f87171' }, 
          { name: '1 Yıldız', count: starCounts[1], fill: '#ef4444' }, 
      ]);
      const typeCounts = {
        complaint: currentData.filter(f => f.feedback_type === 'complaint').length,
        suggestion: currentData.filter(f => f.feedback_type === 'suggestion').length,
        evaluation: currentData.filter(f => ['evaluation', 'rating', 'review'].includes(f.feedback_type)).length
      };
      setFeedbackTypeDistribution([
        { name: 'Şikayet', count: typeCounts.complaint, fill: '#ef4444' },
        { name: 'Öneri', count: typeCounts.suggestion, fill: '#3b82f6' },
        { name: 'Değerlendirme', count: typeCounts.evaluation, fill: '#eab308' }
      ]);
      let recentQuery = supabase.from('feedbacks').select(`
            id, created_at, status, feedback_type, message, rating,
            customer_name, customer_email, customer_phone, customer_profile_id,
            manager_note, flag_vip_customer, flag_sensitive_customer,
            feedback_images, image_urls, receipt_images, receipt_url, product_image_url,
            general_eval_rating, general_eval_comment, manager_note_updated_at, manager_note_updated_by,
            business_id, branch_id, resolved_at, updated_at,
            branches (id, branch_name_tr),
            customer_profiles (
              id, name, email, phone, customer_number, created_at, updated_at, 
              flag_vip_customer, flag_sensitive_customer, admin_note, 
              users:user_id(first_name, last_name)
            ),
            manager_note_updater:manager_note_updated_by (first_name, last_name)
        `).eq('business_id', businessId).order('created_at', { ascending: false }).limit(20);
      if (selectedBranchId !== 'all') recentQuery = recentQuery.eq('branch_id', selectedBranchId);
      const { data: recentData } = await recentQuery;
      if (recentData && recentData.length > 0) {
          const unlinkedFeedbacks = recentData.filter(f => !f.customer_profiles && f.customer_email);
          const emailsToCheck = [...new Set(unlinkedFeedbacks.map(f => f.customer_email))];
          if (emailsToCheck.length > 0) {
              const { data: profiles } = await supabase
                  .from('customer_profiles')
                  .select('id, name, email, flag_vip_customer, flag_sensitive_customer, admin_note, users(first_name, last_name)')
                  .in('email', emailsToCheck);
              if (profiles && profiles.length > 0) {
                  const profileMap = {};
                  profiles.forEach(p => { profileMap[p.email] = p; });
                  recentData.forEach(f => {
                      if (!f.customer_profiles && f.customer_email && profileMap[f.customer_email]) {
                          f.customer_profiles = profileMap[f.customer_email];
                          supabase.from('feedbacks')
                              .update({ customer_profile_id: profileMap[f.customer_email].id })
                              .eq('id', f.id)
                              .then(({ error }) => { if(error) console.error("Auto-link error", error) });
                      }
                  });
              }
          }
      }
      setRecentFeedbacks(recentData || []);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      toast({ variant: "destructive", title: "Hata", description: "Veriler yüklenemedi." });
    } finally {
      setLoading(false);
      setLoadingFeedbacks(false);
    }
  }, [businessId, selectedBranchId, dateRange, getDateIntervals, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase.channel('admin-dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` }, () => fetchData())
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetchData]);

  const handleStatusChange = (id, newStatus) => {
      setRecentFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      fetchData(); 
  };
  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };
  const handleOpenCustomerProfile = (e, feedback) => {
    e.stopPropagation();
    const profileId = feedback.customer_profile_id || (feedback.customer_profiles?.id) || null;
    const profileEmail = getCustomerData(feedback, 'email');
    setSelectedCustomer({ id: profileId, email: profileEmail });
    setCustomerModalOpen(true);
  };
  const handleFlagsUpdate = (customerId, newFlags) => {
      setRecentFeedbacks(prev => prev.map(f => {
          if (f.customer_profile_id === customerId || f.customer_profiles?.id === customerId) {
               return { 
                 ...f, 
                 customer_profiles: { 
                   ...f.customer_profiles, 
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

  return (
    <div className="mx-auto max-w-7xl pb-10 px-4 pt-20 md:px-6 md:pt-0 lg:px-8">
      <div className="mt-4 flex flex-col justify-between gap-6 md:mt-0 md:flex-row md:items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{displayTitle}</h1>
          <p className="text-slate-400 text-sm">İşletmenizin performansını ve müşteri geri bildirimlerini anında takip edin</p>
        </div>
        <div className="w-full md:w-48 shrink-0">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /><span>{dateOptions[dateRange]}</span></div></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white">{Object.entries(dateOptions).map(([key, value]) => (<SelectItem key={key} value={key}>{value}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SparklineCard title="Toplam Bildirim" value={`${metrics.total.value}`} delta={metrics.total.delta} deltaType={metrics.total.type} icon={MessageSquare} colorClass="bg-blue-500" sparkData={sparklineData.total} loading={loading}/>
        <SparklineCard title="Bekleyen Şikayet" value={`${metrics.complaints.value}`} delta={metrics.complaints.delta} deltaType={metrics.complaints.type} icon={AlertTriangle} colorClass="bg-red-500" sparkData={sparklineData.complaints} loading={loading} isInverseMetric={true}/>
        <SparklineCard title="Çözülenler" value={`${metrics.resolved.value}`} delta={metrics.resolved.delta} deltaType={metrics.resolved.type} icon={CheckCircle2} colorClass="bg-green-500" sparkData={sparklineData.resolved} loading={loading}/>
        <SparklineCard title="Ort. Puan" value={metrics.rating.value} delta={metrics.rating.delta} deltaType={metrics.rating.type} icon={Star} colorClass="bg-yellow-500" sparkData={sparklineData.rating} loading={loading}/>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <Tabs defaultValue="stars" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div><h2 className="text-white font-bold text-xl mb-1">Analiz Grafikleri</h2><p className="text-slate-400 text-sm">Müşteri geri bildirimlerinin detaylı dağılımı</p></div>
            <TabsList className="bg-slate-800 border-slate-700 w-full grid grid-cols-2 h-auto p-1 sm:w-auto sm:flex sm:h-10">
              <TabsTrigger value="stars" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm"><Star className="w-4 h-4 mr-2" />Yıldız Dağılımı</TabsTrigger>
              <TabsTrigger value="types" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm"><MessageSquare className="w-4 h-4 mr-2" />Form Türleri</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="stars" className="mt-0">
            <div className="w-full h-[250px] sm:h-[300px]">
              {loading ? (<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>) : !hasData ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/50"><Star className="w-12 h-12 text-slate-600 mb-3 opacity-50" /><h3 className="text-lg font-medium text-slate-300">Henüz değerlendirme almadınız</h3></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={ratingDistribution} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} strokeOpacity={0.3} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={60} />
                    <Tooltip formatter={(value) => [value, 'Adet']} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>{ratingDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}<LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={12} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
          <TabsContent value="types" className="mt-0">
            <div className="w-full h-[250px] sm:h-[300px]">
              {loading ? (<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>) : !hasData ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/50"><MessageSquare className="w-12 h-12 text-slate-600 mb-3 opacity-50" /><h3 className="text-lg font-medium text-slate-300">Henüz geri bildirim almadınız</h3></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={feedbackTypeDistribution} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} strokeOpacity={0.3} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={85} />
                    <Tooltip formatter={(value) => [value, 'Adet']} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={40}>{feedbackTypeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}<LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={12} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Son Aktiviteler</h2>
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => navigate('/admin-panel/feedbacks')}>Tümünü Gör <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </div>

        {loadingFeedbacks ? (<div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>) : recentFeedbacks.length === 0 ? (<div className="text-center py-8 text-slate-500">Henüz aktivite yok.</div>) : (
            <div className="space-y-3">
                {recentFeedbacks.map((f) => {
                   const profileFirstName = f.customer_profiles?.users?.first_name;
                   const profileLastName = f.customer_profiles?.users?.last_name || '';
                   const profileFullName = profileFirstName ? `${profileFirstName} ${profileLastName}` : f.customer_profiles?.name;
                   
                   const customerName = profileFullName || f.customer_name || 'İsimsiz';
                   const smartName = formatCustomerName(customerName);

                   const isVip = f.flag_vip_customer || f.customer_profiles?.flag_vip_customer;
                   const isSensitive = f.flag_sensitive_customer || f.customer_profiles?.flag_sensitive_customer;
                   const rating = f.rating || f.general_eval_rating;
                   const hasImgs = hasImages(f);
                   const isEscalated = f.status === 'escalated';
                   const hasManagerNote = !!f.manager_note;
                   const hasCustomerProfileNote = f.customer_profiles?.admin_note && f.customer_profiles.admin_note.trim().length > 0;
                   // 🟢 DÜZELTME: Mesaj veya Genel Yorum Kontrolü
                   const hasComment = (f.message && f.message.trim().length > 0) || (f.general_eval_comment && f.general_eval_comment.trim().length > 0);

                   return (
                    <div key={f.id} onClick={() => handleFeedbackClick(f)} className={cn("group rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden shadow-sm border", isEscalated ? "bg-red-950/40 border-red-500/50 hover:bg-red-900/50 hover:border-red-400 animate-pulse-subtle" : "bg-slate-900/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700")}>
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
                            <div className="flex-1"><p className="text-slate-200 text-sm line-clamp-2 leading-relaxed">{f.message || <span className="text-slate-600 italic">Mesaj içeriği yok</span>}</p>{rating > 0 && (<div className="flex items-center gap-0.5 mt-1.5">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-yellow-500 text-yellow-500' : 'fill-none text-slate-700'}`} />))}</div>)}</div>
                          </div>
                        </div>
                        <div className="w-full md:w-auto md:min-w-[200px] flex md:flex-col justify-between md:items-end gap-2 pl-0 md:pl-4 md:border-l border-slate-800/50 mt-4 md:mt-0">
                           <div className="flex items-center gap-2 group/customer hover:bg-slate-800 p-1.5 rounded-lg -ml-1.5 md:ml-0 transition-colors mr-auto md:mr-0 cursor-pointer" onClick={(e) => handleOpenCustomerProfile(e, f)}>
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover/customer:border-indigo-500/50 transition-colors"><User className="w-4 h-4 text-slate-400 group-hover/customer:text-indigo-400" /></div>
                             <div className="flex flex-col items-start md:items-end">
                                <span className={cn("text-sm font-medium transition-colors truncate max-w-[140px] flex items-center gap-1", hasCustomerProfileNote ? "text-blue-400 font-bold" : "text-slate-300 group-hover/customer:text-indigo-300")} title={hasCustomerProfileNote ? "Müşteri Notu Mevcut" : customerName}>
                                  {smartName}
                                </span>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 mt-auto flex-wrap justify-end">
                              {/* 🟢 DÜZELTME: "Genel D." Flag'i Eklendi */}
                              {hasComment && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-blue-400 border border-slate-700"><FileText className="w-3 h-3" /> <span className="hidden sm:inline">Genel D.</span></div>)}
                              {hasImgs && (<div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-teal-400 border border-slate-700"><ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline">Görsel</span></div>)}
                              {hasManagerNote && (<div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30"><StickyNote className="w-3.5 h-3.5 fill-current" /></div>)}
                              {isVip && (<div className="flex items-center gap-1 px-3 py-1 bg-purple-900/30 rounded text-xs text-purple-300 border border-purple-500/30 font-medium"><Crown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">VIP</span></div>)}
                              {isSensitive && (<div className="flex items-center gap-1 px-3 py-1 bg-orange-900/30 rounded text-xs text-orange-300 border border-orange-500/30 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hassas</span></div>)}
                           </div>
                        </div>
                      </div>
                    </div>
                   );
                })}
            </div>
        )}
      </div>
      {selectedFeedback && <FeedbackDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} feedback={selectedFeedback} onStatusChange={handleStatusChange} />}
      {customerModalOpen && <CustomerProfileModal isOpen={customerModalOpen} onClose={() => setCustomerModalOpen(false)} customerProfileId={selectedCustomer?.id} customerEmail={selectedCustomer?.email} businessId={businessId} onFlagsUpdate={handleFlagsUpdate} />}
    </div>
  );
};

export default AdminPanel;