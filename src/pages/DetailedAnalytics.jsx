import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfDay, endOfDay, parseISO, differenceInDays, sub } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, CheckCircle, AlertTriangle, Activity, QrCode,
  Minus, ArrowUpRight, ArrowDownRight, BarChart3, Heart, Zap,
  Filter, Link as LinkIcon, Info, Trophy, MapPin, X, Sparkles, Target, MessageSquare, Scale,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import DateRangePicker from '@/components/DateRangePicker';
import { formatCompactNumber } from "@/lib/utils";

// --- RENK PALETİ ---
const COLORS = {
  primary: '#0ea5e9',   // Sky Blue
  success: '#22c55e',   // Green
  warning: '#eab308',   // Yellow
  danger: '#ef4444',    // Red
  purple: '#8b5cf6',    // Violet
  google: '#EA4335',    // Google Red
  slate: '#64748b'
};

const formatNumber = (num) => new Intl.NumberFormat('tr-TR').format(num);

// --- YARDIMCI FONKSİYONLAR ---
// --- YARDIMCI FONKSİYONLAR ---

// Rating (1-5) to Score (0-100) converter
const calculateScore = (rating) => {
  if (!rating || rating < 1 || rating > 5) return 0;
  return (rating / 5) * 100;
};

const getWeightedScore = (rating, general) => {
  const rScore = rating ? calculateScore(rating) : null;
  const gScore = general ? calculateScore(general) : null;
  if (rScore !== null && gScore !== null) return (rScore * 0.40) + (gScore * 0.60);
  if (gScore !== null) return gScore;
  if (rScore !== null) return rScore;
  return 0;
};

// 🧠 GELİŞMİŞ AKILLI TEŞHİS MOTORU – İş Danışmanı Mantığı
const getSmartInsight = (branch) => {
  const score = Number(branch.vocalizeScore) || 0;
  const ops = Number(branch.operationScore) || 0;
  const google = Number(branch.googleClicks) || 0;
  const volume = Number(branch.total) || 0;
  const brandPerception = Number(branch.brandPerception) || 0;
  const instantExperience = Number(branch.instantExperience) || 0;
  const complaints = Number(branch.complaints) || 0;
  const gap = brandPerception - instantExperience;

  // Şikayet oranı: complaints / total
  const complaintRatio = volume > 0 ? complaints / volume : 0;
  const complaintPercent = (complaintRatio * 100).toFixed(1);

  // Case 1: Low Data (volume < 5)
  if (volume < 5) {
    return {
      title: "⏳ Veri Toplanıyor...",
      desc: "Analiz motorunun devreye girmesi için minimum veri eşiği (5 işlem) henüz sağlanmadı. Şu anki verilerle stratejik karar almak yanıltıcı olabilir.",
      suggestion: "Masalarda QR yönlendirmesini artırarak veri akışını hızlandırmayı hedefleyebilirsiniz.",
      color: "text-slate-400 border-slate-700 bg-slate-800/50",
      icon: Activity
    };
  }

  // Case 2: Digital Engine (google > 10 & score > 80)
  if (google > 10 && score > 80) {
    return {
      title: "🚀 Dijital Büyüme Motoru",
      desc: "Harika performans! Müşterileriniz sadece mutlu ayrılmıyor, aynı zamanda bu mutluluğu dijitale taşıyor (" + google + " Google tıklaması).",
      suggestion: "Bu şubedeki 'mutlu müşteriyi yönlendirme' stratejisini diğer şubelere de uygulamayı değerlendirebilirsiniz.",
      color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      icon: MapPin
    };
  }

  // Case 3: Silent Satisfaction (score > 85 & volume < 15)
  if (score > 85 && volume < 15) {
    return {
      title: "💎 Sessiz Memnuniyet (Gizli Potansiyel)",
      desc: "Analiz: Müşterileriniz hizmetten çok memnun (Puan: " + score + ") ancak sisteme katılım düşük. Yani içerideki kalite, dijital vitrine yeterince yansımıyor.",
      suggestion: "Garsonlarınızı, memnun kalan müşterilere QR hatırlatması yapmaları konusunda teşvik edebilirsiniz.",
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      icon: Sparkles
    };
  }

  // Case 3.5: Strong Performance (Good Score, Consistent Volume)
  if (score >= 80 && volume >= 15) {
    return {
      title: "🌟 Verimli Performans",
      desc: "Şube gayet başarılı bir çizgide ilerliyor (Puan: " + score + "). Müşteri memnuniyeti yüksek ve veri akışı sağlıklı.",
      suggestion: "Bu başarıyı sürdürülebilir kılmak için Google yorumlarına (Haritalara Geçiş) odaklanabilirsiniz.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: CheckCircle
    };
  }

  // Case 4: Critical Operational Alarm (complaintRatio > 10% & ops < 60)
  if (complaintRatio > 0.1 && ops < 60) {
    return {
      title: "🚨 Kritik Operasyonel Alarm",
      desc: "Dikkat: Müşterilerin %" + complaintPercent + "'u şikayet iletti ve bunların sadece %" + ops.toFixed(0) + "'si çözüme kavuşturuldu. Bu durum müşteri kaybı riski yaratabilir.",
      suggestion: "Operasyonel sorunları yerinde incelemeniz ve şikayet takibini panele yansıtmanız faydalı olacaktır.",
      color: "text-red-400 border-red-500/30 bg-red-500/10",
      icon: AlertTriangle
    };
  }

  // Case 5: Brand Risk (gap > 15)
  if (gap > 15) {
    return {
      title: "⚠️ Beklenti - Deneyim Uyuşmazlığı",
      desc: "Kritik Tespit: Müşteriler markanızı seviyor (Genel Algı Yüksek) ancak bu şubedeki son deneyimleri beklentinin altında kalmış. Marka kredinizi tüketiyor olabilirsiniz.",
      suggestion: "Ürün standartlarını ve personel ilgisini denetlemeniz önerilir.",
      color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      icon: Zap
    };
  }

  // Case 6: Role Model (score > 85 & ops > 90)
  if (score > 85 && ops > 90) {
    return {
      title: "🏆 Rol Model Performans",
      desc: "Kusursuz! Hem müşteri memnuniyeti zirvede hem de panel kullanımı çok disiplinli. Bu şube, hem operasyonel hem de dijital açıdan örnek teşkil ediyor.",
      suggestion: "Şube yöneticisini ve ekibini tebrik edebilir, bu başarıyı motivasyonu artırmak için ekiple paylaşabilirsiniz.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: Trophy
    };
  }

  // Case 3.5: Strong Performance (Good Score, Consistent Volume)
  if (score >= 80 && volume >= 15) {
    return {
      title: "🌟 Verimli Performans",
      desc: "Şube gayet başarılı bir çizgide ilerliyor (Puan: " + score + "). Müşteri memnuniyeti yüksek ve veri akışı sağlıklı.",
      suggestion: "Bu başarıyı sürdürülebilir kılmak için Google yorumlarına (Haritalara Geçiş) odaklanabilirsiniz.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: CheckCircle
    };
  }

  // Default Case: Stabil Performans
  return {
    title: "📊 Stabil Performans",
    desc: "Veriler dengeli seyrediyor.",
    suggestion: "Performansı bir üst seviyeye taşımak için önce 'Çözüm Oranı'na (Operasyonel Disiplin), ardından QR kullanımını teşvik etmeye (Veri Hacmi) odaklanabilirsiniz.",
    color: "text-slate-300 border-slate-700 bg-slate-800/50",
    icon: Target
  };
};

