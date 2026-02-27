import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Bell, Building2, User, LogOut, QrCode, MessageSquare, X, CheckCheck, AlertOctagon, Sun, Moon, Search, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from 'framer-motion';
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const AdminHeader = () => {
  const { t, i18n } = useTranslation('common');
  const {
    businessId, businessName, branches, selectedBranchId, setSelectedBranchId,
    qrCount, loading, dateRange,
    isSpecialOffer, monthlyFeeOverride,
    userRole, assignedBranchId, isBranchManager,
    // 🟢 Context-based Notification Data
    notifications, unreadCount, escalatedCount,
    markNotificationAsRead, markAllNotificationsAsRead, checkEscalatedStatus,
    theme, toggleTheme
  } = useAdminContext();

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  // --- STATE YÖNETİMİ ---
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // 🟢 REMOVED: Local Notification State (notifications, unreadCount, escalatedCount) moved to Context
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');

  // --- ŞUBE FİLTRELEME (Enterprise için 300+ şube desteği) ---
  const filteredBranches = useMemo(() => {
    if (!branchSearchQuery.trim()) return branches;
    const query = branchSearchQuery.toLowerCase().trim();
    const isEn = i18n.language.startsWith('en');
    return branches.filter(b => {
      const name = (isEn && b.branch_name_en) ? b.branch_name_en : b.branch_name_tr;
      return name?.toLowerCase().includes(query);
    });
  }, [branches, branchSearchQuery, i18n.language]);

  // 🟢 REMOVED: Local Theme Management moved to AdminContext

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('vocalize_language', lng);
  };

  // --- MENÜ KONTROLÜ (ÇAKIŞMAYI ÖNLEME) ---
  const toggleNotifications = () => {
    if (!notificationOpen) {
      // Bildirim açılıyorsa profili kapat
      setIsProfileMenuOpen(false);
    }
    setNotificationOpen(prev => !prev);
  };

  const handleProfileMenuChange = (isOpen) => {
    setIsProfileMenuOpen(isOpen);
    if (isOpen) {
      // Profil açılıyorsa bildirimi kapat
      setNotificationOpen(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return t('time_ago.years_ago', { count: Math.floor(interval) });

    interval = seconds / 2592000;
    if (interval > 1) return t('time_ago.months_ago', { count: Math.floor(interval) });

    interval = seconds / 86400;
    if (interval > 1) return t('time_ago.days_ago', { count: Math.floor(interval) });

    interval = seconds / 3600;
    if (interval > 1) return t('time_ago.hours_ago', { count: Math.floor(interval) });

    interval = seconds / 60;
    if (interval > 1) return t('time_ago.minutes_ago', { count: Math.floor(interval) });

    return t('time_ago.seconds_ago', { count: Math.floor(seconds) });
  };

  const getNotificationLabel = (n) => {
    const type = n.feedbacks?.feedback_type || n.feedback_type;
    if (type === 'complaint') return t('notifications.new_complaint');
    if (type === 'suggestion') return t('notifications.new_suggestion');
    if (type === 'evaluation' || type === 'review' || type === 'rating') return t('notifications.new_evaluation');
    return n.message || t('notifications.new_notification');
  };

  // 🟢 REMOVED: All local data fetching and subscription logic (fetchNotifications, useEffects)
  // Logic is now in AdminContext to prevent double-subscription and performance issues.

  const handleNotificationClick = async (notification) => {
    const targetId = notification.related_id || notification.feedback_id;
    if (!targetId) return;
    setNotificationOpen(false);

    if (!notification.is_read) {
      // 🟢 Use Context Method
      markNotificationAsRead(notification.id);
    }
    navigate('/admin-panel/feedbacks', { state: { openFeedbackId: targetId } });
  };

  const handleMarkAllAsRead = async () => {
    // 🟢 Use Context Method
    await markAllNotificationsAsRead();
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const getSelectedBranchLabel = () => {
    if (selectedBranchId === 'all') return t('header.all_branches');
    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return t('header.all_branches');
    return (i18n.language.startsWith('en') && branch.branch_name_en) ? branch.branch_name_en : branch.branch_name_tr;
  };

  const getQrDateLabel = () => {
    // keys map to common.json keys
    const labels = {
      'today': 'today',
      'last7': 'last7',
      'last30': 'last30',
      'last90': 'last90',
      'thisMonth': 'thisMonth',
      'allTime': 'allTime'
    };
    const key = labels[dateRange] || 'last7';
    return t(`date_ranges.${key}`);
  };

  // Badge Config Logic (Kısaltıldı, aynen duruyor)
  let badgeConfig = null;
  if (!loading && isSpecialOffer === true && monthlyFeeOverride !== null) {
    const fee = Number(monthlyFeeOverride);
    if (fee === 79.00) {
      badgeConfig = {
        text: t('badges.early_access'),
        icon: "⭐",
        badgeClassName: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
        cardTitle: t('badges.early_access_title'),
        cardDesc: t('badges.early_access_desc'),
        cardBorderColor: "border-amber-500/50",
        cardTitleColor: "text-amber-400"
      };
    } else {
      badgeConfig = {
        text: t('badges.flexible_plan'),
        icon: "🚀",
        badgeClassName: "bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20",
        cardTitle: t('badges.flexible_plan_title'),
        cardDesc: t('badges.flexible_plan_desc', { fee: fee }),
        cardBorderColor: "border-teal-500/50",
        cardTitleColor: "text-teal-400"
      };
    }
  }

  return (
    <>
      <header className="hidden md:flex sticky top-0 z-40 h-16 bg-[#111827] border-b border-slate-800 px-4 md:px-6 items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <span className="text-white font-bold text-xl md:text-2xl truncate max-w-[200px] md:max-w-xs tracking-tight">
            {loading ? "..." : businessName}
            {userRole === 'branch_manager' && branches.length > 0 && assignedBranchId && (
              <span className="text-slate-400 text-sm md:text-base font-medium ml-2 border-l border-slate-700 pl-2">
                {branches.find(b => b.id === assignedBranchId)?.branch_name_tr || ""}
              </span>
            )}
          </span>

          {badgeConfig && (
            <div className={cn("relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer", badgeConfig.badgeClassName)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              <span className="text-sm">{badgeConfig.icon}</span>
              <span className="text-xs font-semibold whitespace-nowrap hidden md:inline-block">{badgeConfig.text}</span>
              <div className={cn("absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-200 bg-slate-800 border", badgeConfig.cardBorderColor, isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none")}>
                <div className={cn("text-sm font-semibold mb-1", badgeConfig.cardTitleColor)}>{badgeConfig.cardTitle}</div>
                <div className="text-xs text-slate-300">{badgeConfig.cardDesc}</div>
              </div>
            </div>
          )}

          {!loading && branches.length > 1 && (
            <div className="w-56" id="header-branch-selector">
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 font-semibold text-base h-10 hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <SelectValue placeholder={t('header.select_branch')}>{getSelectedBranchLabel()}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[300px]">
                  {/* 🔍 ŞUBE ARAMA KUTUSU */}
                  {branches.length > 5 && (
                    <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder={t('header.search_branch')}
                          value={branchSearchQuery}
                          onChange={(e) => setBranchSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                  )}
                  {!isBranchManager && <SelectItem value="all">{t('header.all_branches')}</SelectItem>}
                  {filteredBranches.length === 0 && branchSearchQuery && (
                    <div className="p-3 text-center text-slate-500 text-sm">{t('header.no_branch_found')}</div>
                  )}
                  {filteredBranches.map((branch) => {
                    const branchName = (i18n.language.startsWith('en') && branch.branch_name_en) ? branch.branch_name_en : branch.branch_name_tr;
                    return <SelectItem key={branch.id} value={branch.id}>{branchName}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/50 border border-teal-500/30 rounded-lg px-4 py-2 hover:bg-slate-700/50 transition-colors" id="header-qr-stats">
            <QrCode className="h-5 w-5 text-teal-400" />
            <span className="text-sm font-semibold text-teal-300 whitespace-nowrap">
              {getQrDateLabel()}: <span className="text-white font-bold">{loading ? '...' : qrCount}</span> {t('header.scan_label')}
            </span>
          </div>

          {/* BİLDİRİM BUTONU (GÜNCELLENDİ: toggleNotifications kullanıyor) */}
          <div ref={notificationRef} className="relative" id="header-notifications">
            <Button onClick={toggleNotifications} variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-slate-800">
              <Bell className="h-5 w-5" />
              {(unreadCount > 0 || escalatedCount > 0) && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-[#111827]"></span>}
            </Button>
            <AnimatePresence>
              {notificationOpen && (
                <motion.div
                  key="notifications-panel"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-700/50">
                    <h3 className="text-white font-bold text-sm">{t('header.notifications')}</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 &&
                        <button onClick={handleMarkAllAsRead} className="p-1 text-slate-400 hover:text-white" title={t('header.mark_all_read')}>
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      }
                      <button onClick={() => setNotificationOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {escalatedCount > 0 && (
                      <div onClick={() => { navigate('/admin-panel/feedbacks', { state: { filter: 'urgent' } }); setNotificationOpen(false); }} className="flex items-start gap-3 p-3 border-b border-slate-700/30 bg-red-950/30 hover:bg-red-900/40 cursor-pointer">
                        <AlertOctagon className="w-4 h-4 shrink-0 mt-1 text-red-500 animate-pulse" />
                        <div className="flex-grow">
                          <p className="text-sm text-red-200 font-bold">{t('notifications.urgent_title')}</p>
                          <p className="text-xs text-red-300 mt-1">{t('notifications.urgent_desc', { count: escalatedCount })}</p>
                        </div>
                      </div>
                    )}
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map(n => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} className="flex items-start gap-3 p-3 border-b border-slate-700/30 hover:bg-slate-700/50 cursor-pointer transition-colors last:border-b-0">
                          {!n.is_read && <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0"></div>}
                          <MessageSquare className={`w-4 h-4 shrink-0 mt-1 ${n.is_read ? 'text-slate-500' : 'text-teal-400'}`} />
                          <div className="flex-grow">
                            <p className={`text-sm ${n.is_read ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                              <span className="font-semibold">{n.branch_name}</span>: {getNotificationLabel(n)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      ))
                    ) : escalatedCount === 0 ? (<p className="text-slate-400 text-sm text-center py-8">{t('header.no_notifications')}</p>) : null}
                  </div>
                  <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-700/50 text-center">
                    <button onClick={() => { navigate('/admin-panel/notifications'); setNotificationOpen(false); }} className="text-teal-400 hover:text-teal-300 text-sm font-medium w-full">{t('header.view_all')}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PROFİL MENÜSÜ (GÜNCELLENDİ: Controlled State + Tema Butonu) */}
          <DropdownMenu open={isProfileMenuOpen} onOpenChange={handleProfileMenuChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><User className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700 text-white">
              <DropdownMenuLabel>{t('header.my_account')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={() => navigate('/admin-panel/settings')} className="cursor-pointer focus:bg-slate-700 focus:text-white">{t('header.settings')}</DropdownMenuItem>

              {/* DİL DEĞİŞTİR */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-slate-700 focus:text-white flex justify-between items-center">
                <span>{t('header.language')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeLanguage('tr')}
                    className={cn("text-xs px-2 py-1 rounded hover:bg-slate-600", i18n.language.startsWith('tr') ? "text-teal-400 font-bold bg-slate-700" : "text-slate-400")}
                  >
                    TR
                  </button>
                  <button
                    onClick={() => changeLanguage('en')}
                    className={cn("text-xs px-2 py-1 rounded hover:bg-slate-600", i18n.language.startsWith('en') ? "text-teal-400 font-bold bg-slate-700" : "text-slate-400")}
                  >
                    EN
                  </button>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-700" />

              {/* TEMA DEĞİŞTİR (Kapanmayı önler) */}
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); toggleTheme(e); }}
                className="cursor-pointer focus:bg-slate-700 focus:text-white flex justify-between items-center group"
              >
                <span>{t('header.appearance')}</span>
                {theme === 'dark' ? (
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-white">
                    <span className="text-xs">{t('header.theme_dark')}</span>
                    <Moon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400 group-hover:text-yellow-300">
                    <span className="text-xs">{t('header.theme_light')}</span>
                    <Sun className="h-4 w-4" />
                  </div>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-700" />

              <DropdownMenuItem onClick={handleLogout} className="logout-menuitem text-red-400 focus:bg-red-900/20 focus:text-red-300 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />{t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {isModalOpen && selectedFeedback && <FeedbackDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} feedback={selectedFeedback} />}
    </>
  );
};

export default AdminHeader;