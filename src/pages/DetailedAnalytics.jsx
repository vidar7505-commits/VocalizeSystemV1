import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { supabase } from '@/lib/customSupabaseClient';
import AdminMobileNavbar from '@/components/AdminMobileNavbar';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays, sub } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Star, CheckCircle, AlertTriangle, 
  Activity, QrCode, Globe, MapPin, Minus, ArrowUpRight, ArrowDownRight,
  BarChart3, Heart, Zap, LayoutList, MousePointerClick, Filter, Link as LinkIcon,
  AlertCircle, CheckCircle2, HelpCircle, Info
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import DateRangePicker from '@/components/DateRangePicker';

// --- RENK PALETİ ---
const COLORS = {
  primary: '#0ea5e9', // Sky 500
  success: '#22c55e', // Green 500
  warning: '#eab308', // Yellow 500
  danger: '#ef4444',  // Red 500
  purple: '#8b5cf6',  // Violet 500
  indigo: '#6366f1',  // Indigo 500
  slate: '#64748b'    // Slate 500
};

const formatNumber = (num) => new Intl.NumberFormat('tr-TR').format(num);

// --- YARDIMCI: PUAN HESAPLAMA (0-100) ---
const calculateScore = (val) => {
    if (!val) return 0;
    return (val - 1) * 25; 
};

// --- YARDIMCI: AĞIRLIKLI SADAKAT SKORU ---
const getWeightedScore = (rating, general) => {
    const rScore = rating ? calculateScore(rating) : null;
    const gScore = general ? calculateScore(general) : null;

    if (rScore !== null && gScore !== null) return (rScore * 0.40) + (gScore * 0.60);
    if (gScore !== null) return gScore;
    if (rScore !== null) return rScore;
    return 0;
};

// --- GÜNCELLENMİŞ ŞUBE DURUM MANTIĞI (RAPORLAMA DİLİ) ---
const getBranchStatus = (score, riskyRate, resolveRate, total) => {
    // 1. Veri Yetersizliği
    if (total < 5) {
        return { label: 'Veri Az', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: HelpCircle, reason: "Henüz analiz için yeterli veri hacmi oluşmadı." };
    }
    
    // 2. Kırmızı Alarm (Riskli)
    if (score < 50) return { label: 'Riskli', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle, reason: "Genel sadakat puanı kritik seviyenin altında." };
    if (riskyRate > 40) return { label: 'Riskli', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle, reason: "Negatif müşteri bildirimi oranı %40'ın üzerinde." };
    
    // 3. Sarı Alarm (Dikkat)
    if (resolveRate < 50) return { label: 'Dikkat', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle, reason: "Şikayet çözüm oranı %50'nin altında seyrediyor." };
    if (score < 70) return { label: 'Dikkat', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle, reason: "Sadakat puanları ortalama bantta." };
    if (riskyRate > 25) return { label: 'Dikkat', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle, reason: "Negatif bildirim oranında artış eğilimi." };

    // 4. Yeşil (İyi)
    if (score > 85) return { label: 'Mükemmel', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2, reason: "Müşteri sadakat metrikleri üst seviyede." };
    if (resolveRate > 90) return { label: 'İyi', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2, reason: "Operasyonel çözüm oranı çok yüksek." };
    
    return { label: 'İyi', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2, reason: "Tüm performans metrikleri dengeli." };
};

// --- INFO TOOLTIP BİLEŞENİ ---
const InfoTooltip = ({ text }) => (
  <div className="group relative inline-flex items-center ml-1 z-10">
    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
      <p className="text-[11px] text-slate-300 leading-relaxed text-center font-medium">{text}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700"></div>
    </div>
  </div>
);

// --- GRAFİK TOOLTIP ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalValue = payload.find(p => p.dataKey === 'total')?.value || 
                       payload.reduce((acc, curr) => acc + (typeof curr.value === 'number' ? curr.value : 0), 0);

    return (
      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl text-xs z-50 min-w-[180px]">
        <p className="font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2 text-sm">{label}</p>
        <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium">Toplam</span>
            <span className="text-white font-bold text-base">{totalValue}</span>
        </div>
        <div className="space-y-1.5">
            {payload[0].name === 'Bildirim' ? (
               <>
                 <TooltipRow label="Şikayet" value={payload[0].payload.complaint} color={COLORS.danger} />
                 <TooltipRow label="Öneri" value={payload[0].payload.suggestion} color={COLORS.primary} />
                 <TooltipRow label="Değerlendirme" value={payload[0].payload.evaluation} color={COLORS.warning} />
               </>
            ) : (
                payload.slice().reverse().map((p, i) => (
                    <TooltipRow key={i} label={p.name} value={p.value} color={p.color || p.fill} />
                ))
            )}
        </div>
      </div>
    );
  }
  return null;
};

