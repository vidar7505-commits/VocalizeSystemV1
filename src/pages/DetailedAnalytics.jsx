import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminContext } from '@/contexts/AdminContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfDay, endOfDay, parseISO, differenceInDays, sub } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, CheckCircle, AlertTriangle, Activity, QrCode,
  Minus, ArrowUpRight, ArrowDownRight, BarChart3, Heart, Zap,
  Filter, Link as LinkIcon, Info, Trophy, MapPin, X, Sparkles, Target, MessageSquare, Scale,
  Search, ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { cn, formatCustomerName, getCustomerData, formatCompactNumber, formatNumber, fetchDeep } from "@/lib/utils";
import DateRangePicker from '@/components/DateRangePicker';

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
const getSmartInsight = (branch, t) => {
  const score = Number(branch.vocalizeScore) || 0;
  const ops = Number(branch.operationScore) || 0;
  const google = Number(branch.googleClicks) || 0;
  const volume = Number(branch.total) || 0;
  const brandPerception = Number(branch.brandPerception) || 0;
  const instantExperience = Number(branch.instantExperience) || 0;
  const complaints = Number(branch.complaints) || 0;
  const gap = brandPerception - instantExperience;

  // 📈 SAATLİK ANALİZ (YENİ)
  const hourlyComplaints = branch.hourlyComplaints || Array(24).fill(0);
  const hourlySuggestions = branch.hourlySuggestions || Array(24).fill(0);

  // Peak Hour Detection
  let peakComplaintHour = -1;
  let maxHourlyComplaints = 0;
  hourlyComplaints.forEach((c, h) => {
    if (c > maxHourlyComplaints) {
      maxHourlyComplaints = c;
      peakComplaintHour = h;
    }
  });

  // Şikayet oranı: complaints / total
  const complaintRatio = volume > 0 ? complaints / volume : 0;
  const complaintPercent = (complaintRatio * 100).toFixed(1);

  // Case 1: Low Data (volume < 5)
  if (volume < 5) {
    return {
      title: t('analytics.smart_insight.collecting'),
      desc: t('analytics.smart_insight.collecting_desc'),
      suggestion: t('analytics.smart_insight.collecting_suggestion'),
      color: "text-slate-400 border-slate-700 bg-slate-800/50",
      icon: Activity
    };
  }

  // Case 4: Critical Operational Alarm (complaintRatio > 10% & ops < 60)
  if (complaintRatio > 0.1 && ops < 60) {
    return {
      title: t('analytics.smart_insight.critical_alarm'),
      desc: t('analytics.smart_insight.critical_alarm_desc', { ratio: complaintPercent, solved: ops.toFixed(0) }),
      suggestion: t('analytics.smart_insight.critical_alarm_suggestion'),
      color: "text-red-400 border-red-500/30 bg-red-500/10",
      icon: AlertTriangle
    };
  }

  // 🟢 YENİ: Saatlik Pik Şikayet Analizi (İstatistiksel)
  if (peakComplaintHour !== -1 && maxHourlyComplaints >= 3 && (maxHourlyComplaints / complaints) >= 0.3) {
    const hourLabel = `${String(peakComplaintHour).padStart(2, '0')}:00`;
    const peakRatio = ((maxHourlyComplaints / complaints) * 100).toFixed(0);

    // Sabah saatleri mi? (07:00 - 11:00)
    if (peakComplaintHour >= 7 && peakComplaintHour <= 11) {
      return {
        title: t('analytics.smart_insight.morning_rush_complaint'),
        desc: t('analytics.smart_insight.morning_rush_desc', { hour: hourLabel, ratio: peakRatio }),
        suggestion: t('analytics.smart_insight.morning_rush_suggestion'),
        color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
        icon: Zap
      };
    }

    return {
      title: t('analytics.smart_insight.peak_complaint', { hour: hourLabel }),
      desc: t('analytics.smart_insight.peak_complaint_desc', { hour: hourLabel, ratio: peakRatio }),
      suggestion: t('analytics.smart_insight.peak_complaint_suggestion'),
      color: "text-red-400 border-red-500/30 bg-red-500/10",
      icon: Activity
    };
  }

  // Case 2: Digital Engine (google > 10 & score > 80)
  if (google > 10 && score > 80) {
    return {
      title: t('analytics.smart_insight.digital_engine'),
      desc: t('analytics.smart_insight.digital_engine_desc', { count: google }),
      suggestion: t('analytics.smart_insight.digital_engine_suggestion'),
      color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      icon: MapPin
    };
  }

  // Case 6: Role Model (score > 85 & ops > 90)
  if (score > 85 && ops > 90) {
    return {
      title: t('analytics.smart_insight.role_model'),
      desc: t('analytics.smart_insight.role_model_desc'),
      suggestion: t('analytics.smart_insight.role_model_suggestion'),
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: Trophy
    };
  }

  // Case 5: Brand Risk (gap > 15)
  if (gap > 15) {
    return {
      title: t('analytics.smart_insight.brand_risk'),
      desc: t('analytics.smart_insight.brand_risk_desc'),
      suggestion: t('analytics.smart_insight.brand_risk_suggestion'),
      color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      icon: Zap
    };
  }

  // 🟢 YENİ: Saatlik Öneri Analizi
  let peakSuggestionHour = -1;
  let maxHourlySuggestions = 0;
  hourlySuggestions.forEach((s, h) => {
    if (s > maxHourlySuggestions) {
      maxHourlySuggestions = s;
      peakSuggestionHour = h;
    }
  });

  if (peakSuggestionHour !== -1 && maxHourlySuggestions >= 3) {
    const sRatio = ((maxHourlySuggestions / (branch.suggestions || 1)) * 100).toFixed(0);
    return {
      title: t('analytics.smart_insight.peak_suggestion', { hour: `${peakSuggestionHour}:00` }),
      desc: t('analytics.smart_insight.peak_suggestion_desc', { hour: `${peakSuggestionHour}:00`, ratio: sRatio }),
      suggestion: t('analytics.smart_insight.peak_suggestion_suggestion'),
      color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
      icon: Sparkles
    };
  }

  // Case 3.5: Strong Performance (Good Score, Consistent Volume)
  if (score >= 80 && volume >= 15) {
    return {
      title: t('analytics.smart_insight.efficient_performance'),
      desc: t('analytics.smart_insight.efficient_performance_desc', { score: score }),
      suggestion: t('analytics.smart_insight.efficient_performance_suggestion'),
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: CheckCircle
    };
  }

  // Default Case: Stabil Performans
  return {
    title: t('analytics.smart_insight.stable'),
    desc: t('analytics.smart_insight.stable_desc'),
    suggestion: t('analytics.smart_insight.stable_suggestion'),
    color: "text-slate-300 border-slate-700 bg-slate-800/50",
    icon: Target
  };
};

// --- BİLEŞENLER ---

const InfoTooltip = ({ text }) => {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toast({ title: t('toasts.info_title'), description: text, duration: 4000 }); }}
      className="inline-flex items-center ml-1.5 cursor-help group opacity-70 hover:opacity-100 transition-opacity" type="button"
    >
      <Info className="w-3.5 h-3.5 text-sky-400" />
    </button>
  );
};

const ActivityTooltip = ({ active, payload, label, isLight }) => {
  const { t } = useTranslation('admin');
  if (active && payload && payload.length) {
    let timeRange = label;
    try {
      if (typeof label === 'string' && label.includes(':')) {
        const hour = parseInt(label.split(':')[0]);
        const nextHour = (hour + 1) % 24;
        timeRange = `${label} - ${String(nextHour).padStart(2, '0')}:00`;
      }
    } catch (e) {
      console.error("Tooltip label error:", e);
    }

    return (
      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800 shadow-2xl'} min-w-[100px]`}>
        {timeRange && (
          <p className={`text-[10px] font-black mb-1 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white'}`}>
            {timeRange}
          </p>
        )}
        <div className="space-y-0.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-[11px] font-bold" style={{ color: entry.color }}>
                {entry.name} : {entry.payload?._totals?.[entry.dataKey] ?? entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label, isLight = false }) => {
  const { t, i18n } = useTranslation('admin');
  if (active && payload && payload.length) {
    const totalValue = payload.find(p => p.dataKey === 'total')?.value ||
      payload.reduce((acc, curr) => acc + (typeof curr.value === 'number' ? curr.value : 0), 0);
    return (
      <div className={`${isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-700'} backdrop-blur border p-3 rounded-lg shadow-xl text-xs z-50 min-w-[160px]`}>
        <p className={`font-bold ${isLight ? 'text-slate-800 border-slate-200' : 'text-slate-200 border-slate-700'} mb-2 border-b pb-1`}>{label}</p>
        <div className="flex justify-between mb-2">
          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{t('analytics.leaderboard.col_total')}</span>
          <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold`}>{totalValue}</span>
        </div>
        <div className="space-y-1">
          {payload.slice().reverse().map((p, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }}></div>
                <span className="capitalize font-medium" style={{ color: p.color || p.fill }}>
                  {p.name === 'complaint' ? t('analytics.trend.complaint') : p.name === 'suggestion' ? t('analytics.trend.suggestion') : p.name === 'evaluation' ? t('analytics.trend.evaluation') : p.name}
                </span>
              </div>
              <span className="font-mono font-bold" style={{ color: p.color || p.fill }}>{formatNumber(p.value, i18n.language)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value, previousValue, icon: Icon, colorClass, suffix = "", inverseTrend = false, hideTrend = false }) => {
  const { t, i18n } = useTranslation('admin');
  let percentChange = 0;
  let trendDirection = "neutral";
  let isExtreme = false;

  if (previousValue > 0) {
    percentChange = ((value - previousValue) / previousValue) * 100;
    trendDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
  } else if (value > 0) {
    trendDirection = 'up';
    // 🟢 infinity logic
    percentChange = Infinity;
  }

  const isGood = inverseTrend ? trendDirection === 'down' : trendDirection === 'up';
  const trendColor = trendDirection === 'neutral' ? "text-slate-400 bg-slate-800" : (isGood ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10");

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const { display: formattedValue } = formatCompactNumber(numericValue, i18n.language);
  const displayValue = `${formattedValue}${suffix}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all group flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {displayValue}
          </h3>
        </div>
        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${colorClass}`}><Icon className="h-5 w-5" /></div>
      </div>

      <div className="flex items-center gap-2 min-h-[22px]">
        {hideTrend ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50">
            <div className="w-1 h-1 rounded-full bg-slate-500 animate-pulse" />
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">{t('analytics.since_start')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${trendColor}`}>
              {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{percentChange === Infinity ? '∞' : `${Math.abs(percentChange).toFixed(0)}%`}</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {percentChange === Infinity ? t('analytics.kpi.new_data') : t('analytics.kpi.vs_prev_period')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const SplitKpiCard = ({ title, value1, label1, icon1: Icon1, color1, value2, label2, icon2: Icon2, color2 }) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all group h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        </div>
        <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <Icon1 className={`h-4 w-4 ${color1}`} />
          <Icon2 className={`h-4 w-4 ${color2}`} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-[9px] text-slate-500 uppercase font-medium mb-1">{label1}</p>
          <div className={`text-2xl font-extrabold ${color1}`}>%{value1}</div>
        </div>

        <div className="w-px h-10 bg-slate-800 rotate-[15deg] self-center opacity-50" />

        <div className="flex-1 text-right">
          <p className="text-[9px] text-slate-500 uppercase font-medium mb-1">{label2}</p>
          <div className={`text-2xl font-extrabold ${color2}`}>%{value2}</div>
        </div>
      </div>
    </div>
  );
};

// 🟢 ŞUBE DETAY MODALI
const BranchDetailModal = ({ isOpen, onClose, branch, branchesFeedbacks = [], isLight = false, dayDiff = 1 }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [hourlyViewMode, setHourlyViewMode] = useState('age'); // 'age' | 'type'

  // 🟢 DEMOGRAFİK ANALİZ (MODAL İÇİN)
  const ageData = useMemo(() => {
    if (!branch) return [];
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const counts = { '18-': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    branchesFeedbacks.forEach(f => {
      if (f.customer_age_group && counts[f.customer_age_group] !== undefined) {
        counts[f.customer_age_group]++;
      }
    });
    return ageGroups.map(name => ({ name, value: counts[name] }));
  }, [branchesFeedbacks, branch]);

  const ageSentiment = useMemo(() => {
    if (!branch) return [];
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const scores = {};
    branchesFeedbacks.forEach(f => {
      if (f.customer_age_group && (f.rating || f.general_eval_rating)) {
        if (!scores[f.customer_age_group]) scores[f.customer_age_group] = { sum: 0, count: 0 };
        const score = getWeightedScore(f.rating, f.general_eval_rating);
        if (score > 0) {
          scores[f.customer_age_group].sum += (f.rating || f.general_eval_rating || 0);
          scores[f.customer_age_group].count++;
        }
      }
    });
    return ageGroups.map(name => ({
      name,
      score: scores[name]?.count > 0 ? (scores[name].sum / scores[name].count).toFixed(1) : "0.0"
    }));
  }, [branchesFeedbacks, branch]);

  // Şube saatlik yaş aktivitesi
  const branchHourlyAge = useMemo(() => {
    if (!branch) return [];
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const bStats = hours.map(h => ({
      hour: `${h}:00`,
      ...Object.fromEntries(ageGroups.map(age => [age, 0]))
    }));

    branchesFeedbacks.forEach(f => {
      if (f.customer_age_group && ageGroups.includes(f.customer_age_group)) {
        const h = new Date(f.created_at).getHours();
        bStats[h][f.customer_age_group]++;
      }
    });

    // Ortalama hesapla (Barlar için) - Ama tooltipler için ham veriyi sakla
    return bStats.map(s => {
      const entry = { ...s, _totals: { ...s } };
      if (dayDiff > 1) {
        ageGroups.forEach(age => {
          entry[age] = Number((s[age] / dayDiff).toFixed(2));
        });
      }
      return entry;
    });
  }, [branchesFeedbacks, branch, dayDiff]);

  // Şube saatlik form tipi aktivitesi
  const branchHourlyType = useMemo(() => {
    if (!branch) return [];
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const types = ['complaint', 'suggestion', 'evaluation'];
    const bStats = hours.map(h => {
      const entry = { hour: `${h}:00` };
      types.forEach(type => { entry[type] = 0; });
      return entry;
    });

    branchesFeedbacks.forEach(f => {
      const type = f.feedback_type === 'complaint' ? 'complaint' : (f.feedback_type === 'suggestion' ? 'suggestion' : 'evaluation');
      const h = new Date(f.created_at).getHours();
      bStats[h][type]++;
    });

    // Ortalama hesapla (Barlar için) - Ama tooltipler için ham veriyi sakla
    return bStats.map(s => {
      const entry = { ...s, _totals: { ...s } };
      if (dayDiff > 1) {
        types.forEach(type => {
          entry[type] = Number((s[type] / dayDiff).toFixed(2));
        });
      }
      return entry;
    });
  }, [branchesFeedbacks, branch, dayDiff]);

  // Şube Peak Insights (YENİ)
  const branchPeakInsights = useMemo(() => {
    if (!branch || !branchesFeedbacks.length) return null;
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hourCounts = Array(24).fill(0);
    const ageCounts = {};
    const typeCounts = { complaint: 0, suggestion: 0, evaluation: 0 };

    branchesFeedbacks.forEach(f => {
      const date = new Date(f.created_at);
      dayCounts[date.getDay()]++;
      hourCounts[date.getHours()]++;
      if (f.customer_age_group) ageCounts[f.customer_age_group] = (ageCounts[f.customer_age_group] || 0) + 1;
      const type = f.feedback_type === 'complaint' ? 'complaint' : (f.feedback_type === 'suggestion' ? 'suggestion' : 'evaluation');
      typeCounts[type]++;
    });

    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakAge = Object.entries(ageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const peakType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

    return { peakDay, peakHour, peakAge, peakType };
  }, [branchesFeedbacks, branch]);

  if (!isOpen || !branch) return null;

  const insight = getSmartInsight(branch, t);
  const InsightIcon = insight.icon;

  const perception = Number(branch.brandPerception);
  const experience = Number(branch.instantExperience);
  const perceptionGap = perception - experience;

  // Çakışma Kontrolü
  const isOverlap = Math.abs(perceptionGap) < 5;

  let gapStatus = { text: t('analytics.modal.perfect_match'), color: "text-green-400", barColor: "bg-green-500" };
  if (perceptionGap > 20) gapStatus = { text: t('analytics.modal.expectation_unmet'), color: "text-red-400", barColor: "bg-red-500" };
  else if (perceptionGap < -5) gapStatus = { text: t('analytics.modal.expectation_exceeded'), color: "text-emerald-400", barColor: "bg-emerald-400" };



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-700'} w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>

        <div className={`${isLight ? 'bg-slate-50' : 'bg-slate-900/80'} backdrop-blur p-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex justify-between items-start sticky top-0 z-10`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{branch.name}</h2>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                <span>{t('analytics.modal.score')}</span>
                <span className={Number(branch.vocalizeScore) >= 80 ? 'text-amber-500' : (isLight ? 'text-slate-900' : 'text-white')}>{branch.vocalizeScore}</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> {t('analytics.modal.report_card')}
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'} hover:text-white transition-colors`}>
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
                <h3 className="font-bold text-lg mb-1.5">{t('analytics.modal.analysis_title')} {insight.title}</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium mb-2">{insight.desc}</p>
                {insight.suggestion && (
                  <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                    <span className="font-bold">{t('analytics.modal.suggestion_title')} </span>
                    {insight.suggestion}
                  </p>
                )}
              </div>
            </div>
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-current opacity-10 blur-3xl rounded-full"></div>
          </div>

          {/* MARKA VS DENEYİM (LAZER EFEKTLİ BAR) */}
          <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl p-5 border transition-all`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-2`}>
                <Zap className="w-4 h-4 text-sky-400" /> {t('analytics.modal.expectation_balance')}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'} ${gapStatus.color}`}>
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
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 whitespace-nowrap">{t('analytics.modal.exact_match')} ({perception})</span>
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
                    <span className={`absolute -top-8 text-[9px] ${isLight ? 'text-slate-600 bg-white border-slate-200' : 'text-slate-500 bg-slate-900 border-slate-800'} font-bold uppercase tracking-tighter px-1 py-0.5 rounded border whitespace-nowrap`}>{t('analytics.modal.expectation')}</span>
                    <div className={`w-4 h-4 rounded-full ${isLight ? 'bg-white border-slate-100' : 'bg-slate-800'} border-4 border-yellow-500 shadow-lg`}></div>
                    <span className="absolute -bottom-6 text-[10px] font-bold text-yellow-500">{perception}</span>
                  </div>

                  {/* Deneyim Noktası */}
                  <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20" style={{ left: `${experience}%`, transform: 'translate(-50%, -50%)' }}>
                    <span className={`absolute -top-8 text-[9px] text-sky-500 font-bold uppercase tracking-tighter ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} px-1 py-0.5 rounded border whitespace-nowrap`}>{t('analytics.modal.reality')}</span>
                    <div className="relative">
                      <div className={`w-5 h-5 rounded-full bg-sky-500 border-2 ${isLight ? 'border-sky-100' : 'border-white'} shadow-lg z-10`}></div>
                      <div className="absolute inset-0 bg-sky-400 rounded-full animate-pulse opacity-50 blur-sm"></div>
                    </div>
                    <span className={`absolute -bottom-6 text-[10px] font-bold ${isLight ? 'text-sky-600' : 'text-white'}`}>{experience}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 text-center px-4">
              <p className="text-[11px] text-slate-500 italic">
                {isOverlap
                  ? t('analytics.modal.laser_desc_match')
                  : t('analytics.modal.laser_desc_gap')}
              </p>
            </div>
          </div>

          {/* DİĞER VERİLER (GRID) */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-green-500">%{branch.happyRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('analytics.modal.happy')}</span>
            </div>
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-yellow-500">%{branch.neutralRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('analytics.modal.neutral')}</span>
            </div>
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-red-500">%{branch.riskyRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('analytics.modal.unhappy')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`flex items-center justify-between p-4 ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl border`}>
              <div className="flex flex-col">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('analytics.modal.google_switch')}</span>
                <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-xl`}>{branch.googleClicks} <span className="text-sm font-normal text-slate-500">{t('analytics.modal.person')}</span></span>
              </div>
              <div className={`p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800'} rounded-lg text-red-500 shadow-sm`}><MapPin className="w-5 h-5" /></div>
            </div>
            <div className={`flex items-center justify-between p-4 ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl border`}>
              <div className="flex flex-col">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('analytics.modal.resolution_speed')}</span>
                <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-xl`}>%{branch.operationScore}</span>
              </div>
              <div className={`p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800'} rounded-lg text-green-500 shadow-sm`}><CheckCircle className="w-5 h-5" /></div>
            </div>
          </div>

          {/* Şube Saatlik Analiz (YENİ) */}
          <div className={`mt-4 ${isLight ? 'bg-slate-100/30 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border transition-all`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <div>
                  <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('analytics.modal.hourly_activity')}</p>
                  {dayDiff > 1 && (
                    <span className="text-[9px] text-sky-400 font-medium">{t('analytics.hourly.average_desc')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex ${isLight ? 'bg-slate-200/50' : 'bg-slate-950'} p-0.5 rounded-lg border ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
                  <button
                    onClick={() => setHourlyViewMode('age')}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${hourlyViewMode === 'age' ? (isLight ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-800 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {t('analytics.hourly.tabs.age')}
                  </button>
                  <button
                    onClick={() => setHourlyViewMode('type')}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${hourlyViewMode === 'type' ? (isLight ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-800 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {t('analytics.hourly.tabs.type')}
                  </button>
                </div>
                <InfoTooltip text={t('analytics.modal.hourly_desc')} />
              </div>
            </div>
            <div className="h-40 w-full font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyViewMode === 'age' ? branchHourlyAge : branchHourlyType} margin={{ left: -30, bottom: -10 }}>
                  <defs>
                    <filter id="modalBarShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                      <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis dataKey="hour" fontSize={8} tickLine={false} stroke={isLight ? "#64748b" : "#94a3b8"} interval={3} />
                  <YAxis fontSize={8} tickLine={false} stroke={isLight ? "#64748b" : "#94a3b8"} />
                  <Tooltip
                    content={<ActivityTooltip isLight={isLight} />}
                    cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                  />
                  {hourlyViewMode === 'age' ? (
                    <>
                      <Bar dataKey="18-" stackId="a" fill={COLORS.purple} filter="url(#modalBarShadow)" />
                      <Bar dataKey="18-24" stackId="a" fill={COLORS.primary} filter="url(#modalBarShadow)" />
                      <Bar dataKey="25-34" stackId="a" fill={COLORS.success} filter="url(#modalBarShadow)" />
                      <Bar dataKey="35-44" stackId="a" fill={COLORS.warning} filter="url(#modalBarShadow)" />
                      <Bar dataKey="45-54" stackId="a" fill={COLORS.danger} filter="url(#modalBarShadow)" />
                      <Bar dataKey="55+" stackId="a" fill={COLORS.slate} radius={[2, 2, 0, 0]} filter="url(#modalBarShadow)" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="complaint" name={t('analytics.trend.complaint')} stackId="a" fill={COLORS.danger} filter="url(#modalBarShadow)" />
                      <Bar dataKey="suggestion" name={t('analytics.trend.suggestion')} stackId="a" fill={COLORS.primary} filter="url(#modalBarShadow)" />
                      <Bar dataKey="evaluation" name={t('analytics.trend.evaluation')} stackId="a" fill={COLORS.warning} radius={[2, 2, 0, 0]} filter="url(#modalBarShadow)" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Şube Peak Insights UI */}
            {branchPeakInsights && (
              <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-indigo-50/30 border-indigo-100' : 'bg-indigo-500/5 border-indigo-500/20'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-indigo-400" />
                    <span className={`text-[9px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase`}>{t('analytics.hourly.peak_day')}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${isLight ? 'text-indigo-900' : 'text-indigo-100'}`}>{t(`days.${branchPeakInsights.peakDay}`, { ns: 'common' })}</span>
                </div>

                <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-sky-50/30 border-sky-100' : 'bg-sky-500/5 border-sky-500/20'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-sky-400" />
                    <span className={`text-[9px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase`}>{t('analytics.hourly.peak_hour')}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${isLight ? 'text-sky-900' : 'text-sky-100'}`}>{String(branchPeakInsights.peakHour).padStart(2, '0')}:00</span>
                </div>
              </div>
            )}
          </div>

          {/* 👥 ŞUBE DEMOGRAFİK ANALİZ (YENİ) */}
          <div className={`border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} pt-6`}>
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'} mb-4 flex items-center gap-2`}>
              <Users className="w-4 h-4 text-indigo-400" /> {t('analytics.modal.customer_profile')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yaş Dağılımı */}
              <div className={`${isLight ? 'bg-slate-100/30' : 'bg-slate-900/50'} p-4 rounded-xl border ${isLight ? 'border-slate-200' : 'border-slate-800'} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('analytics.modal.demographics')}</p>
                  <InfoTooltip text={t('analytics.modal.demographics_desc')} />
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ageData} cx="50%" cy="50%" innerRadius={0} outerRadius={50} paddingAngle={2} dataKey="value">
                        {ageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.slate][index % 6]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isLight ? '#fff' : '#0f172a',
                          borderColor: isLight ? '#e2e8f0' : '#334155',
                          borderRadius: '12px',
                          color: isLight ? '#1e293b' : '#fff'
                        }}
                        itemStyle={{ color: isLight ? '#1e293b' : '#fff' }}
                        formatter={(val, name, props) => {
                          const color = props.payload.fill || props.payload.color;
                          return [
                            <span style={{ color, fontWeight: 'bold' }}>{val} {t('analytics.modal.transaction')}</span>,
                            <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontWeight: 'bold' }}>{t('analytics.modal.group')} {props.payload.name}</span>
                          ];
                        }}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ fontSize: '10px', color: isLight ? '#64748b' : '#94a3b8', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Yaş Bazlı Memnuniyet */}
              <div className={`${isLight ? 'bg-slate-100/30' : 'bg-slate-900/50'} p-4 rounded-xl border ${isLight ? 'border-slate-200' : 'border-slate-800'} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('analytics.modal.age_satisfaction')}</p>
                  <InfoTooltip text={t('analytics.modal.age_satisfaction_desc')} />
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageSentiment} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <XAxis type="number" domain={[0, 5]} hide />
                      <YAxis dataKey="name" type="category" stroke={isLight ? "#1e293b" : "#fff"} fontSize={10} fontWeight="bold" width={60} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isLight ? '#fff' : '#0f172a',
                          borderColor: isLight ? '#e2e8f0' : '#334155',
                          borderRadius: '12px',
                          color: isLight ? '#1e293b' : '#fff'
                        }}
                        itemStyle={{ color: isLight ? '#1e293b' : '#fff' }}
                        formatter={(val, name, props) => {
                          const color = props.payload.fill || props.payload.color;
                          return [
                            <span style={{ color, fontWeight: 'bold' }}>{val} / 5.0</span>,
                            <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontWeight: 'bold' }}>{t('analytics.modal.point')}</span>
                          ];
                        }}
                      />
                      <Bar dataKey="score" barSize={10} radius={[0, 4, 4, 0]}>
                        {ageSentiment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.slate][index % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
              <p className="text-xs text-indigo-300 text-center">
                {t('analytics.modal.active_group')} <span className="font-bold underline text-white">{branch.dominantAge}</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const DetailedAnalytics = () => {
  const { businessId, selectedBranchId, businessCreatedAt, theme } = useAdminContext();
  const { toast } = useToast();
  const { t } = useTranslation(['admin', 'common']);

  const [loading, setLoading] = useState(true);
  const isLight = theme === 'light';

  const [feedbacks, setFeedbacks] = useState([]);
  const [prevFeedbacks, setPrevFeedbacks] = useState([]);
  const [serverFeedbackCount, setServerFeedbackCount] = useState(null);
  const [serverPrevFeedbackCount, setServerPrevFeedbackCount] = useState(null);
  const [trafficStats, setTrafficStats] = useState({ visits: 0, conversionRate: 0, qrCount: 0, webCount: 0, googleRedirects: 0 });
  const [trendViewMode, setTrendViewMode] = useState('total');
  const [audienceViewMode, setAudienceViewMode] = useState('filtered');
  const [hourlyViewMode, setHourlyViewMode] = useState('age'); // 'age' | 'type'

  const [totalAgeStats, setTotalAgeStats] = useState({ data: [], total: 0 });

  const [selectedModalBranch, setSelectedModalBranch] = useState(null);

  // 🟢 ŞUBE LİGİ SAYFALAMA & ARAMA (Enterprise 300+ şube desteği)
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [allBranches, setAllBranches] = useState([]); // 🟢 Veri olsun olmasın tüm şubeler
  const leaderboardItemsPerPage = 20;

  const [dateRange, setDateRange] = useState({ from: new Date(2020, 0, 1), to: new Date() });
  const [preset, setPreset] = useState('allTime');
  // 🟢 REMOVED: Local isLight state logic moved to AdminContext derived value

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

      // 🟢 1. FETCH ALL BRANCHES (Leaderboard için)
      const { data: bData, error: bErr } = await supabase
        .from('branches')
        .select('id, branch_name_tr, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (!bErr) setAllBranches(bData || []);

      // 🟢 2. COUNTS (Single hit)
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

      const [resCountCurr, resCountPrev] = await Promise.all([countCurrQuery, countPrevQuery]);

      setServerFeedbackCount(resCountCurr.count || 0);
      setServerPrevFeedbackCount(resCountPrev.count || 0);

      // 🟢 3. DEEP FETCH FEEDBACKS
      const queryCurr = supabase.from('feedbacks')
        .select('id, created_at, rating, general_eval_rating, feedback_type, status, branch_id, redirected_to_google, customer_age_group, customer_email, branches(branch_name_tr)')
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      const queryPrev = supabase.from('feedbacks')
        .select('id, rating, general_eval_rating, status, feedback_type, branch_id')
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(prevFrom).toISOString())
        .lte('created_at', endOfDay(prevTo).toISOString());

      const feedbacksCurr = await fetchDeep(selectedBranchId !== 'all' ? queryCurr.eq('branch_id', selectedBranchId) : queryCurr);
      const feedbacksPrev = await fetchDeep(selectedBranchId !== 'all' ? queryPrev.eq('branch_id', selectedBranchId) : queryPrev);

      setFeedbacks(feedbacksCurr);
      setPrevFeedbacks(feedbacksPrev);

      // 🟢 4. TRAFFIC COUNTS
      const qrTrafficQuery = supabase.from('qr_scans')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      const webTrafficQuery = supabase.from('page_views')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('source', 'web')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      const [resQr, resWeb] = await Promise.all([qrTrafficQuery, webTrafficQuery]);

      const qrCount = resQr.count || 0;
      const webCount = resWeb.count || 0;
      const totalVisits = qrCount + webCount;
      const googleRedirects = feedbacksCurr.filter(f => f.redirected_to_google).length;

      setTrafficStats({
        visits: totalVisits, qrCount, webCount, googleRedirects,
        conversionRate: totalVisits > 0 ? ((feedbacksCurr.length / totalVisits) * 100).toFixed(1) : 0
      });

      // 🟢 5. FETCH TOTAL AGE STATS (ALL TIME - For Demographic Chart Toggle)
      const allTimeQuery = supabase.from('feedbacks')
        .select('customer_age_group, customer_email')
        .eq('business_id', businessId);

      const allTimeBranchQuery = selectedBranchId !== 'all' ? allTimeQuery.eq('branch_id', selectedBranchId) : allTimeQuery;
      const allTimeFeedbacks = await fetchDeep(allTimeBranchQuery);

      const uniqueUsersTotal = { '18-': new Set(), '18-24': new Set(), '25-34': new Set(), '35-44': new Set(), '45-54': new Set(), '55+': new Set() };
      const anonymousTotal = { '18-': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };

      allTimeFeedbacks.forEach(f => {
        if (f.customer_age_group && uniqueUsersTotal[f.customer_age_group] !== undefined) {
          if (f.customer_email) uniqueUsersTotal[f.customer_age_group].add(f.customer_email);
          else anonymousTotal[f.customer_age_group]++;
        }
      });

      const totalData = Object.keys(uniqueUsersTotal).map(age => ({
        name: age,
        value: uniqueUsersTotal[age].size + anonymousTotal[age]
      }));
      const totalCount = totalData.reduce((acc, curr) => acc + curr.value, 0);

      setTotalAgeStats({
        data: totalData.map(item => ({
          ...item,
          percent: totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : 0
        })),
        total: totalCount
      });

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: t('analytics.error_connection'), description: t('analytics.error_connection_desc') });
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

  const { i18n } = useTranslation();
  const currentLocale = i18n.language === 'en' ? enUS : tr;

  // KPI
  const kpi = useMemo(() => {
    const calc = (data, serverCount = null) => {
      // 🟢 SERVER COUNT kullan (PostgREST 1000 sınırına takılmaz)
      const total = serverCount !== null ? serverCount : data.length;
      if (total === 0) return { total: 0, uniqueUsers: 0, loyaltyScore: 0, resolvedRate: 0, complaintCount: 0 };

      let totalScore = 0, scoreCount = 0;
      const uniqueEmails = new Set();
      let anonymousCount = 0;

      data.forEach(f => {
        const s = getWeightedScore(f.rating, f.general_eval_rating);
        if (s > 0 || f.rating || f.general_eval_rating) { totalScore += s; scoreCount++; }

        // 🟢 UNIQUE USER CALCULATION (Dedup registered, count anonymous as 1 each)
        if (f.customer_email) {
          uniqueEmails.add(f.customer_email);
        } else {
          anonymousCount++;
        }
      });

      const uniqueUsers = uniqueEmails.size + anonymousCount;
      const loyaltyScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(0) : 0;
      const resolvedCount = data.filter(f => f.status === 'resolved').length;
      const resolvedRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(0) : 0;
      const complaintCount = data.filter(f => f.feedback_type === 'complaint' && f.status !== 'resolved').length;
      const pendingComplaintRate = total > 0 ? ((complaintCount / total) * 100).toFixed(0) : 0;

      return { total, uniqueUsers, loyaltyScore, resolvedRate, complaintCount, pendingComplaintRate };
    };
    return { curr: calc(feedbacks, serverFeedbackCount), prev: calc(prevFeedbacks, serverPrevFeedbackCount) };
  }, [feedbacks, prevFeedbacks, serverFeedbackCount, serverPrevFeedbackCount]);

  // CHART DATA
  const trendData = useMemo(() => {
    const dailyMap = {};
    let currentDate = new Date(dateRange.from);
    while (currentDate <= dateRange.to) {
      const dayKey = format(currentDate, 'dd MMM', { locale: currentLocale });
      dailyMap[dayKey] = { name: dayKey, total: 0, complaint: 0, suggestion: 0, evaluation: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    feedbacks.forEach(f => {
      const day = format(parseISO(f.created_at), 'dd MMM', { locale: currentLocale });
      if (dailyMap[day]) {
        dailyMap[day].total += 1;
        if (f.feedback_type === 'complaint') dailyMap[day].complaint += 1;
        else if (f.feedback_type === 'suggestion') dailyMap[day].suggestion += 1;
        else dailyMap[day].evaluation += 1;
      }
    });
    return Object.values(dailyMap);
  }, [feedbacks, dateRange, currentLocale]);

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
      { label: t('analytics.sentiment.positive'), count: positive, percent: ((positive / total) * 100).toFixed(1), color: COLORS.success },
      { label: t('analytics.sentiment.neutral'), count: neutral, percent: ((neutral / total) * 100).toFixed(1), color: COLORS.warning },
      { label: t('analytics.sentiment.negative'), count: negative, percent: ((negative / total) * 100).toFixed(1), color: COLORS.danger }
    ];
  }, [feedbacks, t]);

  // 🟢 DEMOGRAFİK ZEKÂ VERİLERİ

  // 1. Yaş vs Kategori (Feedback Type) Heatmap/Stacked
  const ageCategoryData = useMemo(() => {
    const raw = { '18-': { c: 0, s: 0, r: 0 }, '18-24': { c: 0, s: 0, r: 0 }, '25-34': { c: 0, s: 0, r: 0 }, '35-44': { c: 0, s: 0, r: 0 }, '45-54': { c: 0, s: 0, r: 0 }, '55+': { c: 0, s: 0, r: 0 } };
    feedbacks.forEach(f => {
      if (f.customer_age_group && raw[f.customer_age_group]) {
        const typeKey = f.feedback_type === 'complaint' ? 'c' : (f.feedback_type === 'suggestion' ? 's' : 'r');
        raw[f.customer_age_group][typeKey]++;
      }
    });
    return Object.entries(raw).map(([age, counts]) => ({
      name: age,
      complaint: counts.c,
      suggestion: counts.s,
      review: counts.r
    }));
  }, [feedbacks]);

  // 2. Yaş Bazlı Memnuniyet & Brand Loyalty Score
  const ageSentimentData = useMemo(() => {
    const scores = { '18-': { total: 0, count: 0 }, '18-24': { total: 0, count: 0 }, '25-34': { total: 0, count: 0 }, '35-44': { total: 0, count: 0 }, '45-54': { total: 0, count: 0 }, '55+': { total: 0, count: 0 } };
    feedbacks.forEach(f => {
      if (f.customer_age_group && scores[f.customer_age_group]) {
        const rating = f.general_eval_rating || f.rating || 0;
        if (rating > 0) {
          scores[f.customer_age_group].total += rating;
          scores[f.customer_age_group].count++;
        }
      }
    });
    return Object.entries(scores).map(([age, data]) => ({
      name: age,
      score: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
      count: data.count
    }));
  }, [feedbacks]);

  // 3. Canlı Kitle (Son 24 Saat)
  const liveAudience = useMemo(() => {
    const now = new Date();
    const oneDayAgo = sub(now, { hours: 24 });
    const recent = feedbacks.filter(f => new Date(f.created_at) >= oneDayAgo && f.customer_age_group);

    const counts = {};
    recent.forEach(f => { counts[f.customer_age_group] = (counts[f.customer_age_group] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([age, count]) => ({ age, count }));
  }, [feedbacks]);

  // 🟢 YAŞ DAĞILIMI VERİSİ
  const ageStats = useMemo(() => {
    const uniqueUsersPerAge = { '18-': new Set(), '18-24': new Set(), '25-34': new Set(), '35-44': new Set(), '45-54': new Set(), '55+': new Set() };
    const anonymousCounts = { '18-': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };

    feedbacks.forEach(f => {
      if (f.customer_age_group && uniqueUsersPerAge[f.customer_age_group] !== undefined) {
        if (f.customer_email) {
          uniqueUsersPerAge[f.customer_age_group].add(f.customer_email);
        } else {
          anonymousCounts[f.customer_age_group]++;
        }
      }
    });

    const data = Object.keys(uniqueUsersPerAge).map(age => {
      const count = uniqueUsersPerAge[age].size + anonymousCounts[age];
      return { name: age, value: count };
    });

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    // Add percentage
    const finalData = data.map(item => ({
      ...item,
      percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    }));

    return { data: finalData, total };
  }, [feedbacks]);

  const dayDiff = useMemo(() => {
    const diff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diff, 1);
  }, [dateRange]);

  // 4. Saatlik Yaş Bazlı Aktivite
  const hourlyAgeStats = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];

    const stats = hours.map(h => {
      const entry = { hour: `${h}:00` };
      ageGroups.forEach(age => { entry[age] = 0; });
      return entry;
    });

    feedbacks.forEach(f => {
      if (f.customer_age_group && ageGroups.includes(f.customer_age_group)) {
        const hour = new Date(f.created_at).getHours();
        stats[hour][f.customer_age_group]++;
      }
    });

    // Ortalama hesapla (Barlar için) - Ama tooltipler için ham veriyi sakla
    return stats.map(s => {
      const entry = { ...s, _totals: { ...s } }; // Ham sayıları _totals altında sakla
      if (dayDiff > 1) {
        ageGroups.forEach(age => {
          entry[age] = Number((s[age] / dayDiff).toFixed(2));
        });
      }
      return entry;
    });
  }, [feedbacks, dayDiff]);

  // 5. Saatlik Form Tipi Bazlı Aktivite
  const hourlyTypeStats = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const types = ['complaint', 'suggestion', 'evaluation'];

    const stats = hours.map(h => {
      const entry = { hour: `${h}:00` };
      types.forEach(type => { entry[type] = 0; });
      return entry;
    });

    feedbacks.forEach(f => {
      const type = f.feedback_type === 'complaint' ? 'complaint' : (f.feedback_type === 'suggestion' ? 'suggestion' : 'evaluation');
      const hour = new Date(f.created_at).getHours();
      stats[hour][type]++;
    });

    // Ortalama hesapla (Barlar için) - Ama tooltipler için ham veriyi sakla
    return stats.map(s => {
      const entry = { ...s, _totals: { ...s } }; // Ham sayıları _totals altında sakla
      if (dayDiff > 1) {
        types.forEach(type => {
          entry[type] = Number((s[type] / dayDiff).toFixed(2));
        });
      }
      return entry;
    });
  }, [feedbacks, dayDiff]);

  // 🟢 EN YOĞUN ANALİZLER (HIZLI BAKIŞ)
  const peakInsights = useMemo(() => {
    if (!feedbacks.length) return null;

    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0: Sunday, 1: Monday...
    const hourCounts = Array(24).fill(0);
    const ageCounts = {};
    const typeCounts = { complaint: 0, suggestion: 0, evaluation: 0 };

    feedbacks.forEach(f => {
      const date = new Date(f.created_at);
      dayCounts[date.getDay()]++;
      hourCounts[date.getHours()]++;
      if (f.customer_age_group) ageCounts[f.customer_age_group] = (ageCounts[f.customer_age_group] || 0) + 1;
      const type = f.feedback_type === 'complaint' ? 'complaint' : (f.feedback_type === 'suggestion' ? 'suggestion' : 'evaluation');
      typeCounts[type]++;
    });

    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakAge = Object.entries(ageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const peakType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

    return { peakDay, peakHour, peakAge, peakType };
  }, [feedbacks]);

  const sourceData = useMemo(() => [
    { name: t('analytics.traffic.qr_scan'), value: trafficStats.qrCount, color: COLORS.success },
    { name: t('analytics.traffic.web_link'), value: trafficStats.webCount, color: COLORS.primary }
  ].filter(i => i.value > 0), [trafficStats, t]);

  // LİDERLİK TABLOSU
  const leaderboardData = useMemo(() => {
    if (selectedBranchId !== 'all') return null;
    const map = {};

    // 🟢 Initialize map with all branches (Ensures visibility)
    allBranches.forEach(b => {
      map[b.branch_name_tr] = {
        name: b.branch_name_tr,
        branch_id: b.id,
        total: 0,
        resolved: 0,
        complaints: 0,
        scoreSum: 0,
        scoreCount: 0,
        googleClicks: 0,
        happy: 0, neutral: 0, risky: 0,
        ratingSum: 0, ratingCount: 0,
        generalSum: 0, generalCount: 0,
        ageCounts: {},
        hourlyComplaints: Array(24).fill(0),
        hourlySuggestions: Array(24).fill(0),
        suggestions: 0
      };
    });

    feedbacks.forEach(f => {
      const bName = f.branches?.branch_name_tr || 'Bilinmiyor';
      if (!map[bName]) {
        // Fallback for branches not in allBranches list
        map[bName] = {
          name: bName,
          total: 0,
          resolved: 0,
          complaints: 0,
          scoreSum: 0,
          scoreCount: 0,
          googleClicks: 0,
          happy: 0, neutral: 0, risky: 0,
          ratingSum: 0, ratingCount: 0,
          generalSum: 0, generalCount: 0,
          ageCounts: {},
          hourlyComplaints: Array(24).fill(0),
          hourlySuggestions: Array(24).fill(0),
          suggestions: 0
        };
      }

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

      if (f.feedback_type === 'suggestion') item.suggestions += 1;

      const hour = new Date(f.created_at).getHours();
      if (f.feedback_type === 'complaint') item.hourlyComplaints[hour] += 1;
      if (f.feedback_type === 'suggestion') item.hourlySuggestions[hour] += 1;

      if (f.customer_age_group) {
        item.ageCounts[f.customer_age_group] = (item.ageCounts[f.customer_age_group] || 0) + 1;
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
        instantExperience, brandPerception,
        dominantAge: Object.entries(b.ageCounts).sort((x, y) => y[1] - x[1])[0]?.[0] || '-'
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
      name: feedbacks[0].branches?.branch_name_tr || t('analytics.single_branch.selected_branch'),
      total: 0,
      complaints: 0,
      resolved: 0,
      googleClicks: 0,
      scoreSum: 0,
      scoreCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      generalSum: 0,
      generalCount: 0,
      ageCounts: {},
      hourlyComplaints: Array(24).fill(0),
      hourlySuggestions: Array(24).fill(0),
      suggestions: 0
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
      if (f.feedback_type === 'suggestion') acc.suggestions += 1;
      const hour = new Date(f.created_at).getHours();
      if (f.feedback_type === 'complaint') acc.hourlyComplaints[hour] += 1;
      if (f.feedback_type === 'suggestion') acc.hourlySuggestions[hour] += 1;

      if (f.customer_age_group) {
        acc.ageCounts[f.customer_age_group] = (acc.ageCounts[f.customer_age_group] || 0) + 1;
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
      brandPerception,
      dominantAge: Object.entries(agg.ageCounts).sort((x, y) => y[1] - x[1])[0]?.[0] || '-',
      ageCounts: agg.ageCounts
    };
  }, [feedbacks, selectedBranchId, leaderboardData]);

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50' : 'bg-[#0f172a]'} ${isLight ? 'text-slate-900' : 'text-slate-200'} pb-32 pt-24 lg:pt-0 font-sans selection:bg-sky-500/30 transition-colors duration-300`}>
      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className={`text-3xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-3`}>
              <BarChart3 className="w-8 h-8 text-sky-500" />
              {t('analytics.title')}
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              {t('analytics.subtitle')}
            </p>
          </div>
          <div className="w-full lg:w-auto z-20">
            <DateRangePicker date={dateRange} setDate={setDateRange} preset={preset} setPreset={setPreset} />
          </div>
        </div>

        {/* KPI KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard
            title={t('analytics.kpi.total_interactions')}
            value={kpi.curr.total}
            previousValue={kpi.prev.total}
            icon={Activity}
            colorClass="text-sky-400 group-hover:text-sky-300"
            hideTrend={preset === 'allTime'}
          />
          <KpiCard
            title={t('analytics.kpi.unique_users')}
            value={kpi.curr.uniqueUsers}
            previousValue={kpi.prev.uniqueUsers}
            icon={Users}
            colorClass="text-indigo-400 group-hover:text-indigo-300"
            hideTrend={preset === 'allTime'}
          />
          <KpiCard
            title={t('analytics.kpi.loyalty_score')}
            value={kpi.curr.loyaltyScore}
            previousValue={kpi.prev.loyaltyScore}
            icon={Heart}
            suffix="/100"
            colorClass="text-pink-400 group-hover:text-pink-300"
            hideTrend={preset === 'allTime'}
          />
          <SplitKpiCard
            title={t('analytics.kpi.operational_performance')}
            label1={t('analytics.kpi.resolution_success')}
            value1={kpi.curr.resolvedRate}
            icon1={CheckCircle}
            color1="text-emerald-400"
            label2={t('analytics.kpi.pending_complaint')}
            value2={kpi.curr.pendingComplaintRate}
            icon2={AlertTriangle}
            color2="text-rose-400"
          />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium animate-pulse">{t('analytics.loading')}</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* GRAFİKLER BÖLÜMÜ */}
            <div className="space-y-8">

              {/* 1. Trend & Marka Algısı */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 shadow-lg transition-all`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                      <TrendingUp className="w-5 h-5 text-sky-400" />
                      {t('analytics.trend.title')}
                    </h3>
                    <div className={`flex ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0f172a] border-slate-800'} p-1 rounded-lg border shrink-0`}>
                      <button onClick={() => setTrendViewMode('total')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('analytics.trend.general')}</button>
                      <button onClick={() => setTrendViewMode('breakdown')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'breakdown' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('analytics.trend.detailed')}</button>
                    </div>
                  </div>
                  <div className="h-72 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      {trendViewMode === 'total' ? (
                        <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs><linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} /><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} vertical={false} opacity={0.4} />
                          <XAxis dataKey="name" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                          <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip isLight={isLight} />} />
                          <Area type="monotone" dataKey="total" name={t('analytics.trend.notification')} stroke={COLORS.primary} strokeWidth={3} fill="url(#colorTrend)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} vertical={false} opacity={0.4} />
                          <XAxis dataKey="name" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                          <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip isLight={isLight} />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', color: isLight ? '#475569' : '#94a3b8' }} iconType="circle" iconSize={8} formatter={(value) => <span className="mr-4">{value}</span>} />
                          <Bar dataKey="complaint" name={t('analytics.trend.complaint')} stackId="a" fill={COLORS.danger} barSize={20} />
                          <Bar dataKey="suggestion" name={t('analytics.trend.suggestion')} stackId="a" fill={COLORS.primary} barSize={20} />
                          <Bar dataKey="evaluation" name={t('analytics.trend.evaluation')} stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col justify-between transition-all`}>
                  <div>
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                      <Zap className="w-5 h-5 text-yellow-400" />
                      {t('analytics.brand_vs_experience.title')}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 mb-8">
                      {t('analytics.brand_vs_experience.subtitle')}
                    </p>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{t('analytics.brand_vs_experience.general_perception')}</span>
                          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{loyaltyComparison.general}%</span>
                        </div>
                        <div className={`detail-analytics-bar-wrap h-4 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-700/50'} rounded-full border`}>
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${loyaltyComparison.general}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{t('analytics.brand_vs_experience.instant_experience')}</span>
                          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{loyaltyComparison.instant}%</span>
                        </div>
                        <div className={`detail-analytics-bar-wrap h-4 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-700/50'} rounded-full border`}>
                          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" style={{ width: `${loyaltyComparison.instant}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-6 p-3 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-800/50 border-slate-700/50'} rounded-xl border`}>
                    <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} text-center leading-relaxed`}>
                      {Number(loyaltyComparison.general) > Number(loyaltyComparison.instant)
                        ? t('analytics.brand_vs_experience.warning')
                        : t('analytics.brand_vs_experience.great')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Trafik, Duygu ve Yaş Dağılımı */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-1 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 relative flex flex-col transition-all`}>
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.traffic.title')}</h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs text-balance`}>{t('analytics.traffic.subtitle')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col xl:flex-row gap-6 items-center lg:items-start">
                    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center mx-auto lg:mx-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart className="detail-analytics-pie">
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="rgba(255,255,255,0.05)" strokeWidth={1}>
                            {sourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isLight ? '#fff' : '#0f172a',
                              borderColor: isLight ? '#e2e8f0' : '#334155',
                              borderRadius: '12px',
                              color: isLight ? '#1e293b' : '#fff'
                            }}
                            itemStyle={{ color: isLight ? '#1e293b' : '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(val, name, props) => {
                              const color = props.payload.color || props.payload.fill;
                              return [
                                <span style={{ color }}>{val}</span>,
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{name}</span>
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={`text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatNumber(trafficStats.visits)}</span>
                        <span className={`text-[8px] ${isLight ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tighter`}>{t('analytics.traffic.visit')}</span>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                      <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col items-center text-center justify-center`}>
                        <QrCode className="w-4 h-4 text-green-500 mb-1" />
                        <span className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-none`}>{trafficStats.qrCount}</span>
                        <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'} mt-1 whitespace-nowrap`}>{t('analytics.traffic.qr_scan')}</span>
                      </div>
                      <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col items-center text-center justify-center`}>
                        <LinkIcon className="w-4 h-4 text-sky-500 mb-1" />
                        <span className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-none`}>{trafficStats.webCount}</span>
                        <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'} mt-1 whitespace-nowrap`}>{t('analytics.traffic.web_link')}</span>
                      </div>
                      <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 flex flex-col items-center text-center justify-center group relative cursor-help">
                        <div className="absolute top-1 right-1"><InfoTooltip text={t('analytics.traffic.tooltip_conversion')} /></div>
                        <Activity className="w-4 h-4 text-purple-400 mb-1" />
                        <span className="text-base font-bold text-white leading-none">%{trafficStats.conversionRate}</span>
                        <span className="text-[9px] text-purple-300 mt-1 whitespace-nowrap">{t('analytics.traffic.conversion')}</span>
                      </div>
                      <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex flex-col items-center text-center justify-center cursor-help relative">
                        <div className="absolute top-1 right-1"><InfoTooltip text={t('analytics.traffic.tooltip_maps')} /></div>
                        <MapPin className="w-4 h-4 text-red-400 mb-1" />
                        <span className="text-base font-bold text-white leading-none">{trafficStats.googleRedirects}</span>
                        <span className="text-[9px] text-red-300 mt-1 whitespace-nowrap">{t('analytics.traffic.maps')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`lg:col-span-2 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 transition-all`}>
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                        {t('analytics.sentiment.title')}
                        <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} font-normal text-xs ml-1`}>{t('analytics.sentiment.total_label', { count: formatNumber(serverFeedbackCount) })}</span>
                      </h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('analytics.sentiment.subtitle')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    {sentimentData.map((item, idx) => (
                      <div key={idx} className="flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-medium text-slate-300">{item.label}</span>
                          <div className="text-right leading-none">
                            <span className="text-xl font-bold text-white">%{item.percent}</span>
                            <span className="text-[10px] text-slate-500 uppercase ml-2 tracking-tighter">({item.count} {t('analytics.sentiment.transaction')})</span>
                          </div>
                        </div>
                        <div className={`detail-analytics-bar-wrap h-3 w-full ${isLight ? 'bg-slate-100' : 'bg-slate-800'} rounded-full overflow-hidden`}>
                          <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor] opacity-90" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🟢 SAATLİK YOĞUNLUK ANALİZİ (YENİ) - TAM GENİŞLİK */}
                <div className={`lg:col-span-3 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 transition-all`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.hourly.title')}</h3>
                        <div className="flex items-center gap-2">
                          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('analytics.hourly.subtitle')}</p>
                          {dayDiff > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {t('analytics.hourly.average_desc')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0f172a] border-slate-800'} p-1 rounded-lg border`}>
                        <button
                          onClick={() => setHourlyViewMode('age')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${hourlyViewMode === 'age' ? (isLight ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-800 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {t('analytics.hourly.tabs.age')}
                        </button>
                        <button
                          onClick={() => setHourlyViewMode('type')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${hourlyViewMode === 'type' ? (isLight ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-800 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {t('analytics.hourly.tabs.type')}
                        </button>
                      </div>
                      <InfoTooltip text={t('analytics.hourly.tooltip')} />
                    </div>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyViewMode === 'age' ? hourlyAgeStats : hourlyTypeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                            <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.3" />
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? "#e2e8f0" : "#334155"} opacity={0.3} />
                        <XAxis dataKey="hour" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={<ActivityTooltip isLight={isLight} />}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: isLight ? '#475569' : '#94a3b8' }} />
                        {hourlyViewMode === 'age' ? (
                          <>
                            <Bar dataKey="18-" stackId="a" fill={COLORS.purple} filter="url(#barShadow)" />
                            <Bar dataKey="18-24" stackId="a" fill={COLORS.primary} filter="url(#barShadow)" />
                            <Bar dataKey="25-34" stackId="a" fill={COLORS.success} filter="url(#barShadow)" />
                            <Bar dataKey="35-44" stackId="a" fill={COLORS.warning} filter="url(#barShadow)" />
                            <Bar dataKey="45-54" stackId="a" fill={COLORS.danger} filter="url(#barShadow)" />
                            <Bar dataKey="55+" stackId="a" fill={COLORS.slate} radius={[4, 4, 0, 0]} filter="url(#barShadow)" />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="complaint" name={t('analytics.trend.complaint')} stackId="a" fill={COLORS.danger} filter="url(#barShadow)" />
                            <Bar dataKey="suggestion" name={t('analytics.trend.suggestion')} stackId="a" fill={COLORS.primary} filter="url(#barShadow)" />
                            <Bar dataKey="evaluation" name={t('analytics.trend.evaluation')} stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} filter="url(#barShadow)" />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 🟢 HIZLI BAKIŞ (PEAK INSIGHTS) */}
                  {peakInsights && (
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                          <Trophy className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">{t('analytics.hourly.peak_day')}</span>
                        </div>
                        <p className={`text-sm font-bold ${isLight ? 'text-indigo-900' : 'text-indigo-100'}`}>
                          {t(`days.${peakInsights.peakDay}`, { ns: 'common' })}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-sky-50/50 border-sky-100 shadow-sm' : 'bg-sky-500/5 border-sky-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2 text-sky-400">
                          <Zap className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">{t('analytics.hourly.peak_hour')}</span>
                        </div>
                        <p className={`text-sm font-bold ${isLight ? 'text-sky-900' : 'text-sky-100'}`}>
                          {String(peakInsights.peakHour).padStart(2, '0')}:00 - {String(peakInsights.peakHour + 1).padStart(2, '0')}:00
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                          <Users className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">{t('analytics.hourly.peak_group')}</span>
                        </div>
                        <p className={`text-sm font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-100'}`}>
                          {peakInsights.peakAge} {t('analytics.modal.person')}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-purple-50/50 border-purple-100 shadow-sm' : 'bg-purple-500/5 border-purple-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2 text-purple-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">{t('analytics.hourly.peak_type')}</span>
                        </div>
                        <p className={`text-sm font-bold ${isLight ? 'text-purple-900' : 'text-purple-100'}`}>
                          {t(`analytics.trend.${peakInsights.peakType}`)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🟢 DEMOGRAFİK ZEKÂ (YENİ BÖLÜM) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t('analytics.demographics.title')}</h2>
                  <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>{t('analytics.demographics.subtitle')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Yaş Dağılımı (Mevcut) */}
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col transition-all`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.demographics.audience_title')}</h3>
                      <InfoTooltip text={t('analytics.demographics.tooltip_audience')} />
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-900/50 border border-slate-800 rounded-lg self-end sm:self-auto">
                      <button
                        onClick={() => setAudienceViewMode('filtered')}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${audienceViewMode === 'filtered' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t('analytics.demographics.filter')}
                      </button>
                      <button
                        onClick={() => setAudienceViewMode('all')}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${audienceViewMode === 'all' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t('analytics.demographics.all')}
                      </button>
                    </div>
                  </div>
                  {audienceViewMode === 'filtered' && liveAudience.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-900/30 border border-green-800 rounded text-[10px] text-green-400 animate-pulse w-max mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {t('analytics.demographics.live_feed')}
                    </div>
                  )}

                  {(audienceViewMode === 'filtered' ? ageStats.total : totalAgeStats.total) > 0 ? (
                    <div className="flex-1 min-h-[200px] flex flex-col justify-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={audienceViewMode === 'filtered' ? ageStats.data : totalAgeStats.data}
                            cx="50%" cy="50%" innerRadius={0} outerRadius={80} paddingAngle={2} dataKey="value"
                          >
                            {ageStats.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.slate][index % 6]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isLight ? '#fff' : '#0f172a',
                              borderColor: isLight ? '#e2e8f0' : '#334155',
                              borderRadius: '12px',
                              color: isLight ? '#1e293b' : '#fff'
                            }}
                            itemStyle={{ color: isLight ? '#1e293b' : '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(value, name, props) => {
                              const color = props.payload.fill || props.payload.color;
                              return [
                                <span style={{ color }}>{value} {t('analytics.demographics.person')}</span>,
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{t('analytics.demographics.age')}: {name}</span>
                              ];
                            }}
                          />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ fontSize: '11px', color: isLight ? '#475569' : '#94a3b8', paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 opacity-50">
                      <Users className="w-12 h-12 mb-2" />
                      <p className="text-sm">{t('analytics.demographics.no_data')}</p>
                    </div>
                  )}
                </div>

                {/* 2. Yaş vs Memnuniyet (Brand Loyalty) */}
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col transition-all`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.demographics.loyalty_title')}</h3>
                    <InfoTooltip text={t('analytics.demographics.loyalty_tooltip')} />
                  </div>
                  <p className="text-slate-400 text-xs mb-6">{t('analytics.demographics.loyalty_subtitle')}</p>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageSentimentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isLight ? "#e2e8f0" : "#334155"} opacity={0.3} />
                        <XAxis
                          type="number"
                          domain={[0, 5]}
                          stroke={isLight ? "#64748b" : "#94a3b8"}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          ticks={[0, 1, 2, 3, 4, 5]}
                          tickFormatter={(val) => `${val} ⭐`}
                        />
                        <YAxis dataKey="name" type="category" stroke={isLight ? "#1e293b" : "#fff"} fontSize={12} fontWeight="bold" width={60} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            backgroundColor: isLight ? '#fff' : '#0f172a',
                            borderColor: isLight ? '#e2e8f0' : '#334155',
                            borderRadius: '12px',
                            color: isLight ? '#1e293b' : '#fff'
                          }}
                          itemStyle={{ color: isLight ? '#1e293b' : '#fff', fontSize: '12px', fontWeight: 'bold' }}
                          labelStyle={{ color: isLight ? '#64748b' : '#94a3b8' }}
                          formatter={(val, name, props) => {
                            const color = props.payload.fill || props.color || (isLight ? '#1e293b' : '#fff');
                            return [
                              <span style={{ color }}>{val} / 5.0</span>,
                              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{t('analytics.demographics.avg_score')}</span>
                            ];
                          }}
                        />
                        <Bar dataKey="score" name={t('analytics.modal.point')} barSize={12} radius={[0, 4, 4, 0]}>
                          {ageSentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.slate][index % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. İlgi Alanları (Category Heatmap) */}
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col transition-all`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.demographics.form_dist_title')}</h3>
                    <InfoTooltip text={t('analytics.demographics.form_dist_tooltip')} />
                  </div>
                  <p className="text-slate-400 text-xs mb-6">{t('analytics.demographics.form_dist_subtitle')}</p>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageCategoryData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip isLight={isLight} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: isLight ? '#475569' : '#94a3b8' }} />
                        <Bar dataKey="complaint" name={t('analytics.trend.complaint')} stackId="a" fill={COLORS.danger} barSize={20} />
                        <Bar dataKey="suggestion" name={t('analytics.trend.suggestion')} stackId="a" fill={COLORS.primary} barSize={20} />
                        <Bar dataKey="review" name={t('analytics.trend.evaluation')} stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>

            {selectedBranchId === 'all' && leaderboardData && leaderboardData.length > 0 && (
              <div className={`${isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 relative overflow-visible z-0 mb-8 shadow-lg transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <div>
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('analytics.leaderboard.title')}</h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('analytics.leaderboard.subtitle', { count: leaderboardData.length })}</p>
                    </div>
                  </div>

                  {/* 🔍 ARAMA KUTUSU */}
                  <div className="relative w-full md:w-64">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      placeholder={t('analytics.leaderboard.search_placeholder')}
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'} border rounded-lg text-sm ${isLight ? 'text-slate-900' : 'text-white'} placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors`}
                    />
                  </div>
                </div>

                {/* AĞIRLIK LEJANTI */}
                <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800/50'} p-2 rounded-lg border mb-4`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1"><Scale className="w-3 h-3" /> {t('analytics.leaderboard.weight_label')}</span>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('analytics.leaderboard.quality')}</span>
                      <InfoTooltip text={t('analytics.leaderboard.quality_tooltip')} />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('analytics.leaderboard.operation')}</span>
                      <InfoTooltip text={t('analytics.leaderboard.operation_tooltip')} />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('analytics.leaderboard.data_share')}</span>
                      <InfoTooltip text={t('analytics.leaderboard.data_share_tooltip')} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4 relative z-0">
                  <table className="branch-league-table w-full min-w-[800px] text-left text-sm text-slate-400 border-collapse">
                    <thead className={`${isLight ? 'bg-slate-100/50' : 'bg-[#0f172a]'} text-xs uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'} tracking-wider`}>
                      <tr>
                        <th className={`px-6 py-4 rounded-l-lg border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>{t('analytics.leaderboard.col_rank')}</th>
                        <th className={`px-6 py-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>{t('analytics.leaderboard.col_branch')}</th>
                        <th className={`px-6 py-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} text-center`}>
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_total')} <MessageSquare className="w-3 h-3 text-slate-500" /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} ${isLight ? 'bg-slate-100/30' : 'bg-slate-900/50'} text-sky-500 cursor-help`}>
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_league')} <InfoTooltip text={t('analytics.leaderboard.col_league_tooltip')} /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} cursor-help`}>
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_quality')} <InfoTooltip text={t('analytics.leaderboard.col_quality_tooltip')} /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} cursor-help`}>
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_resolution')} <InfoTooltip text={t('analytics.leaderboard.col_resolution_tooltip')} /></div>
                        </th>
                        <th className="px-6 py-4 text-center rounded-r-lg cursor-help">
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_audience')} <InfoTooltip text={t('analytics.leaderboard.col_audience_tooltip')} /></div>
                        </th>
                        <th className="px-6 py-4 text-center rounded-r-lg cursor-help">
                          <div className="flex items-center justify-center gap-1">{t('analytics.leaderboard.col_maps')} <InfoTooltip text={t('analytics.leaderboard.col_maps_tooltip')} /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                      {paginatedLeaderboard.map((branch, i) => {
                        // Gerçek sıra numarasını hesapla (sayfalama ile)
                        const actualRank = filteredLeaderboard.indexOf(branch) + 1;
                        const isFirst = actualRank === 1 && !leaderboardSearch;
                        return (
                          <tr
                            key={branch.name}
                            onClick={() => setSelectedModalBranch(branch)}
                            className={`cursor-pointer transition-all duration-200 group ${isFirst ? (isLight ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-amber-500/5 hover:bg-amber-500/10') : (isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60')}`}
                          >
                            <td className="px-6 py-4 border-r border-slate-800/50 font-bold text-white relative">
                              {isFirst ? <span className="text-2xl drop-shadow-lg">🥇</span> : <span className="text-slate-500">#{actualRank}</span>}
                            </td>
                            <td className="px-6 py-4 font-medium text-white group-hover:text-sky-400 transition-colors border-r border-slate-800/50 flex items-center gap-2">
                              {branch.name}
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-sky-400 transition-opacity">{t('analytics.leaderboard.inspect')}</span>
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
                            <td className="px-6 py-4 text-center border-r border-slate-800/50">
                              <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-teal-400 border border-slate-700">{branch.dominantAge}</span>
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
                      {leaderboardSearch ? t('analytics.leaderboard.no_results_search', { query: leaderboardSearch }) : t('analytics.leaderboard.no_results')}
                    </div>
                  )}
                </div>

                {/* 🟢 SAYFALAMA KONTROLLARI */}
                {leaderboardTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-500">
                      {t('analytics.leaderboard.pagination_info', { from: (leaderboardPage - 1) * leaderboardItemsPerPage + 1, to: Math.min(leaderboardPage * leaderboardItemsPerPage, filteredLeaderboard.length), total: filteredLeaderboard.length })}
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
              const insight = getSmartInsight(singleBranchSummary, t);
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
                          {t('analytics.single_branch.analysis_title', { name: singleBranchSummary.name })}
                        </h3>
                        <p className="text-sm text-slate-200 font-semibold mb-1.5">
                          {t('analytics.single_branch.vocalize_eval')} {insight.title}
                        </p>
                        <p className="text-sm opacity-90 leading-relaxed text-slate-200 mb-2">
                          {insight.desc}
                        </p>
                        {insight.suggestion && (
                          <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                            <span className="font-bold">{t('analytics.modal.suggestion_title')} </span>
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

        {/* 🟢 ŞUBE DETAY MODALI (Akıllı Teşhis + Gap Analizi + Demografik) */}
        <BranchDetailModal
          isOpen={!!selectedModalBranch}
          onClose={() => setSelectedModalBranch(null)}
          branch={selectedModalBranch}
          branchesFeedbacks={feedbacks.filter(f => f.branch_id === selectedModalBranch?.branch_id || f.branches?.branch_name_tr === selectedModalBranch?.name)}
          isLight={isLight}
          dayDiff={dayDiff}
        />
      </div>
    </div>
  );
};

export default DetailedAnalytics;