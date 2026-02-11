import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import {
    MessageSquare as MessageSquareText, AlertTriangle, TrendingUp, TrendingDown,
    Target, Heart, Activity, BarChart3, Clock, Star, CheckCircle2, Shield
} from 'lucide-react';

// ============================================================================
// DASHBOARD MOCKUP COMPONENT (Detaylı Analiz Temalı)
// ============================================================================

const DashboardMockup = React.memo(({ lang }) => {
    const [selectedBranch, setSelectedBranch] = useState('istanbul');
    const [activeTab, setActiveTab] = useState('analytics');
    const [selectedFeedback, setSelectedFeedback] = useState(null);

    // Demo data for different branches
    const branchData = {
        istanbul: {
            name: lang === 'tr' ? 'İstanbul Merkez' : 'Istanbul Main',
            totalReports: 127,
            loyaltyScore: 73,
            resolution: 72,
            pending: 34,
            brandPerception: 74,
            serviceExperience: 81,
            trendData: [45, 52, 48, 65, 71, 58, 62, 79, 68, 55, 72, 68, 74, 81, 76, 69, 72, 78, 82, 85],
            color: 'teal'
        },
        ankara: {
            name: lang === 'tr' ? 'Ankara Şubesi' : 'Ankara Branch',
            totalReports: 89,
            loyaltyScore: 68,
            resolution: 65,
            pending: 28,
            brandPerception: 69,
            serviceExperience: 75,
            trendData: [42, 48, 45, 58, 62, 54, 59, 71, 65, 52, 66, 62, 68, 75, 70, 64, 68, 72, 76, 79],
            color: 'orange'
        },
        izmir: {
            name: lang === 'tr' ? 'İzmir Şubesi' : 'Izmir Branch',
            totalReports: 156,
            loyaltyScore: 81,
            resolution: 85,
            pending: 12,
            brandPerception: 82,
            serviceExperience: 88,
            trendData: [58, 65, 62, 78, 84, 72, 79, 92, 86, 75, 89, 85, 91, 96, 92, 87, 91, 95, 98, 99],
            color: 'green'
        }
    };

    const branch = branchData[selectedBranch];
    const colorClasses = {
        teal: { bg: 'bg-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-400', icon: 'text-teal-400', hover: 'hover:border-teal-500/40' },
        orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-400', hover: 'hover:border-orange-500/40' },
        green: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-400', hover: 'hover:border-green-500/40' }
    };

    // Feedback Tab Data
    const feedbackMessages = [
        {
            id: 1,
            type: lang === 'tr' ? 'Şikayet' : 'Complaint',
            author: 'Müşteri A. / Customer A.',
            rating: 2,
            status: lang === 'tr' ? 'Çözümde' : 'In Progress',
            date: lang === 'tr' ? '2 saat önce' : '2 hours ago',
            title: lang === 'tr' ? 'Yavaş Servis' : 'Slow Service',
            message: lang === 'tr' ? 'Akşam saatlerinde personel yetersiz. Ana yemeği alana kadar 45 dakika bekledik.' : 'Evening service was understaffed. We waited 45 minutes for the main course.',
            color: 'red'
        },
        {
            id: 2,
            type: lang === 'tr' ? 'Öneri' : 'Suggestion',
            author: 'Müşteri B. / Customer B.',
            rating: 4,
            status: lang === 'tr' ? 'Beklemede' : 'Pending',
            date: lang === 'tr' ? '4 saat önce' : '4 hours ago',
            title: lang === 'tr' ? 'Menü Çeşitliliği' : 'Menu Variety',
            message: lang === 'tr' ? 'Vegan seçenekler eklenirse çok iyi olur. Arkadaşları da gelmek istiyor ama seçenekleri kısıtlı.' : 'Would be great to have more vegan options. Friends want to join but options are limited.',
            color: 'blue'
        },
        {
            id: 3,
            type: lang === 'tr' ? 'Değerlendirme' : 'Evaluation',
            author: 'Müşteri C. / Customer C.',
            rating: 5,
            status: lang === 'tr' ? 'Sonuçlandı' : 'Resolved',
            date: lang === 'tr' ? 'Dün' : 'Yesterday',
            title: lang === 'tr' ? 'Mükemmel Deneyim' : 'Excellent Experience',
            message: lang === 'tr' ? 'Samimi ortam, lezzetli yemekler ve çok ilgili personel. Sonrasında daha da iyiye gidebilir derseniz, tatlı seçenekleri biraz daha fazla olabilir.' : 'Warm atmosphere, delicious food and attentive staff. Overall excellent, though dessert options could be expanded.',
            color: 'green'
        }
    ];

    // Performance League Data
    const performanceLeague = [
        {
            id: 'istanbul',
            name: lang === 'tr' ? 'İstanbul Merkez' : 'Istanbul Main',
            rank: 1,
            score: 92,
            trend: 'up',
            performance: lang === 'tr' ? 'Mükemmel' : 'Excellent',
            scorecard: lang === 'tr' ? '✓ Müşteri Memnuniyeti: 94%\n✓ Personel Performansı: 90%\n✓ Hizmet Hızı: 88%\n✓ Ürün Kalitesi: 95%' : '✓ Customer Satisfaction: 94%\n✓ Staff Performance: 90%\n✓ Service Speed: 88%\n✓ Product Quality: 95%'
        },
        {
            id: 'ankara',
            name: lang === 'tr' ? 'Ankara Şubesi' : 'Ankara Branch',
            rank: 3,
            score: 68,
            trend: 'down',
            performance: lang === 'tr' ? 'DüşükAlarm' : 'Needs Attention',
            scorecard: lang === 'tr' ? '⚠ Müşteri Memnuniyeti: 65%\n⚠ Personel Performansı: 62%\n✓ Hizmet Hızı: 79%\n⚠ Ürün Kalitesi: 68%' : '⚠ Customer Satisfaction: 65%\n⚠ Staff Performance: 62%\n✓ Service Speed: 79%\n⚠ Product Quality: 68%'
        },
        {
            id: 'izmir',
            name: lang === 'tr' ? 'İzmir Şubesi' : 'Izmir Branch',
            rank: 2,
            score: 85,
            trend: 'up',
            performance: lang === 'tr' ? 'İyi' : 'Good',
            scorecard: lang === 'tr' ? '✓ Müşteri Memnuniyeti: 88%\n✓ Personel Performansı: 82%\n✓ Hizmet Hızı: 85%\n✓ Ürün Kalitesi: 87%' : '✓ Customer Satisfaction: 88%\n✓ Staff Performance: 82%\n✓ Service Speed: 85%\n✓ Product Quality: 87%'
        }
    ];

    const colors = colorClasses[branch.color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative mt-16 max-w-6xl mx-auto"
        >
            {/* Mockup Container with enhanced 3D effect */}
            <div className="relative transform perspective-1200 hover:scale-[1.01] transition-all duration-700">
                <div
                    className="bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/95 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl p-4 md:p-8 transform"
                    style={{
                        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 80px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Browser-style Header */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="flex gap-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-yellow-500"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-green-500"></div>
                        </div>
                        <div className="ml-6 flex-1 flex items-center gap-2 bg-slate-900/60 rounded-lg px-4 py-2 border border-slate-700/50">
                            <Shield className="w-4 h-4 text-green-400" />
                            <span className="text-slate-400 text-xs font-medium">vocalize.global/analytics</span>
                        </div>
                    </div>

                    {/* Branch Selector */}
                    <div className="mb-6 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-slate-400">
                            {lang === 'tr' ? 'Şube:' : 'Branch:'}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(branchData).map(([key, data]) => {
                                const getButtonClasses = () => {
                                    if (selectedBranch === key) {
                                        if (data.color === 'teal') return 'bg-teal-500/20 text-teal-400 border border-teal-500/40';
                                        if (data.color === 'orange') return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
                                        if (data.color === 'green') return 'bg-green-500/20 text-green-400 border border-green-500/40';
                                    }
                                    return 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:border-slate-600/50';
                                };

                                return (
                                    <motion.button
                                        key={key}
                                        onClick={() => setSelectedBranch(key)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${getButtonClasses()}`}
                                    >
                                        {data.name.split(' ')[0]}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mb-6 flex gap-2 border-b border-slate-700/50 overflow-x-auto pb-1">
                        {[
                            { id: 'analytics', label: lang === 'tr' ? 'Analitikler' : 'Analytics', icon: '📊' },
                            { id: 'feedback', label: lang === 'tr' ? 'Geri Bildirimler' : 'Feedback', icon: '💬' },
                            { id: 'performance', label: lang === 'tr' ? 'Performans Ligi' : 'Performance', icon: '🏆' }
                        ].map(tab => (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-teal-500 text-teal-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </motion.button>
                        ))}
                    </div>
                    {/* Dashboard Content */}
                    <div className="space-y-6">
                        {activeTab === 'analytics' && (
                            <div className="space-y-6">
                                {/* Top Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {[
                                        {
                                            label: lang === 'tr' ? 'Toplam Bildirim' : 'Total Reports',
                                            value: `${branch.totalReports}`,
                                            change: '+8%',
                                            icon: MessageSquareText,
                                            color: 'teal',
                                            trend: 'up',
                                            data: branch.totalReports
                                        },
                                        {
                                            label: lang === 'tr' ? 'Sadakat Skoru' : 'Loyalty Score',
                                            value: `${branch.loyaltyScore}/100`,
                                            change: '+5%',
                                            icon: Heart,
                                            color: 'rose',
                                            trend: 'up',
                                            data: branch.loyaltyScore
                                        },
                                        {
                                            label: lang === 'tr' ? 'Çözüm Başarısı' : 'Resolution Rate',
                                            value: `${branch.resolution}%`,
                                            change: '+12%',
                                            icon: Target,
                                            color: 'green',
                                            trend: 'up',
                                            data: branch.resolution
                                        },
                                        {
                                            label: lang === 'tr' ? 'Bekleyen Şikayet' : 'Pending Issues',
                                            value: `${branch.pending}`,
                                            change: '-15%',
                                            icon: AlertTriangle,
                                            color: 'orange',
                                            trend: 'down',
                                            data: branch.pending
                                        }
                                    ].map((stat, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.4 + idx * 0.1 }}
                                            className={cn(
                                                "relative overflow-hidden rounded-xl p-4 border transition-all duration-300 group cursor-default",
                                                `bg-${stat.color}-500/5 border-${stat.color}-500/20 hover:border-${stat.color}-500/40`
                                            )}
                                        >
                                            {/* Animated Background Gradient */}
                                            <div className={cn(
                                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                                `bg-gradient-to-br from-${stat.color}-500/10 to-transparent`
                                            )} />

                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                                        {stat.label}
                                                    </span>
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                        `bg-${stat.color}-500/20 group-hover:bg-${stat.color}-500/30`
                                                    )}>
                                                        <stat.icon className={cn("w-4 h-4", `text-${stat.color}-400`)} />
                                                    </div>
                                                </div>
                                                <div className={cn("text-3xl font-bold mb-1", `text-${stat.color}-400`)}>
                                                    {stat.value}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {stat.trend === 'up' ? (
                                                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                                    ) : (
                                                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                                    )}
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                                                    )}>
                                                        {stat.change}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-1">
                                                        {lang === 'tr' ? 'geçen döneme göre' : 'vs last period'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Analytics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Trend Chart */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/40 hover:border-teal-500/30 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-white font-semibold text-sm mb-1">
                                                    {lang === 'tr' ? 'Bildirim Trendi' : 'Report Trend'}
                                                </h4>
                                                <p className="text-slate-500 text-xs">
                                                    {lang === 'tr' ? 'Son 30 gün' : 'Last 30 days'}
                                                </p>
                                            </div>
                                            <BarChart3 className="w-5 h-5 text-teal-400" />
                                        </div>

                                        {/* Simplified Trend Chart */}
                                        <div className="relative h-32 flex items-end gap-1.5">
                                            {branch.trendData.map((value, i) => {
                                                const height = value;
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${height}%` }}
                                                        transition={{ delay: 0.7 + i * 0.02, duration: 0.4 }}
                                                        className="flex-1 bg-gradient-to-t from-teal-500/60 to-teal-400/80 rounded-t-sm hover:from-teal-500 hover:to-teal-400 transition-all cursor-pointer"
                                                        title={`${value}%`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </motion.div>

                                    {/* Marka vs Deneyim Dağılımı */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 }}
                                        className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/40 hover:border-orange-500/30 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-white font-semibold text-sm mb-1">
                                                    {lang === 'tr' ? 'Marka vs Deneyim' : 'Brand vs Experience'}
                                                </h4>
                                                <p className="text-slate-500 text-xs">
                                                    {lang === 'tr' ? 'Müşteri algısı dağılımı' : 'Customer perception breakdown'}
                                                </p>
                                            </div>
                                            <Activity className="w-5 h-5 text-orange-400" />
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-2 text-xs">
                                                    <span className="text-slate-400 font-medium">
                                                        {lang === 'tr' ? 'Genel Algı (Marka)' : 'Brand Perception'}
                                                    </span>
                                                    <span className="text-orange-400 font-bold">{branch.brandPerception}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${branch.brandPerception}%` }}
                                                        transition={{ delay: 0.8, duration: 0.8 }}
                                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2 text-xs">
                                                    <span className="text-slate-400 font-medium">
                                                        {lang === 'tr' ? 'Anlık Deneyim (Hizmet)' : 'Service Experience'}
                                                    </span>
                                                    <span className="text-blue-400 font-bold">{branch.serviceExperience}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${branch.serviceExperience}%` }}
                                                        transition={{ delay: 0.9, duration: 0.8 }}
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Insight Note */}
                                        <div className="mt-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-green-300/90 text-xs leading-relaxed">
                                                {lang === 'tr'
                                                    ? 'Hizmet deneyimi marka algısının üzerinde - müşteri memnuniyeti yüksek!'
                                                    : 'Service experience exceeds brand perception - high customer satisfaction!'
                                                }
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Recent Activities */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="bg-slate-900/40 rounded-xl p-6 border border-slate-700/30"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-white font-semibold text-sm">
                                            {lang === 'tr' ? 'Son Aktiviteler' : 'Recent Activities'}
                                        </h4>
                                        <Clock className="w-4 h-4 text-slate-500" />
                                    </div>

                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.9 + i * 0.1 }}
                                                className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-teal-500/30 hover:bg-slate-800/60 transition-all cursor-pointer group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Activity className="w-5 h-5 text-teal-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-2.5 bg-slate-700/60 rounded w-3/4 mb-2 group-hover:bg-slate-700 transition-colors"></div>
                                                    <div className="h-2 bg-slate-700/40 rounded w-1/2 group-hover:bg-slate-700/60 transition-colors"></div>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    {i * 5}m
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* FEEDBACK TAB */}
                        {activeTab === 'feedback' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                {feedbackMessages.map((feedback, idx) => (
                                    <motion.div
                                        key={feedback.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => setSelectedFeedback(feedback)}
                                        className={cn(
                                            'p-4 rounded-lg border cursor-pointer transition-all group hover:scale-[1.02]',
                                            feedback.color === 'red' && `bg-red-500/10 border-red-500/30 hover:border-red-500/50`,
                                            feedback.color === 'blue' && `bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50`,
                                            feedback.color === 'green' && `bg-green-500/10 border-green-500/30 hover:border-green-500/50`
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={cn(
                                                    'w-3 h-3 rounded-full flex-shrink-0',
                                                    feedback.color === 'red' && 'bg-red-500',
                                                    feedback.color === 'blue' && 'bg-blue-500',
                                                    feedback.color === 'green' && 'bg-green-500'
                                                )} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            'text-xs font-bold',
                                                            feedback.color === 'red' && 'text-red-400',
                                                            feedback.color === 'blue' && 'text-blue-400',
                                                            feedback.color === 'green' && 'text-green-400'
                                                        )}>
                                                            {feedback.type}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={cn(
                                                                        'w-3 h-3',
                                                                        i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-white font-semibold text-sm mt-1">{feedback.title}</p>
                                                    <p className="text-slate-400 text-xs mt-1">{feedback.author}</p>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <span className={cn(
                                                    'text-xs font-medium px-2 py-1 rounded',
                                                    feedback.status.includes('Çözüm') || feedback.status.includes('Progress') ? 'bg-amber-500/20 text-amber-300' :
                                                        feedback.status.includes('Beklemede') || feedback.status.includes('Pending') ? 'bg-blue-500/20 text-blue-300' :
                                                            'bg-green-500/20 text-green-300'
                                                )}>
                                                    {feedback.status}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-2">{feedback.message.substring(0, 100)}...</p>
                                        <p className="text-slate-500 text-xs">{feedback.date}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                        {/* PERFORMANCE LEAGUE TAB */}
                        {activeTab === 'performance' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3"
                            >
                                {performanceLeague.sort((a, b) => a.rank - b.rank).map((branch, idx) => (
                                    <motion.div
                                        key={branch.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => setSelectedFeedback({ ...branch, isScorecard: true })}
                                        className={cn(
                                            'p-4 rounded-lg border cursor-pointer transition-all group hover:scale-[1.02]',
                                            branch.rank === 1 && 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50',
                                            branch.rank === 2 && 'bg-slate-500/10 border-slate-500/30 hover:border-slate-500/50',
                                            branch.rank === 3 && 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={cn(
                                                    'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
                                                    branch.rank === 1 && 'bg-amber-500/20 text-amber-400',
                                                    branch.rank === 2 && 'bg-slate-500/20 text-slate-300',
                                                    branch.rank === 3 && 'bg-red-500/20 text-red-400'
                                                )}>
                                                    #{branch.rank}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-semibold">{branch.name}</p>
                                                    <p className={cn(
                                                        'text-xs mt-1',
                                                        branch.performance.includes('Mükemmel') || branch.performance.includes('Excellent') ? 'text-green-400' :
                                                            branch.performance.includes('İyi') || branch.performance.includes('Good') ? 'text-blue-400' :
                                                                'text-red-400'
                                                    )}>
                                                        {branch.performance}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-white">{branch.score}</div>
                                                <div className="flex items-center gap-1 justify-end mt-1">
                                                    {branch.trend === 'up' ?
                                                        <TrendingUp className="w-4 h-4 text-green-400" /> :
                                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                                    }
                                                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Feedback/Performance Detail Modal */}
                    <AnimatePresence>
                        {selectedFeedback && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedFeedback(null)}
                                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                                >
                                    {selectedFeedback.isScorecard ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl', selectedFeedback.rank === 1 && 'bg-amber-500/20 text-amber-400', selectedFeedback.rank === 2 && 'bg-slate-500/20 text-slate-300', selectedFeedback.rank === 3 && 'bg-red-500/20 text-red-400')}>
                                                        #{selectedFeedback.rank}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-white">{selectedFeedback.name}</h3>
                                                        <p className={cn('text-sm mt-1', selectedFeedback.performance.includes('Mükemmel') ? 'text-green-400' : selectedFeedback.performance.includes('İyi') ? 'text-blue-400' : 'text-red-400')}>
                                                            {selectedFeedback.performance}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-slate-900/50 rounded-lg p-4">
                                                    <h4 className="text-white font-semibold mb-4">{lang === 'tr' ? 'Performans Karnesi' : 'Performance Card'}</h4>
                                                    <div className="whitespace-pre-line text-slate-300 text-sm font-medium leading-relaxed">{selectedFeedback.scorecard}</div>
                                                </div>
                                                <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                                                    <div className="text-4xl font-bold text-white">{selectedFeedback.score}</div>
                                                    <div>
                                                        <p className="text-slate-400 text-sm">{lang === 'tr' ? 'Toplam Puan' : 'Total Score'}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {selectedFeedback.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                                                            <span className={selectedFeedback.trend === 'up' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                                                                {selectedFeedback.trend === 'up' ? lang === 'tr' ? 'Yükseliş Trendi' : 'Upward Trend' : lang === 'tr' ? 'Düşüş Trendi' : 'Downward Trend'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-start justify-between mb-6">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className={cn('text-sm font-bold px-3 py-1 rounded', selectedFeedback.color === 'red' && 'bg-red-500/20 text-red-400', selectedFeedback.color === 'blue' && 'bg-blue-500/20 text-blue-400', selectedFeedback.color === 'green' && 'bg-green-500/20 text-green-400')}>
                                                            {selectedFeedback.type}
                                                        </span>
                                                        <div className="flex gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={cn('w-4 h-4', i < selectedFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600')} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">{selectedFeedback.title}</h3>
                                                    <p className="text-slate-400 text-sm">{selectedFeedback.author}</p>
                                                </div>
                                                <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-slate-900/50 rounded-lg p-4">
                                                    <p className="text-slate-300 text-sm leading-relaxed">{selectedFeedback.message}</p>
                                                </div>
                                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                                                    <div>
                                                        <p className="text-slate-400 text-xs uppercase tracking-wide">{lang === 'tr' ? 'Durum' : 'Status'}</p>
                                                        <p className={cn('text-sm font-bold mt-1', selectedFeedback.status.includes('Çözüm') || selectedFeedback.status.includes('Progress') ? 'text-amber-400' : selectedFeedback.status.includes('Beklemede') || selectedFeedback.status.includes('Pending') ? 'text-blue-400' : 'text-green-400')}>
                                                            {selectedFeedback.status}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-slate-400 text-xs uppercase tracking-wide">{lang === 'tr' ? 'Tarih' : 'Date'}</p>
                                                        <p className="text-sm text-slate-300 mt-1">{selectedFeedback.date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Enhanced Glow Effect */}
                    <div
                        className="absolute -inset-6 bg-gradient-to-r from-teal-500/15 via-orange-500/10 to-teal-500/15 rounded-3xl blur-3xl -z-10 opacity-60 animate-pulse"
                        style={{
                            animationDuration: '4s'
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
});



export default DashboardMockup;