const TooltipRow = ({ label, value, color }) => (
    <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color }}></div>
            <span className="text-slate-300 font-medium capitalize">{label}</span>
        </div>
        <span className="text-white font-mono font-bold">{formatNumber(value)}</span>
    </div>
);

// --- KPI KART ---
const KpiCard = ({ title, value, previousValue, icon: Icon, colorClass, suffix = "", inverseTrend = false }) => {
  let percentChange = 0;
  let trendDirection = "neutral";
  
  if (previousValue > 0) {
    percentChange = ((value - previousValue) / previousValue) * 100;
    trendDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
  } else if (value > 0) {
    trendDirection = 'up';
    percentChange = 100;
  }

  const isGood = inverseTrend ? trendDirection === 'down' : trendDirection === 'up';
  
  let trendColor = "text-slate-400 bg-slate-800 border-slate-700";
  if (trendDirection !== 'neutral') {
    trendColor = isGood 
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
      : "text-rose-400 bg-rose-500/10 border-rose-500/20";
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#1e293b]/50 p-5 shadow-lg hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
           <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
           <h3 className="text-3xl font-bold text-white tracking-tight">{value}{suffix}</h3>
        </div>
        <div className={`p-2.5 rounded-xl border border-slate-700/50 bg-[#0f172a] ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-2">
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${trendColor}`}>
          {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
          {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
          {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
          <span>%{Math.abs(percentChange).toFixed(0)}</span>
        </div>
        <span className="text-xs text-slate-500">
          önceki: <span className="font-mono text-slate-400">{previousValue}{suffix}</span>
        </span>
      </div>
    </div>
  );
};

const DetailedAnalytics = () => {
  const { businessId, selectedBranchId } = useAdminContext();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [prevFeedbacks, setPrevFeedbacks] = useState([]);
  const [trafficStats, setTrafficStats] = useState({ visits: 0, conversionRate: 0, qrCount: 0, webCount: 0 });
  const [trendViewMode, setTrendViewMode] = useState('total'); 
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [preset, setPreset] = useState('30days');

  // --- VERİ ÇEKME ---
  const fetchData = useCallback(async () => {
    if (!businessId || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const dayDiff = differenceInDays(dateRange.to, dateRange.from) + 1;
      const prevFrom = sub(dateRange.from, { days: dayDiff });
      const prevTo = sub(dateRange.to, { days: dayDiff });

      let queryCurr = supabase.from('feedbacks').select('id, created_at, rating, general_eval_rating, feedback_type, status, branch_id, branches(branch_name_tr)').eq('business_id', businessId).gte('created_at', startOfDay(dateRange.from).toISOString()).lte('created_at', endOfDay(dateRange.to).toISOString());
      if (selectedBranchId !== 'all') queryCurr = queryCurr.eq('branch_id', selectedBranchId);
      
      let queryPrev = supabase.from('feedbacks').select('id, rating, general_eval_rating, status, feedback_type').eq('business_id', businessId).gte('created_at', startOfDay(prevFrom).toISOString()).lte('created_at', endOfDay(prevTo).toISOString());
      if (selectedBranchId !== 'all') queryPrev = queryPrev.eq('branch_id', selectedBranchId);

      let trafficQuery = supabase
        .from('page_views')
        .select('id, source, branch_id', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      if (selectedBranchId !== 'all') {
        trafficQuery = trafficQuery.eq('branch_id', selectedBranchId);
      }

      const [resCurr, resPrev, resTraffic] = await Promise.all([queryCurr, queryPrev, trafficQuery]);

      if (resCurr.error) throw resCurr.error;
      
      const currData = resCurr.data || [];
      setFeedbacks(currData);
      setPrevFeedbacks(resPrev.data || []);

      const trafficData = resTraffic.data || [];
      const totalVisits = resTraffic.count || 0;
      
      const qrCount = trafficData.filter(t => t.source === 'qr').length;
      const webCount = trafficData.filter(t => t.source !== 'qr').length;
      const actionCount = currData.length;

      setTrafficStats({
          visits: totalVisits,
          qrCount,
          webCount,
          conversionRate: totalVisits > 0 ? ((actionCount / totalVisits) * 100).toFixed(1) : 0
      });

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Hata", description: "Veriler alınamadı." });
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedBranchId, dateRange, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- KPI ---
  const kpi = useMemo(() => {
    const calc = (data) => {
      const total = data.length;
      if (total === 0) return { total: 0, loyaltyScore: 0, resolvedRate: 0, complaintCount: 0 };
      
      let totalScore = 0;
      let scoreCount = 0;
      data.forEach(f => {
         const s = getWeightedScore(f.rating, f.general_eval_rating);
         if (s > 0 || f.rating || f.general_eval_rating) { 
             totalScore += s;
             scoreCount++;
         }
      });
      
      const loyaltyScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(0) : 0;
      const resolvedCount = data.filter(f => f.status === 'resolved').length;
      const resolvedRate = ((resolvedCount / total) * 100).toFixed(0);
      const complaintCount = data.filter(f => f.feedback_type === 'complaint' && f.status !== 'resolved').length;
      
      return { total, loyaltyScore, resolvedRate, complaintCount };
    };
    return { curr: calc(feedbacks), prev: calc(prevFeedbacks) };
  }, [feedbacks, prevFeedbacks]);

  // --- TREND ---
  const trendData = useMemo(() => {
    const dailyMap = {};
    let currentDate = new Date(dateRange.from);
    while (currentDate <= dateRange.to) {
        const dayKey = format(currentDate, 'dd MMM', { locale: tr });
        dailyMap[dayKey] = { name: dayKey, total: 0, complaint: 0, suggestion: 0, evaluation: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
    }
    feedbacks.forEach(f => {
      const day = format(parseISO(f.created_at), 'dd MMM', { locale: tr });
      if (dailyMap[day]) {
        dailyMap[day].total += 1;
        if (f.feedback_type === 'complaint') dailyMap[day].complaint += 1;
        else if (f.feedback_type === 'suggestion') dailyMap[day].suggestion += 1;
        else dailyMap[day].evaluation += 1;
      }
    });
    return Object.values(dailyMap);
  }, [feedbacks, dateRange]);

  // --- MARKA VS DENEYİM ---
  const loyaltyComparison = useMemo(() => {
      let iSum = 0, iCount = 0;
      let gSum = 0, gCount = 0;

      feedbacks.forEach(f => {
          if (f.rating) { iSum += f.rating; iCount++; }
          if (f.general_eval_rating) { gSum += f.general_eval_rating; gCount++; }
      });
      
      const instant = iCount ? ((iSum / iCount) / 5 * 100).toFixed(0) : 0;
      const general = gCount ? ((gSum / gCount) / 5 * 100).toFixed(0) : 0;
      
      return { instant, general };
  }, [feedbacks]);

  // --- DUYGU ANALİZİ (POZİTİF/NEGATİF) ---
  const sentimentData = useMemo(() => {
    const valid = feedbacks.filter(f => f.general_eval_rating || f.rating);
    const total = valid.length || 1;
    const getScore = (f) => f.general_eval_rating || f.rating; 
    
    const positive = valid.filter(f => getScore(f) >= 4).length;
    const neutral = valid.filter(f => getScore(f) === 3).length;
    const negative = valid.filter(f => getScore(f) <= 2).length;
    
    return [
      { label: 'Pozitif (4-5)', count: positive, percent: ((positive/total)*100).toFixed(1), color: COLORS.success },
      { label: 'Nötr (3)', count: neutral, percent: ((neutral/total)*100).toFixed(1), color: COLORS.warning },
      { label: 'Negatif (1-2)', count: negative, percent: ((negative/total)*100).toFixed(1), color: COLORS.danger }
    ];
  }, [feedbacks]);

  const sourceData = useMemo(() => [
    { name: 'QR Kod', value: trafficStats.qrCount, color: COLORS.success },
    { name: 'Web/Link', value: trafficStats.webCount, color: COLORS.primary }
  ].filter(i => i.value > 0), [trafficStats]);

  // --- ŞUBE PERFORMANS KARŞILAŞTIRMASI ---
  const branchLeaderboard = useMemo(() => {
    if (selectedBranchId !== 'all') return null;
    const map = {};
    const totalAll = feedbacks.length || 1;

    feedbacks.forEach(f => {
        const b = f.branches?.branch_name_tr || 'Bilinmiyor';
        if (!map[b]) map[b] = { 
            name: b, total: 0, resolved: 0, 
            scoreSum: 0, scoreCount: 0,
            happy: 0, neutral: 0, risky: 0 
        };
        
        map[b].total += 1;
        if (f.status === 'resolved') map[b].resolved += 1;

        const s = getWeightedScore(f.rating, f.general_eval_rating);
        if (s > 0 || f.rating || f.general_eval_rating) {
            map[b].scoreSum += s;
            map[b].scoreCount += 1;
            
            const mainScore = f.general_eval_rating || f.rating;
            if (mainScore >= 4) map[b].happy += 1;
            else if (mainScore === 3) map[b].neutral += 1; 
            else if (mainScore <= 2) map[b].risky += 1;
        }
    });

    return Object.values(map).map(b => {
        const loyaltyScore = b.scoreCount ? (b.scoreSum / b.scoreCount).toFixed(0) : 0;
        const resolveRate = b.total ? ((b.resolved / b.total) * 100).toFixed(0) : 0;
        
        const scoreBase = b.scoreCount || 1; 
        const happyRate = ((b.happy / scoreBase) * 100).toFixed(0);
        const neutralRate = ((b.neutral / scoreBase) * 100).toFixed(0); 
        const riskyRate = ((b.risky / scoreBase) * 100).toFixed(0);

        return { ...b, loyaltyScore, resolveRate, happyRate, neutralRate, riskyRate, total: b.total };
    }).sort((a,b) => {
        if (Number(a.loyaltyScore) !== Number(b.loyaltyScore)) {
            return Number(a.loyaltyScore) - Number(b.loyaltyScore);
        }
        return b.total - a.total;
    });
  }, [feedbacks, selectedBranchId]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-32 font-sans selection:bg-sky-500/30">
      <div className="mx-auto max-w-7xl px-4 pt-20 md:pt-8 lg:px-8">
        <AdminMobileNavbar />
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-sky-500" />
              Detaylı Performans Analizi
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              İşletmenizin sadakat metrikleri, operasyonel röntgeni ve trafik analizi.
            </p>
          </div>
          <div className="w-full lg:w-auto z-20">
            <DateRangePicker date={dateRange} setDate={setDateRange} preset={preset} setPreset={setPreset} />
          </div>
        </div>

        {/* 1. KPI KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard title="Toplam Bildirim" value={kpi.curr.total} previousValue={kpi.prev.total} icon={Activity} colorClass="text-sky-400" />
          <KpiCard title="Sadakat Skoru" value={kpi.curr.loyaltyScore} previousValue={kpi.prev.loyaltyScore} icon={Heart} colorClass="text-pink-400" suffix="/100" />
          <KpiCard title="Çözüm Başarısı" value={kpi.curr.resolvedRate} previousValue={kpi.prev.resolvedRate} suffix="%" icon={CheckCircle} colorClass="text-green-400" />
          <KpiCard title="Bekleyen Şikayet" value={kpi.curr.complaintCount} previousValue={kpi.prev.complaintCount} icon={AlertTriangle} colorClass="text-red-400" inverseTrend={true} />
        </div>

        {loading ? (
           <div className="py-32 flex flex-col items-center justify-center text-slate-500 gap-4">
             <div className="w-12 h-12 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin"></div>
             <p className="text-sm font-medium animate-pulse">Analizler hazırlanıyor...</p>
           </div>
        ) : (
          <div className="space-y-8">
            
            {/* 2. TREND & MARKA ALGISI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-sky-400"/> Bildirim Trendi</h3>
                        <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-800">
                            <button onClick={() => setTrendViewMode('total')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Genel</button>
                            <button onClick={() => setTrendViewMode('breakdown')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'breakdown' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Detaylı</button>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {trendViewMode === 'total' ? (
                                <AreaChart data={trendData}>
                                    <defs><linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="total" name="Bildirim" stroke={COLORS.primary} strokeWidth={3} fill="url(#colorTrend)" />
                                </AreaChart>
                            ) : (
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" iconSize={8} formatter={(value) => <span className="mr-4">{value}</span>} />
                                    <Bar dataKey="complaint" name="Şikayet" stackId="a" fill={COLORS.danger} radius={[0,0,0,0]} barSize={20} />
                                    <Bar dataKey="suggestion" name="Öneri" stackId="a" fill={COLORS.primary} radius={[0,0,0,0]} barSize={20} />
                                    <Bar dataKey="evaluation" name="Değerlendirme" stackId="a" fill={COLORS.warning} radius={[4,4,0,0]} barSize={20} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400"/> Marka vs Deneyim</h3>
                        <p className="text-slate-400 text-xs mt-1 mb-8">Sadakat Algısı (Genel) ve Hizmet Memnuniyeti (Anlık).</p>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-slate-300">Marka Algısı (Genel)</span><span className="text-white font-bold">{loyaltyComparison.general}%</span></div>
                                <div className="h-4 bg-slate-900 rounded-full border border-slate-700/50"><div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${loyaltyComparison.general}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-slate-300">Deneyim Puanı (Anlık)</span><span className="text-white font-bold">{loyaltyComparison.instant}%</span></div>
                                <div className="h-4 bg-slate-900 rounded-full border border-slate-700/50"><div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" style={{ width: `${loyaltyComparison.instant}%` }}></div></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-xs text-slate-400 text-center leading-relaxed">
                            {Number(loyaltyComparison.general) > Number(loyaltyComparison.instant) 
                                ? "Genel algı yüksek, ancak son etkileşimlerde düşüş sinyalleri var."
                                : "Son deneyim puanları, genel marka algısını yukarı taşıyor."}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. YENİ TRAFİK ANALİZİ KARTI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6 z-10 relative">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-purple-400" />
                            <div>
                                <h3 className="text-white font-bold text-lg">Trafik Kaynakları & Dönüşüm</h3>
                                <p className="text-slate-400 text-xs">Müşterileriniz nasıl geliyor ve ne kadar etkileşimde bulunuyor?</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8 flex-1">
                        <div className="relative w-48 h-48 flex-shrink-0">
                           {trafficStats.visits > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    {sourceData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                </PieChart>
                             </ResponsiveContainer>
                           ) : (
                             <div className="w-full h-full rounded-full border-4 border-slate-800 border-dashed flex items-center justify-center text-xs text-slate-600">Veri Yok</div>
                           )}
                           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-2xl font-bold text-white">{formatNumber(trafficStats.visits)}</span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ziyaret</span>
                           </div>
                        </div>

                        <div className="flex-1 w-full space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center text-center">
                                    <QrCode className="w-5 h-5 text-green-500 mb-1" />
                                    <span className="text-xl font-bold text-white">{trafficStats.qrCount}</span>
                                    <span className="text-xs text-slate-500">QR Kod</span>
                                </div>
                                <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center text-center">
                                    <LinkIcon className="w-5 h-5 text-sky-500 mb-1" />
                                    <span className="text-xl font-bold text-white">{trafficStats.webCount}</span>
                                    <span className="text-xs text-slate-500">Web / Link</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                   <span className="text-sm font-medium text-slate-200">Dönüşüm Başarısı</span>
                                   <span className="text-xl font-bold text-purple-400">%{trafficStats.conversionRate > 100 ? 100 : trafficStats.conversionRate}</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
                                   <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(trafficStats.conversionRate, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-400">
                                   Sayfayı ziyaret eden her <span className="text-white font-bold">100</span> kişiden yaklaşık <span className="text-white font-bold">{Math.round(Math.min(trafficStats.conversionRate, 100))}</span>'i geri bildirim gönderdi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6"><Star className="w-5 h-5 text-yellow-400" /><div><h3 className="text-white font-bold text-lg">Duygu Analizi</h3><p className="text-slate-400 text-xs">Müşteri geri bildirim tonu.</p></div></div>
                    <div className="space-y-6">
                        {sentimentData.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-slate-300">{item.label}</span><div className="text-right leading-none"><span className="text-lg font-bold text-white">{item.percent}%</span><span className="text-xs text-slate-500 ml-1">({item.count})</span></div></div>
                                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. ŞUBE PERFORMANS (KARŞILAŞTIRMA) */}
            {selectedBranchId === 'all' && branchLeaderboard && (
                <div className="bg-[#1e293b]/40 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6"><LayoutList className="w-5 h-5 text-green-400" /><div><h3 className="text-white font-bold text-lg">Şube Performans Karşılaştırması</h3><p className="text-slate-400 text-xs">Operasyonel karşılaştırma tablosu.</p></div></div>
                    <div className="">
                        <table className="w-full text-left text-sm text-slate-400 border-collapse">
                            <thead className="bg-[#0f172a] text-xs uppercase font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 rounded-l-lg border-r border-slate-800/50">Durum</th>
                                    <th className="px-6 py-4 border-r border-slate-800/50">Şube Adı</th>
                                    <th className="px-6 py-4 text-center border-r border-slate-800/50">
                                        <div className="flex items-center justify-center gap-1">
                                            Sadakat Skoru 
                                            <InfoTooltip text="Yıldız ve genel değerlendirme puanlarının 100 üzerinden ağırlıklı ortalaması." />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center w-56 border-r border-slate-800/50">Pozitif / Nötr / Negatif</th>
                                    <th className="px-6 py-4 text-center border-r border-slate-800/50">Çözüm Oranı</th>
                                    <th className="px-6 py-4 text-right rounded-r-lg">
                                        <div className="flex items-center justify-end gap-1">
                                            Toplam Bildirim
                                            <InfoTooltip text="Seçili tarih aralığında bu şubeye gelen toplam geri bildirim sayısı." />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {branchLeaderboard.map((branch, i) => {
                                    const status = getBranchStatus(branch.loyaltyScore, branch.riskyRate, branch.resolveRate, branch.total);
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={i} className="hover:bg-slate-800/60 transition-colors group">
                                            <td className="px-6 py-4 border-r border-slate-800/50">
                                                <div 
                                                    className={`group/tooltip relative flex items-center gap-2 px-2.5 py-1.5 rounded-full w-fit ${status.bg} border border-white/5 transition-transform hover:scale-105 cursor-help`}
                                                >
                                                    <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                                    <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                                                    
                                                    {/* CUSTOM CSS TOOLTIP (EN ÜSTTE) */}
                                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-48 p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[9999] pointer-events-none">
                                                        <p className="text-[11px] text-white font-medium leading-snug">{status.reason}</p>
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-slate-700"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white group-hover:text-sky-400 transition-colors border-r border-slate-800/50">{branch.name}</td>
                                            <td className="px-6 py-4 text-center border-r border-slate-800/50">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-xl font-extrabold ${Number(branch.loyaltyScore) < 50 ? 'text-red-400' : Number(branch.loyaltyScore) < 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {branch.loyaltyScore}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {Number(branch.loyaltyScore) < 50 ? 'Geliştirilmeli' : Number(branch.loyaltyScore) < 70 ? 'Orta' : 'İyi'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center border-r border-slate-800/50">
                                                {/* 3'LÜ BAR (YEŞİL / SARI / KIRMIZI) - Gri alan yok */}
                                                <div className="flex h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="bg-green-500 h-full" style={{ width: `${branch.happyRate}%` }}></div>
                                                    <div className="bg-yellow-500 h-full" style={{ width: `${branch.neutralRate}%` }}></div>
                                                    <div className="bg-red-500 h-full" style={{ width: `${branch.riskyRate}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[10px] mt-1 text-slate-500 font-medium px-1">
                                                    <span className="text-green-400">%{branch.happyRate}</span>
                                                    <span className="text-red-400">%{branch.riskyRate}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center border-r border-slate-800/50"><span className="text-white font-bold">%{branch.resolveRate}</span></td>
                                            <td className="px-6 py-4 text-right"><span className="text-white font-mono font-bold text-lg">{branch.total}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {branchLeaderboard.length === 0 && <div className="text-center py-10 text-slate-500">Şube verisi bulunamadı.</div>}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedAnalytics;