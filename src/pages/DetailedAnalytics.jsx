import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { useTranslation } from 'react-i18next';

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

  // Şikayet oranı: complaints / total
  const complaintRatio = volume > 0 ? complaints / volume : 0;

  // Case 1: Low Data (volume < 5)
  if (volume < 5) {
    return {
      title: t('admin.insights.title'),
      desc: t('admin.insights.desc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-slate-400 border-slate-700 bg-slate-800/50",
      icon: Activity
    };
  }

  // Case 2: Digital Engine (google > 10 & score > 80)
  if (google > 10 && score > 80) {
    return {
      title: t('admin.insights.digitalGrowth'),
      desc: t('admin.insights.digitalGrowthDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      icon: MapPin
    };
  }

  // Case 3: Silent Satisfaction (score > 85 & volume < 15)
  if (score > 85 && volume < 15) {
    return {
      title: t('admin.insights.silentSatisfaction'),
      desc: t('admin.insights.silentSatisfactionDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      icon: Sparkles
    };
  }

  // Case 3.5: Strong Performance (Good Score, Consistent Volume)
  if (score >= 80 && volume >= 15) {
    return {
      title: t('admin.insights.strongPerformance'),
      desc: t('admin.insights.strongPerformanceDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: CheckCircle
    };
  }

  // Case 4: Critical Operational Alarm (complaintRatio > 10% & ops < 60)
  if (complaintRatio > 0.1 && ops < 60) {
    return {
      title: t('admin.insights.operationalAlarm'),
      desc: t('admin.insights.operationalAlarmDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-red-400 border-red-500/30 bg-red-500/10",
      icon: AlertTriangle
    };
  }

  // Case 5: Brand Risk (gap > 15)
  if (gap > 15) {
    return {
      title: t('admin.insights.brandRisk'),
      desc: t('admin.insights.brandRiskDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      icon: Zap
    };
  }

  // Case 6: Role Model (score > 85 & ops > 90)
  if (score > 85 && ops > 90) {
    return {
      title: t('admin.insights.roleModel'),
      desc: t('admin.insights.roleModelDesc'),
      suggestion: t('admin.insights.suggestion'),
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      icon: Trophy
    };
  }

  // Default Case: Stabil Performans
  return {
    title: t('admin.insights.stablePerformance'),
    desc: t('admin.insights.stablePerformanceDesc'),
    suggestion: t('admin.insights.suggestion'),
    color: "text-slate-300 border-slate-700 bg-slate-800/50",
    icon: Target
  };
};

// --- BİLEŞENLER ---

const InfoTooltip = ({ text, t }) => {
  const { toast } = useToast();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toast({ title: t('common.info', { defaultValue: 'Info' }), description: text, duration: 4000 }); }}
      className="inline-flex items-center ml-1.5 cursor-help group opacity-70 hover:opacity-100 transition-opacity" type="button"
    >
      <Info className="w-3.5 h-3.5 text-sky-400" />
    </button>
  );
};

const ActivityTooltip = ({ active, payload, label, isLight }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800 shadow-2xl'} min-w-[100px]`}>
        <p className={`text-[9px] font-black mb-1 opacity-50 uppercase tracking-tighter ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <div className="space-y-0.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-[11px] font-bold" style={{ color: entry.color }}>
                {entry.name} : {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label, isLight = false, t }) => {
  if (active && payload && payload.length) {
    const totalValue = payload.find(p => p.dataKey === 'total')?.value ||
      payload.reduce((acc, curr) => acc + (typeof curr.value === 'number' ? curr.value : 0), 0);
    return (
      <div className={`${isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-700'} backdrop-blur border p-3 rounded-lg shadow-xl text-xs z-50 min-w-[160px]`}>
        <p className={`font-bold ${isLight ? 'text-slate-800 border-slate-200' : 'text-slate-200 border-slate-700'} mb-2 border-b pb-1`}>{label}</p>
        <div className="flex justify-between mb-2">
          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{t('admin.leaderboard.total')}</span>
          <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold`}>{totalValue}</span>
        </div>
        <div className="space-y-1">
          {payload.slice().reverse().map((p, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }}></div>
                <span className="capitalize font-medium" style={{ color: p.color || p.fill }}>
                  {p.name === 'complaint' ? t('feedbackDetail.types.complaint') : p.name === 'suggestion' ? t('feedbackDetail.types.suggestion') : p.name === 'evaluation' ? t('feedbackDetail.types.evaluation') : p.name}
                </span>
              </div>
              <span className="font-mono font-bold" style={{ color: p.color || p.fill }}>{formatNumber(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value, previousValue, icon: Icon, colorClass, suffix = "", inverseTrend = false, hideTrend = false, t }) => {
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
  const { display: formattedValue } = formatCompactNumber(numericValue);
  const displayValue = `${formattedValue}${suffix}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all group flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1" translate="no">
            {displayValue}
          </h3>
        </div>
        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${colorClass}`}><Icon className="h-5 w-5" /></div>
      </div>

      <div className="flex items-center gap-2 min-h-[22px]">
        {hideTrend ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50">
            <div className="w-1 h-1 rounded-full bg-slate-500 animate-pulse" />
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">{t('customer.all')}</span>
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
              {percentChange === Infinity ? t('admin.dashboard.metrics.newData') : t('admin.dashboard.metrics.vsLastPeriod')}
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
          <div className={`text-2xl font-extrabold ${color1}`} translate="no">%{value1}</div>
        </div>

        <div className="w-px h-10 bg-slate-800 rotate-[15deg] self-center opacity-50" />

        <div className="flex-1 text-right">
          <p className="text-[9px] text-slate-500 uppercase font-medium mb-1">{label2}</p>
          <div className={`text-2xl font-extrabold ${color2}`} translate="no">%{value2}</div>
        </div>
      </div>
    </div>
  );
};

// 🟢 ŞUBE DETAY MODALI
const BranchDetailModal = ({ isOpen, onClose, branch, branchesFeedbacks = [], isLight = false, t, i18n }) => {
  const insight = useMemo(() => getSmartInsight(branch || {}, t), [branch, t]);
  const InsightIcon = insight.icon;

  const perception = Number(branch?.brandPerception || 0);
  const experience = Number(branch?.instantExperience || 0);
  const perceptionGap = perception - experience;

  // Çakışma Kontrolü
  const isOverlap = Math.abs(perceptionGap) < 5;

  let gapStatus = { text: t('common.perfectMatch'), color: "text-green-400", barColor: "bg-green-500" };
  if (perceptionGap > 20) gapStatus = { text: t('admin.analytics.brandVsExperience.brandRisk'), color: "text-red-400", barColor: "bg-red-500" };
  else if (perceptionGap < -5) gapStatus = { text: t('admin.analytics.brandVsExperience.brandSuccess'), color: "text-emerald-400", barColor: "bg-emerald-400" };

  // 🟢 DEMOGRAFİK ANALİZ (MODAL İÇİN)
  const ageData = useMemo(() => {
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const counts = { '18-': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    branchesFeedbacks.forEach(f => {
      if (f.customer_age_group && counts[f.customer_age_group] !== undefined) {
        counts[f.customer_age_group]++;
      }
    });
    return ageGroups.map(name => ({ name, value: counts[name] }));
  }, [branchesFeedbacks]);

  const ageSentiment = useMemo(() => {
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
  }, [branchesFeedbacks]);

  // Şube saatlik yaş aktivitesi
  const branchHourlyAge = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];
    const bStats = hours.map(h => {
      const entry = { hour: `${h}:00` };
      ageGroups.forEach(age => { entry[age] = 0; });
      return entry;
    });
    branchesFeedbacks.forEach(f => {
      if (f.customer_age_group && ageGroups.includes(f.customer_age_group)) {
        const h = new Date(f.created_at).getHours();
        bStats[h][f.customer_age_group]++;
      }
    });
    return bStats;
  }, [branchesFeedbacks]);

  if (!isOpen || !branch) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-700'} w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>

        <div className={`${isLight ? 'bg-slate-50' : 'bg-slate-900/80'} backdrop-blur p-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex justify-between items-start sticky top-0 z-10`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{branch.name}</h2>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                <span>{t('admin.branchCard.score')}:</span>
                <span className={Number(branch.vocalizeScore) >= 80 ? 'text-amber-500' : (isLight ? 'text-slate-900' : 'text-white')}>{branch.vocalizeScore}</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> {t('admin.branchCard.title')}
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
                <h3 className="font-bold text-lg mb-1.5">{t('admin.sidebar.analytics')}: {insight.title}</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium mb-2">{insight.desc}</p>
                {insight.suggestion && (
                  <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                    <span className="font-bold">{t('admin.insights.suggestion')}: </span>
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
                <Zap className="w-4 h-4 text-sky-400" /> {t('admin.analytics.brandVsExperience.title')}
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
                    <span className={`absolute -top-8 text-[9px] ${isLight ? 'text-slate-600 bg-white border-slate-200' : 'text-slate-500 bg-slate-900 border-slate-800'} font-bold uppercase tracking-tighter px-1 py-0.5 rounded border whitespace-nowrap`}>{t('admin.analytics.brandVsExperience.brandPerception')}</span>
                    <div className={`w-4 h-4 rounded-full ${isLight ? 'bg-white border-slate-100' : 'bg-slate-800'} border-4 border-yellow-500 shadow-lg`}></div>
                    <span className="absolute -bottom-6 text-[10px] font-bold text-yellow-500">{perception}</span>
                  </div>

                  {/* Deneyim Noktası */}
                  <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20" style={{ left: `${experience}%`, transform: 'translate(-50%, -50%)' }}>
                    <span className={`absolute -top-8 text-[9px] text-sky-500 font-bold uppercase tracking-tighter ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} px-1 py-0.5 rounded border whitespace-nowrap`}>{t('admin.analytics.brandVsExperience.instantExperience')}</span>
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
                  ? t('admin.branchDetail.perfectMatch')
                  : t('admin.branchDetail.gapDesc')}
              </p>
            </div>
          </div>

          {/* DİĞER VERİLER (GRID) */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-green-500">%{branch.happyRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('admin.branchCard.happy')}</span>
            </div>
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-yellow-500">%{branch.neutralRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('admin.branchCard.neutral')}</span>
            </div>
            <div className={`${isLight ? 'bg-slate-100/50 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl font-bold text-red-500">%{branch.riskyRate}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('admin.branchCard.unhappy')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`flex items-center justify-between p-4 ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl border`}>
              <div className="flex flex-col">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('admin.branchCard.mapRedirects')}</span>
                <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-xl`}>{branch.googleClicks} <span className="text-sm font-normal text-slate-500">{t('admin.branchCard.person')}</span></span>
              </div>
              <div className={`p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800'} rounded-lg text-red-500 shadow-sm`}><MapPin className="w-5 h-5" /></div>
            </div>
            <div className={`flex items-center justify-between p-4 ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl border`}>
              <div className="flex flex-col">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-medium`}>{t('admin.branchCard.resolutionSpeed')}</span>
                <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-xl`}>%{branch.operationScore}</span>
              </div>
              <div className={`p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800'} rounded-lg text-green-500 shadow-sm`}><CheckCircle className="w-5 h-5" /></div>
            </div>
          </div>

          {/* Şube Saatlik Analiz (YENİ) */}
          <div className={`mt-4 ${isLight ? 'bg-slate-100/30 border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} p-4 rounded-xl border transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('admin.analytics.activityByTime.title')}</p>
              </div>
              <InfoTooltip t={t} text={t('admin.analytics.activityByTime.desc')} />
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchHourlyAge} margin={{ left: -30, bottom: -10 }}>
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
                    shared={false}
                    cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="18-" stackId="a" fill={COLORS.purple} filter="url(#modalBarShadow)" />
                  <Bar dataKey="18-24" stackId="a" fill={COLORS.primary} filter="url(#modalBarShadow)" />
                  <Bar dataKey="25-34" stackId="a" fill={COLORS.success} filter="url(#modalBarShadow)" />
                  <Bar dataKey="35-44" stackId="a" fill={COLORS.warning} filter="url(#modalBarShadow)" />
                  <Bar dataKey="45-54" stackId="a" fill={COLORS.danger} filter="url(#modalBarShadow)" />
                  <Bar dataKey="55+" stackId="a" fill={COLORS.slate} radius={[2, 2, 0, 0]} filter="url(#modalBarShadow)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 👥 ŞUBE DEMOGRAFİK ANALİZ (YENİ) */}
          <div className={`border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} pt-6`}>
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'} mb-4 flex items-center gap-2`}>
              <Users className="w-4 h-4 text-indigo-400" /> {t('admin.analytics.demographic.title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yaş Dağılımı */}
              <div className={`${isLight ? 'bg-slate-100/30' : 'bg-slate-900/50'} p-4 rounded-xl border ${isLight ? 'border-slate-200' : 'border-slate-800'} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('admin.analytics.demographic.audienceDistribution')}</p>
                  <InfoTooltip t={t} text={t('admin.analytics.demographic.audienceDesc')} />
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
                            <span style={{ color, fontWeight: 'bold' }}>{val} {t('admin.analytics.demographic.transaction')}</span>,
                            <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontWeight: 'bold' }}>{t('admin.analytics.demographic.group', { name: props.payload.name })}</span>
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
                  <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-500'} uppercase font-bold`}>{t('admin.analytics.demographic.brandLoyaltyScore')}</p>
                  <InfoTooltip t={t} text={t('admin.analytics.demographic.brandLoyaltyDesc')} />
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
                            <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontWeight: 'bold' }}>{t('feedbackDetail.detail.evaluationScore')}</span>
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
                {t('admin.analytics.demographic.mostActiveGroup')} <span className="font-bold underline text-white">{[...ageData].sort((a, b) => b.value - a.value)[0]?.name || '-'}</span>
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
  const { t, i18n } = useTranslation();
  const { businessId, selectedBranchId, businessCreatedAt } = useAdminContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [prevFeedbacks, setPrevFeedbacks] = useState([]);
  const [serverFeedbackCount, setServerFeedbackCount] = useState(null);
  const [serverPrevFeedbackCount, setServerPrevFeedbackCount] = useState(null);
  const [trafficStats, setTrafficStats] = useState({ visits: 0, conversionRate: 0, qrCount: 0, webCount: 0, googleRedirects: 0 });
  const [trendViewMode, setTrendViewMode] = useState('total');
  const [audienceViewMode, setAudienceViewMode] = useState('filtered');

  const [totalAgeStats, setTotalAgeStats] = useState({ data: [], total: 0 });

  const [selectedModalBranch, setSelectedModalBranch] = useState(null);

  // 🟢 ŞUBE LİGİ SAYFALAMA & ARAMA (Enterprise 300+ şube desteği)
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [allBranches, setAllBranches] = useState([]); // 🟢 Veri olsun olmasın tüm şubeler
  const leaderboardItemsPerPage = 20;

  const [dateRange, setDateRange] = useState({ from: new Date(2020, 0, 1), to: new Date() });
  const [preset, setPreset] = useState('allTime');
  const [isLight, setIsLight] = useState(localStorage.getItem('acta_theme') === 'light');

  useEffect(() => {
    const handleThemeChange = () => {
      setIsLight(localStorage.getItem('acta_theme') === 'light');
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

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
      toast({ variant: "destructive", title: t('admin.feedbacks.fetchErrorTitle'), description: t('admin.feedbacks.fetchErrorDesc') });
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
    const locale = i18n.language.startsWith('tr') ? tr : enUS;

    while (currentDate <= dateRange.to) {
      const dayKey = format(currentDate, 'dd MMM', { locale });
      dailyMap[dayKey] = { name: dayKey, total: 0, complaint: 0, suggestion: 0, evaluation: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    feedbacks.forEach(f => {
      const day = format(parseISO(f.created_at), 'dd MMM', { locale });
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
      { label: t('admin.analytics.satisfaction.positive'), count: positive, percent: ((positive / total) * 100).toFixed(1), color: COLORS.success },
      { label: t('admin.analytics.satisfaction.neutral'), count: neutral, percent: ((neutral / total) * 100).toFixed(1), color: COLORS.warning },
      { label: t('admin.analytics.satisfaction.negative'), count: negative, percent: ((negative / total) * 100).toFixed(1), color: COLORS.danger }
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

  // 4. Saatlik Yaş Bazlı Aktivite
  const hourlyAgeStats = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const ageGroups = ['18-', '18-24', '25-34', '35-44', '45-54', '55+'];

    // Initialize structure
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

    return stats;
  }, [feedbacks]);

  const sourceData = useMemo(() => [
    { name: t('admin.analytics.traffic.qrScans'), value: trafficStats.qrCount, color: COLORS.success },
    { name: t('admin.analytics.traffic.webLink'), value: trafficStats.webCount, color: COLORS.primary }
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
        ageCounts: {}
      };
    });

    feedbacks.forEach(f => {
      const bName = f.branches?.branch_name_tr || t('admin.branchDetail.unknown');
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
          ageCounts: {}
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
      name: feedbacks[0].branches?.branch_name_tr || t('admin.branchDetail.selectedBranch'),
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
      ageCounts: {}
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
              {t('admin.title')}
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              {t('admin.subtitle')}
            </p>
          </div>
          <div className="w-full lg:w-auto z-20">
            <DateRangePicker date={dateRange} setDate={setDateRange} preset={preset} setPreset={setPreset} />
          </div>
        </div>

        {/* KPI KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard
            title={t('admin.metrics.totalInteraction')}
            value={kpi.curr.total}
            previousValue={kpi.prev.total}
            icon={Activity}
            colorClass="text-sky-400 group-hover:text-sky-300"
            hideTrend={preset === 'allTime'}
            t={t}
          />
          <KpiCard
            title={t('admin.metrics.uniqueUsers')}
            value={kpi.curr.uniqueUsers}
            previousValue={kpi.prev.uniqueUsers}
            icon={Users}
            colorClass="text-indigo-400 group-hover:text-indigo-300"
            hideTrend={preset === 'allTime'}
            t={t}
          />
          <KpiCard
            title={t('admin.metrics.loyaltyScore')}
            value={kpi.curr.loyaltyScore}
            previousValue={kpi.prev.loyaltyScore}
            icon={Heart}
            suffix="/100"
            colorClass="text-pink-400 group-hover:text-pink-300"
            hideTrend={preset === 'allTime'}
            t={t}
          />
          <SplitKpiCard
            title={t('admin.metrics.operationalPerformance')}
            label1={t('admin.metrics.resolutionSuccess')}
            value1={kpi.curr.resolvedRate}
            icon1={CheckCircle}
            color1="text-emerald-400"
            label2={t('admin.metrics.pendingComplaints')}
            value2={kpi.curr.pendingComplaintRate}
            icon2={AlertTriangle}
            color2="text-rose-400"
          />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium animate-pulse">{t('admin.metrics.calculating')}</p>
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
                      {t('admin.trends.title')}
                    </h3>
                    <div className={`flex ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0f172a] border-slate-800'} p-1 rounded-lg border shrink-0`}>
                      <button onClick={() => setTrendViewMode('total')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('admin.trends.general')}</button>
                      <button onClick={() => setTrendViewMode('breakdown')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendViewMode === 'breakdown' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('admin.trends.detailed')}</button>
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
                          <Area type="monotone" dataKey="total" name={t('admin.sidebar.feedbacks')} stroke={COLORS.primary} strokeWidth={3} fill="url(#colorTrend)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} vertical={false} opacity={0.4} />
                          <XAxis dataKey="name" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                          <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip isLight={isLight} t={t} />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', color: isLight ? '#475569' : '#94a3b8' }} iconType="circle" iconSize={8} formatter={(value) => <span className="mr-4">{value}</span>} />
                          <Bar dataKey="complaint" name={t('feedbackDetail.types.complaint')} stackId="a" fill={COLORS.danger} barSize={20} />
                          <Bar dataKey="suggestion" name={t('feedbackDetail.types.suggestion')} stackId="a" fill={COLORS.primary} barSize={20} />
                          <Bar dataKey="evaluation" name={t('feedbackDetail.types.evaluation')} stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col justify-between transition-all`}>
                  <div>
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                      <Zap className="w-5 h-5 text-yellow-400" />
                      {t('admin.analytics.brandVsExperience.title')}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 mb-8">
                      {t('admin.analytics.brandVsExperience.desc')}
                    </p>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{t('admin.analytics.brandVsExperience.brandPerception')}</span>
                          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{loyaltyComparison.general}%</span>
                        </div>
                        <div className={`detail-analytics-bar-wrap h-4 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-700/50'} rounded-full border`}>
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${loyaltyComparison.general}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{t('admin.analytics.brandVsExperience.instantExperience')}</span>
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
                        ? t('admin.analytics.brandVsExperience.brandRisk')
                        : t('admin.analytics.brandVsExperience.brandSuccess')}
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
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.traffic.title')}</h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs text-balance`}>{t('admin.analytics.traffic.desc')}</p>
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
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{name === 'QR Kod' ? t('admin.analytics.traffic.qrScans') : t('admin.analytics.traffic.webLink')}</span>
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={`text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatNumber(trafficStats.visits)}</span>
                        <span className={`text-[8px] ${isLight ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tighter`}>{t('admin.analytics.traffic.visits')}</span>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                      <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col items-center text-center justify-center`}>
                        <QrCode className="w-4 h-4 text-green-500 mb-1" />
                      <span className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-none`} translate="no">{trafficStats.qrCount}</span>
                        <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'} mt-1 whitespace-nowrap`}>{t('admin.analytics.traffic.qrScans')}</span>
                      </div>
                      <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800/50'} flex flex-col items-center text-center justify-center`}>
                        <LinkIcon className="w-4 h-4 text-sky-500 mb-1" />
                      <span className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-none`} translate="no">{trafficStats.webCount}</span>
                        <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'} mt-1 whitespace-nowrap`}>{t('admin.analytics.traffic.webLink')}</span>
                      </div>
                      <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 flex flex-col items-center text-center justify-center group relative cursor-help">
                        <div className="absolute top-1 right-1"><InfoTooltip t={t} text={t('admin.analytics.traffic.desc')} /></div>
                        <Activity className="w-4 h-4 text-purple-400 mb-1" />
                      <span className="text-base font-bold text-white leading-none" translate="no">%{trafficStats.conversionRate}</span>
                        <span className="text-[9px] text-purple-300 mt-1 whitespace-nowrap">{t('admin.analytics.traffic.conversion')}</span>
                      </div>
                      <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex flex-col items-center text-center justify-center cursor-help relative">
                        <div className="absolute top-1 right-1"><InfoTooltip t={t} text={t('admin.analytics.traffic.desc')} /></div>
                        <MapPin className="w-4 h-4 text-red-400 mb-1" />
                      <span className="text-base font-bold text-white leading-none" translate="no">{trafficStats.googleRedirects}</span>
                        <span className="text-[9px] text-red-300 mt-1 whitespace-nowrap">{t('admin.analytics.traffic.maps')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`lg:col-span-2 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 transition-all`}>
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                        {t('admin.analytics.satisfaction.title')}
                        <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} font-normal text-xs ml-1`}>({t('admin.leaderboard.total')}: {formatNumber(serverFeedbackCount)})</span>
                      </h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('admin.analytics.satisfaction.desc')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    {sentimentData.map((item, idx) => (
                      <div key={idx} className="flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-medium text-slate-300">{item.label}</span>
                          <div className="text-right leading-none">
                            <span className="text-xl font-bold text-white" translate="no">%{item.percent}</span>
                            <span className="text-[10px] text-slate-500 uppercase ml-2 tracking-tighter">({item.count} {t('admin.analytics.demographic.transaction')})</span>
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
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.activityByTime.title')}</h3>
                        <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('admin.analytics.activityByTime.desc')}</p>
                      </div>
                    </div>
                    <InfoTooltip t={t} text={t('admin.analytics.activityByTime.desc')} />
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyAgeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          shared={false}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: isLight ? '#475569' : '#94a3b8' }} />
                        <Bar dataKey="18-" stackId="a" fill={COLORS.purple} filter="url(#barShadow)" />
                        <Bar dataKey="18-24" stackId="a" fill={COLORS.primary} filter="url(#barShadow)" />
                        <Bar dataKey="25-34" stackId="a" fill={COLORS.success} filter="url(#barShadow)" />
                        <Bar dataKey="35-44" stackId="a" fill={COLORS.warning} filter="url(#barShadow)" />
                        <Bar dataKey="45-54" stackId="a" fill={COLORS.danger} filter="url(#barShadow)" />
                        <Bar dataKey="55+" stackId="a" fill={COLORS.slate} radius={[4, 4, 0, 0]} filter="url(#barShadow)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
                  <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t('admin.analytics.demographic.title')}</h2>
                  <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>{t('admin.analytics.demographic.subtitle')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Yaş Dağılımı (Mevcut) */}
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col transition-all`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.demographic.audienceDistribution')}</h3>
                      <InfoTooltip t={t} text={t('admin.analytics.demographic.audienceDesc')} />
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-900/50 border border-slate-800 rounded-lg self-end sm:self-auto">
                      <button
                        onClick={() => setAudienceViewMode('filtered')}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${audienceViewMode === 'filtered' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t('admin.analytics.demographic.filter')}
                      </button>
                      <button
                        onClick={() => setAudienceViewMode('all')}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${audienceViewMode === 'all' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t('admin.analytics.demographic.all')}
                      </button>
                    </div>
                  </div>
                  {audienceViewMode === 'filtered' && liveAudience.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-900/30 border border-green-800 rounded text-[10px] text-green-400 animate-pulse w-max mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {t('admin.analytics.demographic.liveStream')}
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
                                <span style={{ color }}>{value} {t('admin.branchCard.person')}</span>,
                                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{t('admin.analytics.demographic.age', { name })}</span>
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
                      <p className="text-sm">{t('admin.analytics.demographic.noData')}</p>
                    </div>
                  )}
                </div>

                {/* 2. Yaş vs Memnuniyet (Brand Loyalty) */}
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'} border rounded-2xl p-6 flex flex-col transition-all`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.demographic.brandLoyaltyScore')}</h3>
                    <InfoTooltip t={t} text={t('admin.analytics.demographic.brandLoyaltyDesc')} />
                  </div>
                  <p className="text-slate-400 text-xs mb-6">{t('admin.analytics.demographic.brandLoyaltyDesc')}</p>
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
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{t('admin.dashboard.metrics.avgRating')}</span>
                            ];
                          }}
                        />
                    <Bar dataKey="score" name={t('feedbackDetail.detail.evaluationScore')} barSize={12} radius={[0, 4, 4, 0]}>
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
                    <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.demographic.formDistribution')}</h3>
                    <InfoTooltip t={t} text={t('admin.analytics.demographic.formDistributionDesc')} />
                  </div>
                  <p className="text-slate-400 text-xs mb-6">{t('admin.analytics.demographic.formDistributionDesc')}</p>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageCategoryData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip isLight={isLight} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: isLight ? '#475569' : '#94a3b8' }} />
                          <Bar dataKey="complaint" name={t('feedbackDetail.types.complaint')} stackId="a" fill={COLORS.danger} barSize={20} />
                          <Bar dataKey="suggestion" name={t('feedbackDetail.types.suggestion')} stackId="a" fill={COLORS.primary} barSize={20} />
                          <Bar dataKey="review" name={t('feedbackDetail.types.evaluation')} stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
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
                      <h3 className={`${isLight ? 'text-slate-900' : 'text-white'} font-bold text-lg`}>{t('admin.analytics.leaderboard.title')}</h3>
                      <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs`}>{t('admin.analytics.leaderboard.subtitle')} ({leaderboardData.length} {t('admin.header.selectBranch')})</p>
                    </div>
                  </div>

                  {/* 🔍 ARAMA KUTUSU */}
                  <div className="relative w-full md:w-64">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      placeholder={t('admin.analytics.leaderboard.searchPlaceholder')}
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'} border rounded-lg text-sm ${isLight ? 'text-slate-900' : 'text-white'} placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors`}
                    />
                  </div>
                </div>

                {/* AĞIRLIK LEJANTI */}
                <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800/50'} p-2 rounded-lg border mb-4`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1"><Scale className="w-3 h-3" /> {t('admin.analytics.leaderboard.calculationWeight')}:</span>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('admin.analytics.leaderboard.qualityWeight')}</span>
                      <InfoTooltip t={t} text={t('admin.analytics.leaderboard.quality')} />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('admin.analytics.leaderboard.operationWeight')}</span>
                      <InfoTooltip t={t} text={t('admin.analytics.leaderboard.resolution')} />
                    </div>
                    <div className="flex items-center gap-1.5 cursor-help group">
                      <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-110 transition-transform"></div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'} font-medium transition-colors`}>{t('admin.analytics.leaderboard.dataWeight')}</span>
                      <InfoTooltip t={t} text={t('admin.analytics.leaderboard.total')} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4 relative z-0">
                  <table className="branch-league-table w-full min-w-[800px] text-left text-sm text-slate-400 border-collapse">
                    <thead className={`${isLight ? 'bg-slate-100/50' : 'bg-[#0f172a]'} text-xs uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'} tracking-wider`}>
                      <tr>
                        <th className={`px-6 py-4 rounded-l-lg border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>{t('admin.analytics.leaderboard.rank')}</th>
                        <th className={`px-6 py-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>{t('admin.analytics.leaderboard.branchName')}</th>
                        <th className={`px-6 py-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} text-center`}>
                          <div className="flex items-center justify-center gap-1">{t('admin.analytics.leaderboard.total')} <MessageSquare className="w-3 h-3 text-slate-500" /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} ${isLight ? 'bg-slate-100/30' : 'bg-slate-900/50'} text-sky-500 cursor-help`}>
                          <div className="flex items-center justify-center gap-1">🏆 {t('admin.analytics.leaderboard.leagueScore')} <InfoTooltip t={t} text={t('admin.analytics.leaderboard.leagueScore')} /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} cursor-help`}>
                          <div className="flex items-center justify-center gap-1">⭐ {t('admin.analytics.leaderboard.quality')} <InfoTooltip t={t} text={t('admin.analytics.leaderboard.quality')} /></div>
                        </th>
                        <th className={`px-6 py-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/50'} cursor-help`}>
                          <div className="flex items-center justify-center gap-1">⚡ {t('admin.analytics.leaderboard.resolution')} <InfoTooltip t={t} text={t('admin.analytics.leaderboard.resolution')} /></div>
                        </th>
                        <th className="px-6 py-4 text-center rounded-r-lg cursor-help">
                          <div className="flex items-center justify-center gap-1">👥 {t('admin.analytics.leaderboard.audience')} <InfoTooltip t={t} text={t('admin.analytics.leaderboard.audience')} /></div>
                        </th>
                        <th className="px-6 py-4 text-center rounded-r-lg cursor-help">
                          <div className="flex items-center justify-center gap-1">🗺️ {t('admin.analytics.leaderboard.map')} <InfoTooltip t={t} text={t('admin.analytics.leaderboard.map')} /></div>
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
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-sky-400 transition-opacity">{t('admin.analytics.leaderboard.inspect')}</span>
                            </td>
                            <td className="px-6 py-4 border-r border-slate-800/50 text-center font-mono text-slate-300" translate="no">
                              {branch.total}
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50 bg-slate-900/30" translate="no">
                              <span className={`text-xl font-extrabold px-3 py-1 rounded-lg border ${Number(branch.vocalizeScore) >= 80 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-white border-slate-700 bg-slate-800'}`}>
                                {branch.vocalizeScore}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50" translate="no">
                              <span className="text-slate-300 font-bold">{branch.qualityScore}</span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50" translate="no">
                              <span className={`font-bold ${Number(branch.operationScore) < 50 ? 'text-red-400' : 'text-green-400'}`}>%{branch.operationScore}</span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-800/50" translate="no">
                              <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-teal-400 border border-slate-700">{branch.dominantAge}</span>
                            </td>
                            <td className="px-6 py-4 text-center" translate="no">
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
                      {leaderboardSearch ? `"${leaderboardSearch}" ${t('admin.analytics.leaderboard.noResult')}` : t('common.noData')}
                    </div>
                  )}
                </div>

                {/* 🟢 SAYFALAMA KONTROLLARI */}
                {leaderboardTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-500">
                      {t('admin.analytics.leaderboard.showingRange', {
                        total: filteredLeaderboard.length,
                        start: (leaderboardPage - 1) * leaderboardItemsPerPage + 1,
                        end: Math.min(leaderboardPage * leaderboardItemsPerPage, filteredLeaderboard.length)
                      })}
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
                          {t('admin.branchCard.title')}: {singleBranchSummary.name}
                        </h3>
                        <p className="text-sm text-slate-200 font-semibold mb-1.5">
                          Vocalize: {insight.title}
                        </p>
                        <p className="text-sm opacity-90 leading-relaxed text-slate-200 mb-2">
                          {insight.desc}
                        </p>
                        {insight.suggestion && (
                          <p className="text-sm leading-relaxed font-semibold text-emerald-300">
                            <span className="font-bold">{t('admin.insights.suggestion')}: </span>
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
          t={t}
          i18n={i18n}
        />
      </div>
    </div>
  );
};

export default DetailedAnalytics;