// --- BİLEŞENLER ---

const InfoTooltip = ({ text }) => {
  const { toast } = useToast();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toast({ title: "Bilgi", description: text, duration: 4000 }); }}
      className="inline-flex items-center ml-1.5 cursor-help group opacity-70 hover:opacity-100 transition-opacity" type="button"
    >
      <Info className="w-3.5 h-3.5 text-sky-400" />
    </button>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalValue = payload.find(p => p.dataKey === 'total')?.value ||
      payload.reduce((acc, curr) => acc + (typeof curr.value === 'number' ? curr.value : 0), 0);
    return (
      <div className="bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50 min-w-[160px]">
        <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">{label}</p>
        <div className="flex justify-between mb-2">
          <span className="text-slate-400">Toplam</span>
          <span className="text-white font-bold">{totalValue}</span>
        </div>
        <div className="space-y-1">
          {payload.slice().reverse().map((p, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></div>
                <span className="text-slate-300 capitalize">{p.name === 'complaint' ? 'Şikayet' : p.name === 'suggestion' ? 'Öneri' : p.name === 'evaluation' ? 'Değerlendirme' : p.name}</span>
              </div>
              <span className="text-white font-mono font-bold">{formatNumber(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value, previousValue, icon: Icon, colorClass, suffix = "", inverseTrend = false }) => {
  let percentChange = 0;
  let trendDirection = "neutral";
  let isExtreme = false;

  if (previousValue > 0) {
    percentChange = ((value - previousValue) / previousValue) * 100;

    // 🟢 ENTERPRISE: 10000% gibi absürt değerleri engelle
    if (Math.abs(percentChange) > 999) {
      isExtreme = true;
      percentChange = percentChange > 0 ? 999 : -999;
    }

    trendDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
  } else if (value > 0) {
    trendDirection = 'up';
    percentChange = 100;
  }

  const isGood = inverseTrend ? trendDirection === 'down' : trendDirection === 'up';
  const trendColor = trendDirection === 'neutral' ? "text-slate-400 bg-slate-800" : (isGood ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10");

  // 🟢 ENTERPRISE: 10.000'e kadar tam sayı, sonrası için kompakt format (K)
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

  const { display: formattedValue, full: fullValue } = formatCompactNumber(numericValue);

  // Suffix varsa (örn: TL) sona ekle
  const displayValue = `${formattedValue}${suffix}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3
            className="text-2xl font-bold text-white mt-1"
            title={numericValue >= 10000 ? `Tam değer: ${formatNumber(numericValue)}` : undefined}
          >
            {displayValue}
          </h3>
        </div>
        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${colorClass}`}><Icon className="h-5 w-5" /></div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${trendColor}`}>
          {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
          {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
          {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
          <span>{isExtreme ? '>' : ''}{Math.abs(percentChange).toFixed(0)}%</span>
        </div>
        <span className="text-[10px] text-slate-500">geçen döneme göre</span>
      </div>
    </div>
  );
};

// 🟢 ŞUBE DETAY MODALI
const BranchDetailModal = ({ isOpen, onClose, branch }) => {
  if (!isOpen || !branch) return null;

  const insight = getSmartInsight(branch);
  const InsightIcon = insight.icon;

  const perception = Number(branch.brandPerception);
  const experience = Number(branch.instantExperience);
  const perceptionGap = perception - experience;

  // Çakışma Kontrolü
  const isOverlap = Math.abs(perceptionGap) < 5;

  let gapStatus = { text: "Mükemmel Uyum", color: "text-green-400", barColor: "bg-green-500" };
  if (perceptionGap > 20) gapStatus = { text: "Beklenti Karşılanmıyor", color: "text-red-400", barColor: "bg-red-500" };
  else if (perceptionGap > 10) gapStatus = { text: "Beklenti Altında", color: "text-orange-400", barColor: "bg-orange-500" };
  else if (perceptionGap < -5) gapStatus = { text: "Beklenti Üzeri", color: "text-emerald-400", barColor: "bg-emerald-400" };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        <div className="bg-slate-900/80 backdrop-blur p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{branch.name}</h2>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                <span>Lig Puanı:</span>
                <span className={Number(branch.vocalizeScore) >= 80 ? 'text-amber-400' : 'text-white'}>{branch.vocalizeScore}</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Şube Performans Karnesi
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">

          {/* AKILLI TEŞHİS */}
          <div className={`p-5 rounded-xl border ${insight.color} relative overflow-hidden shadow-lg`}>
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-2.5 rounded-lg bg-white/10 shrink-0 border border-white/10">
                <InsightIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1.5">Vocalize Analizi: {insight.title}</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium mb-2">{insight.desc}</p>
                {insight.suggestion && (
                  <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                    <span className="font-bold">Öneri: </span>
                    {insight.suggestion}
                  </p>
                )}
              </div>
            </div>
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-current opacity-10 blur-3xl rounded-full"></div>
          </div>

          {/* MARKA VS DENEYİM (LAZER EFEKTLİ BAR) */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" /> Beklenti & Deneyim Dengesi
              </h3>
              <span className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 ${gapStatus.color}`}>
                {gapStatus.text}
              </span>
            </div>

            <div className="relative h-16 mx-4">
              {/* Arka Ray */}
              <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-800 -translate-y-1/2 rounded-full"></div>

              {/* 🟡 SARI İZ (BEKLENTİ İZİ) */}
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-l-full bg-gradient-to-r from-transparent to-yellow-500/30" style={{ left: '0%', width: `${perception}%` }}></div>

              {/* 🔵 MAVİ İZ (DENEYİM İZİ) */}
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-l-full bg-gradient-to-r from-transparent to-sky-500/30" style={{ left: '0%', width: `${experience}%` }}></div>

              {isOverlap ? (
                <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20" style={{ left: `${perception}%`, transform: 'translate(-50%, -50%)' }}>
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center border-2 border-slate-900 z-10">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30"></div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 whitespace-nowrap">Tam Uyum ({perception})</span>
                </div>
              ) : (
                <>
                  {/* 🔴 LAZER DOLGU HATTI (İKİ NOKTA ARASI) */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full ${gapStatus.barColor} opacity-60 shadow-[0_0_12px_currentColor] transition-all duration-700`}
                    style={{ left: `${Math.min(perception, experience)}%`, width: `${Math.abs(perceptionGap)}%` }}
                  ></div>

                  {/* Beklenti Noktası */}
                  <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10" style={{ left: `${perception}%`, transform: 'translate(-50%, -50%)' }}>
                    <span className="absolute -top-8 text-[9px] text-slate-500 font-bold uppercase tracking-tighter bg-slate-900 px-1 py-0.5 rounded border border-slate-800 whitespace-nowrap">Beklenti</span>
                    <div className="w-4 h-4 rounded-full bg-slate-800 border-4 border-yellow-500 shadow-lg"></div>
                    <span className="absolute -bottom-6 text-[10px] font-bold text-yellow-500">{perception}</span>
                  </div>

                  {/* Deneyim Noktası */}
                  <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20" style={{ left: `${experience}%`, transform: 'translate(-50%, -50%)' }}>
                    <span className="absolute -top-8 text-[9px] text-sky-400 font-bold uppercase tracking-tighter bg-slate-900 px-1 py-0.5 rounded border border-slate-800 whitespace-nowrap">Gerçekleşen</span>
                    <div className="relative">
                      <div className="w-5 h-5 rounded-full bg-sky-500 border-2 border-white shadow-lg z-10"></div>
                      <div className="absolute inset-0 bg-sky-400 rounded-full animate-pulse opacity-50 blur-sm"></div>
                    </div>
                    <span className="absolute -bottom-6 text-[10px] font-bold text-white">{experience}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 text-center px-4">
              <p className="text-[11px] text-slate-500 italic">
                {isOverlap
                  ? "✨ Müşterinin beklediği kalite ile aldığı hizmet birebir örtüşüyor."
                  : "Aradaki renkli alan (lazer), beklenti ile gerçeklik arasındaki farkı temsil eder."}
              </p>
            </div>
          </div>

          {/* DİĞER VERİLER (GRID) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl font-bold text-green-400">%{branch.happyRate}</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Mutlu</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl font-bold text-yellow-400">%{branch.neutralRate}</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Nötr</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl font-bold text-red-400">%{branch.riskyRate}</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Mutsuz</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-medium">Haritalara Geçiş</span>
                <span className="text-white font-bold text-xl">{branch.googleClicks} <span className="text-sm font-normal text-slate-500">Kişi</span></span>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg text-red-400"><MapPin className="w-5 h-5" /></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-medium">Çözüm Hızı</span>
                <span className="text-white font-bold text-xl">%{branch.operationScore}</span>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg text-green-400"><CheckCircle className="w-5 h-5" /></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const DetailedAnalytics = () => {
  const { businessId, selectedBranchId, businessCreatedAt } = useAdminContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [prevFeedbacks, setPrevFeedbacks] = useState([]);
  const [serverFeedbackCount, setServerFeedbackCount] = useState(null);
  const [serverPrevFeedbackCount, setServerPrevFeedbackCount] = useState(null);
  const [trafficStats, setTrafficStats] = useState({ visits: 0, conversionRate: 0, qrCount: 0, webCount: 0, googleRedirects: 0 });
  const [trendViewMode, setTrendViewMode] = useState('total');

  const [selectedModalBranch, setSelectedModalBranch] = useState(null);

  // 🟢 ŞUBE LİGİ SAYFALAMA & ARAMA (Enterprise 300+ şube desteği)
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const leaderboardItemsPerPage = 20;

  const [dateRange, setDateRange] = useState({ from: new Date(2020, 0, 1), to: new Date() });
  const [preset, setPreset] = useState('allTime');

  useEffect(() => {
    if (businessCreatedAt && preset === 'allTime') {
      setDateRange({ from: new Date(businessCreatedAt), to: new Date() });
    }
  }, [businessCreatedAt, preset]);

  // VERİ ÇEKME & REALTIME GÜNCELLEME
  const fetchData = useCallback(async () => {
    if (!businessId || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const dayDiff = differenceInDays(dateRange.to, dateRange.from) + 1;
      const prevFrom = sub(dateRange.from, { days: dayDiff });
      const prevTo = sub(dateRange.to, { days: dayDiff });

      // 🟢 SERVER-SIDE COUNT: PostgREST 1000 sınırı atlatıcı
      let countCurrQuery = supabase.from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());
      if (selectedBranchId !== 'all') countCurrQuery = countCurrQuery.eq('branch_id', selectedBranchId);

      let countPrevQuery = supabase.from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(prevFrom).toISOString())
        .lte('created_at', endOfDay(prevTo).toISOString());
      if (selectedBranchId !== 'all') countPrevQuery = countPrevQuery.eq('branch_id', selectedBranchId);

      let queryCurr = supabase.from('feedbacks')
        .select('id, created_at, rating, general_eval_rating, feedback_type, status, branch_id, redirected_to_google, branches(branch_name_tr)')
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .limit(100000);

      if (selectedBranchId !== 'all') queryCurr = queryCurr.eq('branch_id', selectedBranchId);

      let queryPrev = supabase.from('feedbacks')
        .select('id, rating, general_eval_rating, status, feedback_type')
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(prevFrom).toISOString())
        .lte('created_at', endOfDay(prevTo).toISOString())
        .limit(100000);

      if (selectedBranchId !== 'all') queryPrev = queryPrev.eq('branch_id', selectedBranchId);

      let qrTrafficQuery = supabase.from('qr_scans')
        .select('id, branch_id', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .limit(100000);

      let webTrafficQuery = supabase.from('page_views')
        .select('id, branch_id', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('source', 'web')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .limit(100000);

      const [resCurr, resPrev, resQrTraffic, resWebTraffic, resCountCurr, resCountPrev] = await Promise.all([
        queryCurr, queryPrev, qrTrafficQuery, webTrafficQuery, countCurrQuery, countPrevQuery
      ]);

      if (resCurr.error) throw resCurr.error;

      // 🟢 Server-side count (1000 limitine takılmaz)
      setServerFeedbackCount(resCountCurr.count || 0);
      setServerPrevFeedbackCount(resCountPrev.count || 0);

      const currData = resCurr.data || [];
      setFeedbacks(currData);
      setPrevFeedbacks(resPrev.data || []);

      const qrCount = resQrTraffic.count || 0;
      const webCount = resWebTraffic.count || 0;
      const googleRedirects = currData.filter(f => f.redirected_to_google).length;

      const totalVisits = qrCount + webCount;
      const actionCount = currData.length;

      setTrafficStats({
        visits: totalVisits, qrCount, webCount, googleRedirects,
        conversionRate: totalVisits > 0 ? ((actionCount / totalVisits) * 100).toFixed(1) : 0
      });

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Verileriniz yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin veya birkaç dakika sonra tekrar deneyin." });
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedBranchId, dateRange, toast]);

  // 🟢 REALTIME (Anlık Güncelleme - DEBOUNCED)
  const analyticsDebounceRef = useRef(null);
  useEffect(() => {
    fetchData();
    if (!businessId) return;

    const channel = supabase.channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` }, () => {
        if (analyticsDebounceRef.current) clearTimeout(analyticsDebounceRef.current);
        analyticsDebounceRef.current = setTimeout(() => fetchData(), 1500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_scans', filter: `business_id=eq.${businessId}` }, () => {
        if (analyticsDebounceRef.current) clearTimeout(analyticsDebounceRef.current);
        analyticsDebounceRef.current = setTimeout(() => fetchData(), 1500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (analyticsDebounceRef.current) clearTimeout(analyticsDebounceRef.current);
    };
  }, [businessId, fetchData]);

  // KPI
  const kpi = useMemo(() => {
    const calc = (data, serverCount = null) => {
      // 🟢 SERVER COUNT kullan (PostgREST 1000 sınırına takılmaz)
      const total = serverCount !== null ? serverCount : data.length;
      if (total === 0) return { total: 0, loyaltyScore: 0, resolvedRate: 0, complaintCount: 0 };
      let totalScore = 0, scoreCount = 0;
      data.forEach(f => {
        const s = getWeightedScore(f.rating, f.general_eval_rating);
        if (s > 0 || f.rating || f.general_eval_rating) { totalScore += s; scoreCount++; }
      });
      const loyaltyScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(0) : 0;
      const resolvedCount = data.filter(f => f.status === 'resolved').length;
      const resolvedRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(0) : 0;
      const complaintCount = data.filter(f => f.feedback_type === 'complaint' && f.status !== 'resolved').length;
      return { total, loyaltyScore, resolvedRate, complaintCount };
    };
    return { curr: calc(feedbacks, serverFeedbackCount), prev: calc(prevFeedbacks, serverPrevFeedbackCount) };
  }, [feedbacks, prevFeedbacks, serverFeedbackCount, serverPrevFeedbackCount]);

  // CHART DATA
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

  const loyaltyComparison = useMemo(() => {
    let iSum = 0, iCount = 0, gSum = 0, gCount = 0;
    feedbacks.forEach(f => {
      if (f.rating) { iSum += f.rating; iCount++; }
      if (f.general_eval_rating) { gSum += f.general_eval_rating; gCount++; }
    });
    const instant = iCount ? ((iSum / iCount) / 5 * 100).toFixed(0) : 0;
    const general = gCount ? ((gSum / gCount) / 5 * 100).toFixed(0) : 0;
    return { instant, general };
  }, [feedbacks]);

  const sentimentData = useMemo(() => {
    const valid = feedbacks.filter(f => f.general_eval_rating || f.rating);
    const total = valid.length || 1;
    const getScore = (f) => f.general_eval_rating || f.rating;
    const positive = valid.filter(f => getScore(f) >= 4).length;
    const neutral = valid.filter(f => getScore(f) === 3).length;
    const negative = valid.filter(f => getScore(f) <= 2).length;
    return [
      { label: 'Pozitif', count: positive, percent: ((positive / total) * 100).toFixed(1), color: COLORS.success },
      { label: 'Nötr', count: neutral, percent: ((neutral / total) * 100).toFixed(1), color: COLORS.warning },
      { label: 'Negatif', count: negative, percent: ((negative / total) * 100).toFixed(1), color: COLORS.danger }
    ];
  }, [feedbacks]);

  const sourceData = useMemo(() => [
    { name: 'QR Kod', value: trafficStats.qrCount, color: COLORS.success },
    { name: 'Web/Link', value: trafficStats.webCount, color: COLORS.primary }
  ].filter(i => i.value > 0), [trafficStats]);

  // LİDERLİK TABLOSU
  const leaderboardData = useMemo(() => {
    if (selectedBranchId !== 'all') return null;
    const map = {};

    feedbacks.forEach(f => {
      const bName = f.branches?.branch_name_tr || 'Bilinmiyor';
      if (!map[bName]) map[bName] = {
        name: bName,
        total: 0,
        resolved: 0,
        complaints: 0,
        scoreSum: 0,
        scoreCount: 0,
        googleClicks: 0,
        happy: 0, neutral: 0, risky: 0,
        ratingSum: 0, ratingCount: 0,
        generalSum: 0, generalCount: 0
      };

      const item = map[bName];
      item.total += 1;
      if (f.redirected_to_google) item.googleClicks += 1;
      if (f.feedback_type === 'complaint') item.complaints += 1;
      if (f.status === 'resolved' && f.feedback_type === 'complaint') item.resolved += 1;

      const s = getWeightedScore(f.rating, f.general_eval_rating);
      if (s > 0 || f.rating || f.general_eval_rating) {
        item.scoreSum += s; item.scoreCount += 1;
        const rawScore = f.general_eval_rating || f.rating;
        if (rawScore >= 4) item.happy += 1;
        else if (rawScore === 3) item.neutral += 1;
        else item.risky += 1;

        if (f.rating) { item.ratingSum += (f.rating - 1) * 25; item.ratingCount += 1; }
        if (f.general_eval_rating) { item.generalSum += (f.general_eval_rating - 1) * 25; item.generalCount += 1; }
      }
    });

    const results = Object.values(map);
    const maxTotal = Math.max(...results.map(b => b.total), 1);

    return results.map(b => {
      const qualityScore = b.scoreCount ? (b.scoreSum / b.scoreCount) : 0;
      const operationScore = b.complaints > 0 ? (b.resolved / b.complaints) * 100 : 100;
      const trafficScore = (b.total / maxTotal) * 100;
      const vocalizeScore = (qualityScore * 0.4) + (operationScore * 0.3) + (trafficScore * 0.3);

      const base = b.scoreCount || 1;
      const happyRate = ((b.happy / base) * 100).toFixed(0);
      const neutralRate = ((b.neutral / base) * 100).toFixed(0);
      const riskyRate = ((b.risky / base) * 100).toFixed(0);

      const instantExperience = b.ratingCount > 0 ? (b.ratingSum / b.ratingCount).toFixed(0) : qualityScore.toFixed(0);
      const brandPerception = b.generalCount > 0 ? (b.generalSum / b.generalCount).toFixed(0) : qualityScore.toFixed(0);

      return {
        ...b,
        qualityScore: qualityScore.toFixed(0),
        operationScore: operationScore.toFixed(0),
        trafficScore: trafficScore.toFixed(0),
        vocalizeScore: vocalizeScore.toFixed(0),
        happyRate, neutralRate, riskyRate,
        instantExperience, brandPerception
      };
    }).sort((a, b) => b.vocalizeScore - a.vocalizeScore);
  }, [feedbacks, selectedBranchId]);

  // 🟢 FİLTRELENMİŞ LİDERLİK TABLOSU (Arama özelliği)
  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardData) return [];
    if (!leaderboardSearch.trim()) return leaderboardData;
    const query = leaderboardSearch.toLowerCase().trim();
    return leaderboardData.filter(b => b.name.toLowerCase().includes(query));
  }, [leaderboardData, leaderboardSearch]);

  // 🟢 SAYFALANMIŞ LİDERLİK TABLOSU (Enterprise performans)
  const paginatedLeaderboard = useMemo(() => {
    const startIndex = (leaderboardPage - 1) * leaderboardItemsPerPage;
    return filteredLeaderboard.slice(startIndex, startIndex + leaderboardItemsPerPage);
  }, [filteredLeaderboard, leaderboardPage, leaderboardItemsPerPage]);

  const leaderboardTotalPages = Math.ceil(filteredLeaderboard.length / leaderboardItemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setLeaderboardPage(1);
  }, [leaderboardSearch]);

  // Tek şube / tek satır durumunda akıllı analiz için özet nesne
  const singleBranchSummary = useMemo(() => {
    if (!feedbacks.length) return null;

    // Tüm şubeler görünümünde sadece 1 satır varsa, doğrudan o satırı kullan
    if (selectedBranchId === 'all') {
      if (!leaderboardData || leaderboardData.length !== 1) return null;
      return leaderboardData[0];
    }

    const base = {
      name: feedbacks[0].branches?.branch_name_tr || 'Seçili Şube',
      total: 0,
      complaints: 0,
      resolved: 0,
      googleClicks: 0,
      scoreSum: 0,
      scoreCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      generalSum: 0,
      generalCount: 0
    };

    const agg = feedbacks.reduce((acc, f) => {
      acc.total += 1;
      if (f.redirected_to_google) acc.googleClicks += 1;
      if (f.feedback_type === 'complaint') acc.complaints += 1;
      if (f.status === 'resolved' && f.feedback_type === 'complaint') acc.resolved += 1;

      const s = getWeightedScore(f.rating, f.general_eval_rating);
      if (s > 0 || f.rating || f.general_eval_rating) {
        acc.scoreSum += s;
        acc.scoreCount += 1;

        if (f.rating) {
          acc.ratingSum += (f.rating - 1) * 25;
          acc.ratingCount += 1;
        }
        if (f.general_eval_rating) {
          acc.generalSum += (f.general_eval_rating - 1) * 25;
          acc.generalCount += 1;
        }
      }
      return acc;
    }, base);

    const qualityScore = agg.scoreCount ? (agg.scoreSum / agg.scoreCount) : 0;
    const operationScore = agg.complaints > 0 ? (agg.resolved / agg.complaints) * 100 : 100;
    const trafficScore = 100; // tek şube görünümünde referans olarak %100
    const vocalizeScore = (qualityScore * 0.4) + (operationScore * 0.3) + (trafficScore * 0.3);

    const instantExperience = agg.ratingCount > 0 ? (agg.ratingSum / agg.ratingCount).toFixed(0) : qualityScore.toFixed(0);
    const brandPerception = agg.generalCount > 0 ? (agg.generalSum / agg.generalCount).toFixed(0) : qualityScore.toFixed(0);

    return {
      ...agg,
      qualityScore: qualityScore.toFixed(0),
      operationScore: operationScore.toFixed(0),
      trafficScore: trafficScore.toFixed(0),
      vocalizeScore: vocalizeScore.toFixed(0),
      instantExperience,
      brandPerception
    };
  }, [feedbacks, selectedBranchId, leaderboardData]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-32 pt-24 lg:pt-0 font-sans selection:bg-sky-500/30">
      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-sky-500" />
              Performans Analizi
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              İşletmenizin sadakat metrikleri, operasyonel hızı ve Google performansı.
            </p>
          </div>
          <div className="w-full lg:w-auto z-20">
            <DateRangePicker date={dateRange} setDate={setDateRange} preset={preset} setPreset={setPreset} />
          </div>
        </div>

        {/* KPI KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard title="Toplam Bildirim" value={kpi.curr.total} previousValue={kpi.prev.total} icon={Activity} colorClass="text-sky-400" />
          <KpiCard title="Sadakat Skoru" value={kpi.curr.loyaltyScore} previousValue={kpi.prev.loyaltyScore} icon={Heart} colorClass="text-pink-400" suffix="/100" />
          <KpiCard title="Çözüm Başarısı" value={kpi.curr.resolvedRate} previousValue={kpi.prev.resolvedRate} suffix="%" icon={CheckCircle} colorClass="text-green-400" />
          <KpiCard title="Bekleyen Şikayet" value={kpi.curr.complaintCount} previousValue={kpi.prev.complaintCount} icon={AlertTriangle} colorClass="text-red-400" inverseTrend={true} />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-slate-500 gap-4"><div className="w-12 h-12 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin"></div><p className="text-sm font-medium animate-pulse">Analizler hazırlanıyor...</p></div>
        ) : (
          <div className="space-y-8">

            {/* GRAFİKLER BÖLÜMÜ */}
            <div className="space-y-8">

              {/* 1. Trend & Marka Algısı */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol: Trend Grafiği */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-sky-400" />
                      Bildirim Trendi
                    </h3>
                    <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-800 shrink-0">
                      <button onClick={() => setTrendViewMode('total')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Genel</button>
                      <button onClick={() => setTrendViewMode('breakdown')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'breakdown' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Detaylı</button>
                    </div>
                  </div>
                  <div className="h-72 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      {trendViewMode === 'total' ? (
                        <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs><linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} /><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="total" name="Bildirim" stroke={COLORS.primary} strokeWidth={3} fill="url(#colorTrend)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" iconSize={8} formatter={(value) => <span className="mr-4">{value}</span>} />
                          <Bar dataKey="complaint" name="Şikayet" stackId="a" fill={COLORS.danger} barSize={20} />
                          <Bar dataKey="suggestion" name="Öneri" stackId="a" fill={COLORS.primary} barSize={20} />
                          <Bar dataKey="evaluation" name="Değerlendirme" stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sağ: Marka vs Deneyim (RESTORE EDİLDİ) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Marka vs Deneyim
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 mb-8">
                      Müşterinin aklındaki "Marka" ile o an yaşadığı "Hizmet" arasındaki fark.
                    </p>

                    <div className="space-y-6">
                      {/* Genel Algı */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300">Genel Algı (Marka)</span>
                          <span className="text-white font-bold">{loyaltyComparison.general}%</span>
                        </div>
                        <div className="detail-analytics-bar-wrap h-4 bg-slate-900 rounded-full border border-slate-700/50">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${loyaltyComparison.general}%` }}></div>
                        </div>
                      </div>

                      {/* Anlık Deneyim */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300">Anlık Deneyim (Hizmet)</span>
                          <span className="text-white font-bold">{loyaltyComparison.instant}%</span>
                        </div>
                        <div className="detail-analytics-bar-wrap h-4 bg-slate-900 rounded-full border border-slate-700/50">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" style={{ width: `${loyaltyComparison.instant}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                      {Number(loyaltyComparison.general) > Number(loyaltyComparison.instant)
                        ? "⚠️ Dikkat: Marka beklentisi yüksek, ancak son hizmet deneyimleri bu beklentinin altında kalıyor."
                        : "✅ Harika: Sunduğunuz hizmet, müşterinin marka beklentisinin üzerine çıkıyor."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Trafik & Duygu */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* TRAFİK VE DÖNÜŞÜM KARTI (GRID TASARIM) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="text-white font-bold text-lg">Trafik & Dönüşüm Hunisi</h3>
                      <p className="text-slate-400 text-xs">Müşterilerin form doldurma ve Google'a geçiş yolculuğu.</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    {/* Pasta Grafik */}
                    <div className="relative w-52 h-52 shrink-0 flex items-center justify-center mx-auto md:mx-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart className="detail-analytics-pie">
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={1.5}
                          >
                            {sourceData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="rgba(0,0,0,0.06)"
                                strokeWidth={1}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              value,
                              name === 'QR Kod' ? 'QR Kod' : 'Web/Link'
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-bold text-white">{formatNumber(trafficStats.visits)}</span>
                        <span className="text-[9px] text-slate-500 uppercase">Ziyaret</span>
                      </div>
                    </div>

                    {/* Sağ Taraf: Grid Kartlar */}
                    <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                      {/* QR */}
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col items-center text-center justify-center">
                        <QrCode className="w-5 h-5 text-green-500 mb-1" />
                        <span className="text-lg font-bold text-white leading-none">{trafficStats.qrCount}</span>
                        <span className="text-[10px] text-slate-500 mt-1">QR Okutma</span>
                      </div>
                      {/* Link */}
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col items-center text-center justify-center">
                        <LinkIcon className="w-5 h-5 text-sky-500 mb-1" />
                        <span className="text-lg font-bold text-white leading-none">{trafficStats.webCount}</span>
                        <span className="text-[10px] text-slate-500 mt-1">Web Link</span>
                      </div>
                      {/* Form Dönüşüm */}
                      <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 flex flex-col items-center text-center justify-center group relative cursor-help">
                        <div className="absolute top-2 right-2"><InfoTooltip text="Sayfayı ziyaret eden her 100 kişiden kaçı formu tamamladı?" /></div>
                        <Activity className="w-5 h-5 text-purple-400 mb-1" />
                        <span className="text-lg font-bold text-white leading-none">%{trafficStats.conversionRate}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-purple-300">Form Dönüşüm</span>
                        </div>
                      </div>
                      {/* Google Geçiş (Vurgulu) */}
                      <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center text-center justify-center cursor-help relative">
                        <div className="absolute top-2 right-2"><InfoTooltip text="Formu doldurduktan sonra Google Maps yorum sayfasına yönlenen müşteri sayısı." /></div>
                        <MapPin className="w-5 h-5 text-red-400 mb-1" />
                        <span className="text-lg font-bold text-white leading-none">{trafficStats.googleRedirects}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-red-300">Haritalara Geçiş</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DUYGU ANALİZİ */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-yellow-400" /><div><h3 className="text-white font-bold text-lg">Genel Memnuniyet</h3><p className="text-slate-400 text-xs">Müşteri geri bildirim tonu dağılımı.</p></div></div>
                  <div className="space-y-6">
                    {sentimentData.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-slate-300">{item.label}</span><div className="text-right leading-none"><span className="text-lg font-bold text-white">{item.percent}%</span><span className="text-xs text-slate-500 ml-1">({item.count})</span></div></div>
                        <div className="detail-analytics-bar-wrap h-2.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 🏆 ŞUBE LİDERLİK TABLOSU (SAYFALAMALI & ARAMALI) */}
            {selectedBranchId === 'all' && leaderboardData && leaderboardData.length > 1 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-visible z-0 mb-8 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <div>
                      <h3 className="text-white font-bold text-lg">Şube Performans Ligi</h3>
                      <p className="text-slate-400 text-xs">Şubelerinizin detaylı karşılaştırması. ({leaderboardData.length} şube)</p>
                    </div>
                  </div>

                  {/* 🔍 ARAMA KUTUSU */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Şube ara..."
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
                    />
                  </div>
                </div>

                {/* AĞIRLIK LEJANTI */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/50 mb-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1"><Scale className="w-3 h-3" /> Hesaplama Ağırlığı:</span>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-110 transition-transform"></div>
                      <span className="text-[10px] text-slate-400 font-medium group-hover:text-white transition-colors">Kalite %40</span>
                      <InfoTooltip text="Müşterilerin verdiği yıldız ve puanların ortalaması." />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-110 transition-transform"></div>
                      <span className="text-[10px] text-slate-400 font-medium group-hover:text-white transition-colors">Operasyon %30</span>
                      <InfoTooltip text="Şikayetlerin çözüme kavuşturulma hızı ve oranı." />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-110 transition-transform"></div>
                      <span className="text-[10px] text-slate-400 font-medium group-hover:text-white transition-colors">Veri Payı %30</span>
                      <InfoTooltip text="Bu şubenin, toplam geri bildirim havuzundaki payı. (Diğer şubelere kıyasla ne kadar veri ürettiği)." />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4 relative z-0">
                  <table className="branch-league-table w-full min-w-[800px] text-left text-sm text-slate-400 border-collapse">
                    <thead className="bg-[#0f172a] text-xs uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        <th className="px-6 py-4 rounded-l-lg border-r border-slate-800/50">Sıra</th>
                        <th className="px-6 py-4 border-r border-slate-800/50">Şube Adı</th>
                        <th className="px-6 py-4 border-r border-slate-800/50 text-center">
                          <div className="flex items-center justify-center gap-1">Toplam <MessageSquare className="w-3 h-3 text-slate-500" /></div>
                        </th>
                        <th className="px-6 py-4 text-center border-r border-slate-800/50 bg-slate-900/50 text-sky-400 cursor-help">
                          <div className="flex items-center justify-center gap-1">🏆 Lig Puanı <InfoTooltip text="Kalite, Operasyon ve Veri Payı puanlarının ağırlıklı ortalaması." /></div>
                        </th>
                        <th className="px-6 py-4 text-center border-r border-slate-800/50 cursor-help">
                          <div className="flex items-center justify-center gap-1">⭐ Kalite <InfoTooltip text="Yıldız puan ortalaması." /></div>
                        </th>
                        <th className="px-6 py-4 text-center border-r border-slate-800/50 cursor-help">
                          <div className="flex items-center justify-center gap-1">⚡ Çözüm <InfoTooltip text="Şikayet çözüm oranı." /></div>
                        </th>
                        <th className="px-6 py-4 text-center rounded-r-lg cursor-help">
                          <div className="flex items-center justify-center gap-1">🗺️ Harita <InfoTooltip text="Mutlu ayrılıp Google'a gidenler." /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {paginatedLeaderboard.map((branch, i) => {
                        // Gerçek sıra numarasını hesapla (sayfalama ile)
                        const actualRank = filteredLeaderboard.indexOf(branch) + 1;
                        const isFirst = actualRank === 1 && !leaderboardSearch;
                        return (
                          <tr
                            key={branch.name}
                            onClick={() => setSelectedModalBranch(branch)}
                            className={`cursor-pointer transition-all duration-200 group ${isFirst ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-800/60'}`}
                          >
                            <td className="px-6 py-4 border-r border-slate-800/50 font-bold text-white relative">
                              {isFirst ? <span className="text-2xl drop-shadow-lg">🥇</span> : <span className="text-slate-500">#{actualRank}</span>}
                            </td>
                            <td className="px-6 py-4 font-medium text-white group-hover:text-sky-400 transition-colors border-r border-slate-800/50 flex items-center gap-2">
                              {branch.name}
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-sky-400 transition-opacity">İncele</span>
                            </td>
                            <td className="px-6 py-4 border-r border-slate-800/50 text-center font-mono text-slate-300">
                              {branch.total}
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50 bg-slate-900/30">
                              <span className={`text-xl font-extrabold px-3 py-1 rounded-lg border ${Number(branch.vocalizeScore) >= 80 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-white border-slate-700 bg-slate-800'}`}>
                                {branch.vocalizeScore}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50">
                              <span className="text-slate-300 font-bold">{branch.qualityScore}</span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50">
                              <span className={`font-bold ${Number(branch.operationScore) < 50 ? 'text-red-400' : 'text-green-400'}`}>%{branch.operationScore}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <MapPin className="w-4 h-4 text-indigo-400" />
                                <span className="text-white font-mono font-bold text-lg">{branch.googleClicks}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Boş sonuç mesajı */}
                  {filteredLeaderboard.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                      {leaderboardSearch ? `"${leaderboardSearch}" ile eşleşen şube bulunamadı.` : 'Karşılaştırılacak şube verisi bulunamadı.'}
                    </div>
                  )}
                </div>

                {/* 🟢 SAYFALAMA KONTROLLARI */}
                {leaderboardTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-500">
                      {filteredLeaderboard.length} şubeden {(leaderboardPage - 1) * leaderboardItemsPerPage + 1}-{Math.min(leaderboardPage * leaderboardItemsPerPage, filteredLeaderboard.length)} arası gösteriliyor
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                        disabled={leaderboardPage === 1}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-300 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
                        {leaderboardPage} / {leaderboardTotalPages}
                      </span>
                      <button
                        onClick={() => setLeaderboardPage(p => Math.min(leaderboardTotalPages, p + 1))}
                        disabled={leaderboardPage === leaderboardTotalPages}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {((selectedBranchId !== 'all') || (leaderboardData && leaderboardData.length <= 1)) && singleBranchSummary && (() => {
              const insight = getSmartInsight(singleBranchSummary);
              const InsightIcon = insight.icon;
              return (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8 shadow-lg">
                  <div className={`p-5 rounded-xl border ${insight.color} relative overflow-hidden`}>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="p-2.5 rounded-lg bg-white/10 shrink-0 border border-white/10">
                        <InsightIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1.5">
                          Seçili Şube Analizi: {singleBranchSummary.name}
                        </h3>
                        <p className="text-sm text-slate-200 font-semibold mb-1.5">
                          Vocalize Değerlendirmesi: {insight.title}
                        </p>
                        <p className="text-sm opacity-90 leading-relaxed text-slate-200 mb-2">
                          {insight.desc}
                        </p>
                        {insight.suggestion && (
                          <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                            <span className="font-bold">Öneri: </span>
                            {insight.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-current opacity-10 blur-3xl rounded-full" />
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* 🟢 ŞUBE DETAY MODALI (Akıllı Teşhis + Gap Analizi) */}
        <BranchDetailModal
          isOpen={!!selectedModalBranch}
          onClose={() => setSelectedModalBranch(null)}
          branch={selectedModalBranch}
        />
      </div>
    </div>
  );
};

export default DetailedAnalytics;