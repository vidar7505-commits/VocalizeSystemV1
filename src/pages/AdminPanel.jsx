import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area
} from 'recharts';
import { subDays, startOfDay, endOfDay, subMonths, startOfMonth } from 'date-fns';
import { cn, formatCustomerName, getCustomerData, calculateDelta } from "@/lib/utils";

// Components
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import AdminMobileNavbar from '@/components/AdminMobileNavbar';
import CustomerProfileModal from '@/components/CustomerProfileModal';

// --- SUB-COMPONENTS ---

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
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-5 shadow-sm transition-all hover:border-slate-700 h-[160px] flex flex-col justify-between group">
      <div className="flex justify-between items-start relative z-20 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-400 truncate">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-800 rounded animate-pulse mt-1"></div>
          ) : (
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight truncate">{value}</h3>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 border border-white/5 shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div className="relative z-20 flex items-center gap-2 mt-1 flex-wrap">
        {!loading && (
          <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border ${sentimentColor}`}>
            <TrendIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{delta}</span>
          </div>
        )}
        <span className="text-[10px] sm:text-xs text-slate-500 hidden sm:inline">geçen döneme göre</span>
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

// --- MAIN COMPONENT ---

const AdminPanel = () => {
  const { businessId, selectedBranchId, branches, dateRange, setDateRange } = useAdminContext();
  const navigate = useNavigate();
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

  const displayTitle = selectedBranchId === 'all' 
    ? "Ana Panel" 
    : branches.find(b => b.id === selectedBranchId)?.branch_name_tr || "Ana Panel";

  const dateOptions = { 'Bugün': 'Bugün', 'Son 7 Gün': 'Son 7 Gün', 'Son 30 Gün': 'Son 30 Gün', 'Bu Ay': 'Bu Ay' };

  const getDateIntervals = useCallback(() => {
    const now = new Date();
    let currentStart, prevStart;
    switch (dateRange) {
        case 'Bugün': currentStart = startOfDay(now); prevStart = startOfDay(subDays(now, 1)); break;
        case 'Son 7 Gün': currentStart = subDays(now, 7); prevStart = subDays(now, 14); break;
        case 'Son 30 Gün': currentStart = subDays(now, 30); prevStart = subDays(now, 60); break;
        case 'Bu Ay': currentStart = startOfMonth(now); prevStart = startOfMonth(subMonths(now, 1)); break;
        default: currentStart = subDays(now, 30); prevStart = subDays(now, 60); break;
    }
    return { currentStart, prevStart };
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setLoadingFeedbacks(true);
    
    try {
      const { currentStart, prevStart } = getDateIntervals();
      
      let query = supabase.from('feedbacks')
        .select('id, created_at, status, feedback_type, rating, overall_rating, resolved_at')
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
          const rated = ds.filter(f => f.rating || f.overall_rating).map(f => f.rating || f.overall_rating);
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

      const sparkDataMap = new Map();
      rawData.forEach(f => {
          const day = new Date(f.created_at).toISOString().split('T')[0];
          if (!sparkDataMap.has(day)) {
              sparkDataMap.set(day, { date: day, total: 0, complaints: 0, resolved: 0, rating: 0, ratingCount: 0 });
          }
          const entry = sparkDataMap.get(day);
          entry.total += 1;
          if (f.feedback_type === 'complaint' && isPending(f.status)) entry.complaints += 1;
          if (f.status === 'resolved') entry.resolved += 1;
          if (f.rating || f.overall_rating) { entry.rating += f.rating || f.overall_rating; entry.ratingCount += 1; }
      });
      const sparkList = Array.from(sparkDataMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      sparkList.forEach(e => { if (e.ratingCount > 0) e.rating = e.rating / e.ratingCount; else e.rating = 0; });

      setSparklineData({
        total: sparkList.map(e => ({ value: e.total })),
        complaints: sparkList.map(e => ({ value: e.complaints })),
        resolved: sparkList.map(e => ({ value: e.resolved })),
        rating: sparkList.map(e => ({ value: e.rating }))
      });

      const ratingCount = {};
      currentData.forEach(f => {
          const r = f.rating || f.overall_rating;
          if (r > 0) ratingCount[r] = (ratingCount[r] || 0) + 1;
      });
      const dist = [
          { name: '5 Yıldız', count: ratingCount[5] || 0, fill: '#10b981' },
          { name: '4 Yıldız', count: ratingCount[4] || 0, fill: '#14b8a6' },
          { name: '3 Yıldız', count: ratingCount[3] || 0, fill: '#f59e0b' },
          { name: '2 Yıldız', count: ratingCount[2] || 0, fill: '#f97316' },
          { name: '1 Yıldız', count: ratingCount[1] || 0, fill: '#ef4444' }
      ];
      setRatingDistribution(dist);

      const typeDist = {};
      currentData.forEach(f => {
          const type = f.feedback_type === 'evaluation' || f.feedback_type === 'review' || f.feedback_type === 'rating' ? 'evaluation' : f.feedback_type;
          typeDist[type] = (typeDist[type] || 0) + 1;
      });
      const typeNames = { complaint: 'Şikayet', suggestion: 'Öneri', evaluation: 'Değerlendirme' };
      const typeColors = { complaint: '#ef4444', suggestion: '#3b82f6', evaluation: '#f59e0b' };
      setFeedbackTypeDistribution(Object.entries(typeDist).map(([k, v]) => ({ name: typeNames[k] || k, count: v, fill: typeColors[k] })));

      const recentFeedbackList = await (async () => {
          let q = supabase.from('feedbacks').select('*, branches(id, branch_name_tr), customer_profiles(id, admin_note, flag_vip_customer, flag_sensitive_customer)').eq('business_id', businessId);
          if (selectedBranchId !== 'all') q = q.eq('branch_id', selectedBranchId);
          const { data } = await q.order('created_at', { ascending: false }).limit(5);
          return data || [];
      })();
      setRecentFeedbacks(recentFeedbackList);
      setLoadingFeedbacks(false);
    } catch (e) { console.error("Error:", e); setLoadingFeedbacks(false); } finally { setLoading(false); }
  }, [businessId, selectedBranchId, getDateIntervals]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  const handleOpenCustomerProfile = (e, feedback) => {
    e.stopPropagation();
    setSelectedCustomer({ id: feedback.customer_profile_id, email: feedback.customer_email });
    setCustomerModalOpen(true);
  };

  const handleStatusChange = (feedbackId, newStatus) => {
    setRecentFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f));
  };

  const handleFlagsUpdate = (customerId, flags, email) => {
    setRecentFeedbacks(prev => prev.map(f => 
      f.customer_profile_id === customerId 
        ? { ...f, customer_profiles: { ...f.customer_profiles, ...flags } }
        : f
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white overflow-x-hidden">
      <AdminMobileNavbar />
      <div className="max-w-full px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{displayTitle}</h1>
            <p className="text-sm text-slate-400 mt-1">Geri bildirim analitikleri ve aktiviteler</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-700 text-slate-200">
              <span className="text-sm">{dateRange}</span>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {Object.values(dateOptions).map(opt => <SelectItem key={opt} value={opt} className="text-slate-200">{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <SparklineCard title="Toplam" value={metrics.total.value} delta={metrics.total.delta} deltaType={metrics.total.type} icon={MessageSquare} colorClass="bg-blue-600" sparkData={sparklineData.total} loading={loading} />
          <SparklineCard title="Şikayetler" value={metrics.complaints.value} delta={metrics.complaints.delta} deltaType={metrics.complaints.type} icon={AlertTriangle} colorClass="bg-red-600" sparkData={sparklineData.complaints} loading={loading} isInverseMetric={true} />
          <SparklineCard title="Çözüldü" value={metrics.resolved.value} delta={metrics.resolved.delta} deltaType={metrics.resolved.type} icon={CheckCircle2} colorClass="bg-emerald-600" sparkData={sparklineData.resolved} loading={loading} />
          <SparklineCard title="Puanlama" value={metrics.rating.value} delta={metrics.rating.delta} deltaType={metrics.rating.type} icon={Star} colorClass="bg-yellow-600" sparkData={sparklineData.rating} loading={loading} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">Analitikler</h2>
          <Tabs defaultValue="ratings" className="w-full">
            <TabsList className="w-full overflow-x-auto bg-slate-800 border-b border-slate-700 rounded-none">
              <TabsTrigger value="ratings" className="min-w-max">Puanlamalar</TabsTrigger>
              <TabsTrigger value="types" className="min-w-max">Geri Bildirim Türleri</TabsTrigger>
            </TabsList>

            <TabsContent value="ratings" className="mt-4">
              <div className="w-full h-[250px] sm:h-[300px]">
                {loading ? (<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>) : !hasData ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 sm:p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/50"><Star className="w-12 h-12 text-slate-600 mb-3 opacity-50" /><h3 className="text-lg font-medium text-slate-300">Henüz değerlendirme almadınız</h3></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={ratingDistribution} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} strokeOpacity={0.3} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={45} />
                      <Tooltip formatter={(value) => [value, 'Adet']} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#ffffff', fontSize: '12px' }} itemStyle={{ color: '#ffffff' }} cursor={{ fill: '#ffffff10' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>{ratingDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}<LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={11} /></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>

            <TabsContent value="types" className="mt-4">
              <div className="w-full h-[250px] sm:h-[300px]">
                {loading ? (<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>) : !hasData ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 sm:p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/50"><MessageSquare className="w-12 h-12 text-slate-600 mb-3 opacity-50" /><h3 className="text-lg font-medium text-slate-300">Henüz geri bildirim almadınız</h3></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={feedbackTypeDistribution} margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} strokeOpacity={0.3} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <Tooltip formatter={(value) => [value, 'Adet']} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#ffffff', fontSize: '12px' }} itemStyle={{ color: '#ffffff' }} cursor={{ fill: '#ffffff10' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={36}>{feedbackTypeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}<LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={11} /></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-white">Son Aktiviteler</h2>
            <Button variant="ghost" className="text-slate-400 hover:text-white text-sm" onClick={() => navigate('/admin-panel/feedbacks')}>Tümünü Gör <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>

          {loadingFeedbacks ? (<div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>) : recentFeedbacks.length === 0 ? (<div className="text-center py-8 text-slate-500 text-sm">Henüz aktivite yok.</div>) : (
            <div className="space-y-3">
              {recentFeedbacks.map((f) => {
                const customerName = getCustomerData(f, 'name');
                const smartName = formatCustomerName(customerName);
                const isVip = f.flag_vip_customer || f.customer_profiles?.flag_vip_customer;
                const isSensitive = f.flag_sensitive_customer || f.customer_profiles?.flag_sensitive_customer;
                const rating = f.rating || f.overall_rating;
                const hasImgs = hasImages(f);
                const isEscalated = f.status === 'escalated';
                const hasManagerNote = !!f.manager_note;
                const hasCustomerProfileNote = f.customer_profiles?.admin_note && f.customer_profiles.admin_note.trim().length > 0;

                return (
                  <div key={f.id} onClick={() => handleFeedbackClick(f)} className={cn("group rounded-xl p-3 sm:p-4 transition-all cursor-pointer relative overflow-hidden shadow-sm border", isEscalated ? "bg-red-950/40 border-red-500/50 hover:bg-red-900/50 hover:border-red-400 animate-pulse-subtle" : "bg-slate-900/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700")}>
                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-start">
                      <div className="flex-1 w-full min-w-0 pr-0 md:pr-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getTypeBadge(f.feedback_type)}
                          {getStatusBadge(f.status)}
                          <span className="text-slate-500 text-xs flex items-center gap-1 ml-auto md:ml-0 shrink-0"><Calendar className="w-3 h-3 shrink-0" />{new Date(f.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <Badge variant="outline" className="text-[10px] sm:text-[11px] font-medium text-slate-400 border-slate-700 bg-slate-900/80 truncate max-w-[140px] md:max-w-[200px]">{f.branches?.branch_name_tr || "Şube Bilinmiyor"}</Badge>
                        </div>
                        <div className="flex gap-2 sm:gap-3 mt-1">
                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.feedback_type === 'complaint' ? 'bg-red-500' : f.feedback_type === 'suggestion' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-xs sm:text-sm line-clamp-2 leading-relaxed break-words">{f.message || <span className="text-slate-600 italic">Mesaj içeriği yok</span>}</p>
                            {rating > 0 && (
                              <div className="flex items-center gap-0.5 mt-1.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-yellow-500 text-yellow-500' : 'fill-none text-slate-700'}`} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-full md:w-auto md:min-w-[180px] flex md:flex-col justify-between md:items-end gap-2 pl-0 md:pl-4 md:border-l border-slate-800/50 mt-3 md:mt-0">
                        <div className="flex items-center gap-2 group/customer hover:bg-slate-800 p-1 rounded-lg -ml-1 transition-colors mr-auto md:mr-0 cursor-pointer" onClick={(e) => handleOpenCustomerProfile(e, f)}>
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover/customer:border-indigo-500/50 transition-colors">
                            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover/customer:text-indigo-400" />
                          </div>
                          <div className="flex flex-col items-start md:items-end min-w-0">
                            <span className={cn("text-xs sm:text-sm font-medium transition-colors truncate flex items-center gap-1", hasCustomerProfileNote ? "text-blue-400 font-bold" : "text-slate-300 group-hover/customer:text-indigo-300")} title={hasCustomerProfileNote ? "Müşteri Notu Mevcut" : customerName}>
                              {smartName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-auto flex-wrap justify-end">
                          {hasImgs && (<div className="flex items-center gap-0.5 px-1.5 py-1 bg-slate-800 rounded text-[10px] text-teal-400 border border-slate-700 shrink-0"><ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline text-xs">Görsel</span></div>)}
                          {hasManagerNote && (<div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0"><StickyNote className="w-3.5 h-3.5 fill-current" /></div>)}
                          {isVip && (<div className="flex items-center gap-0.5 px-2 py-1 bg-purple-900/30 rounded text-[10px] text-purple-300 border border-purple-500/30 font-medium shrink-0"><Crown className="w-3 h-3" /> <span className="hidden sm:inline text-xs">VIP</span></div>)}
                          {isSensitive && (<div className="flex items-center gap-0.5 px-2 py-1 bg-orange-900/30 rounded text-[10px] text-orange-300 border border-orange-500/30 font-medium shrink-0"><AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline text-xs">Hassas</span></div>)}
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
      {selectedFeedback && <FeedbackDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} feedback={selectedFeedback} onStatusChange={handleStatusChange} />}
      {customerModalOpen && <CustomerProfileModal isOpen={customerModalOpen} onClose={() => setCustomerModalOpen(false)} customerProfileId={selectedCustomer?.id} customerEmail={selectedCustomer?.email} businessId={businessId} onFlagsUpdate={handleFlagsUpdate} />}
    </div>
  );
};

export default AdminPanel;