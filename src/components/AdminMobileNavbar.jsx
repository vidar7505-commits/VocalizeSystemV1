import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminContext } from '@/contexts/AdminContext';
import { Bell, QrCode, Building2, CheckCheck, X, AlertOctagon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from 'framer-motion';

const formatTimeAgo = (dateString, t) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return t('navbar.time.second_short', { count: Math.floor(seconds), defaultValue: `${Math.floor(seconds)}sn` });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}${t('navbar.time.minute_short', { defaultValue: 'dk' })}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${t('navbar.time.hour_short', { defaultValue: 'sa' })}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}${t('navbar.time.day_short', { defaultValue: 'g' })}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}${t('navbar.time.month_short', { defaultValue: 'ay' })}`;

  const years = Math.floor(months / 12);
  return `${years}${t('navbar.time.year_short', { defaultValue: 'y' })}`;
};

const AdminMobileNavbar = () => {
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    qrCount,
    loading,
    businessId,
    assignedBranchId,
    isBranchManager,
    // 🟢 Context Data
    notifications, unreadCount, escalatedCount,
    markNotificationAsRead, markAllNotificationsAsRead
  } = useAdminContext();
  const { t, i18n } = useTranslation('admin');


  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // 🟢 REMOVED: Local Notification Logic (notifications, unreadCount, escalatedCount) is now in Context
  const [showNotifications, setShowNotifications] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');

  const containerRef = useRef(null);

  const filteredBranches = useMemo(() => {
    if (!branchSearchQuery.trim()) return branches;
    const query = branchSearchQuery.toLowerCase().trim();
    return branches.filter(b => b.branch_name_tr.toLowerCase().includes(query));
  }, [branches, branchSearchQuery]);

  // 🟢 REMOVED: All local useEffects for fetching and subscriptions. Context handles it ONE time.

  // 🟢 GERİ TUŞU YÖNETİMİ: Dropdown açıkken geri tuşuna basılırsa kapat
  useEffect(() => {
    if (!showNotifications) return;

    const handlePopState = () => {
      setShowNotifications(false);
    };

    // Dropdown açıldığında history'e state ekle
    window.history.pushState({ notificationDropdown: true }, '');

    // Popstate listener (geri tuşu)
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showNotifications]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleBellClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowNotifications((prev) => !prev);
  };

  const handleViewAll = () => {
    setShowNotifications(false);
    navigate('/admin-panel/notifications');
  };

  const handleNotificationClick = async (notification, e) => {
    e.stopPropagation();
    setShowNotifications(false);

    // ✅ FALLBACK: related_id veya feedback_id kullan
    const feedbackId = notification.related_id || notification.feedback_id;

    if (!feedbackId) {
      console.error('❌ Bildirimde feedback ID bulunamadı:', notification);
      toast({
        variant: "destructive",
        title: t('navbar.error_title', { defaultValue: 'Hata' }),
        description: t('navbar.error_id_missing')
      });
      return;
    }

    // ✅ MOBİL FİX: localStorage'a ÖNCE yaz (State kaybına karşı)
    localStorage.setItem('vocalize_pending_feedback', feedbackId);

    // ✅ DEBUG LOG (Mobil test için)
    console.log('🔔 Bildirim tıklandı:', {
      notification_id: notification.id,
      feedback_id: feedbackId,
      localStorage_set: true,
      navigasyon_path: '/admin-panel/feedbacks',
      state_gönderiliyor: { openFeedbackId: feedbackId }
    });

    // Navigate
    navigate('/admin-panel/feedbacks', {
      state: { openFeedbackId: feedbackId }
    });

    // Okundu işaretleme (Context Method)
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllNotificationsAsRead();
  };

  const getSelectedBranchLabel = () => {
    if (selectedBranchId === 'all') return t('navbar.all_branches');
    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return t('navbar.all_branches');
    const isEn = i18n.language.startsWith('en');
    const branchName = (isEn && branch.branch_name_en) ? branch.branch_name_en : branch.branch_name_tr;
    return branchName || t('navbar.all_branches');
  };

  if (loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-900 border-b border-slate-800 px-2 py-3 md:hidden shadow-lg">
      <div className="flex items-center justify-between h-full pl-16">

        {/* QR Sayacı */}
        <div className="flex items-center gap-1.5 bg-teal-900/20 border border-teal-500/30 rounded-lg px-2 py-1 shrink-0 max-w-[100px]">
          <QrCode className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-teal-400 font-medium text-xs truncate">
            {t('navbar.qr_scans', { count: qrCount })}
          </span>
        </div>

        {/* Şube Seçimi */}
        <div className="flex-1 flex justify-center px-1 min-w-0">
          {branches.length > 1 && (
            <div className="w-full max-w-[130px]">
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
              >
                <SelectTrigger className="bg-transparent border-none text-white h-8 p-0 focus:ring-0 focus:ring-offset-0 justify-center shadow-none">
                  <div className="flex items-center gap-1 truncate mx-auto">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-xs">{getSelectedBranchLabel()}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[300px]">
                  {/* 🔍 ŞUBE ARAMA KUTUSU */}
                  {branches.length > 5 && (
                    <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder={t('navbar.search_placeholder')}
                          value={branchSearchQuery}
                          onChange={(e) => setBranchSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                  )}

                  <SelectItem value="all">{t('navbar.all_branches')}</SelectItem>
                  {filteredBranches.length === 0 && branchSearchQuery && (
                    <div className="p-3 text-center text-slate-500 text-xs">{t('navbar.no_branch_found')}</div>
                  )}
                  {filteredBranches.map((branch) => {
                    const isEn = i18n.language.startsWith('en');
                    const branchName = (isEn && branch.branch_name_en) ? branch.branch_name_en : branch.branch_name_tr;
                    return (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branchName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Bildirim Alanı */}
        <div className="flex items-center gap-2 shrink-0 relative" ref={containerRef}>
          <Button onClick={handleBellClick} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white p-0 relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 || escalatedCount > 0 ? (
              <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse border-2 border-slate-900"></span>
            ) : null}
          </Button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-full right-0 mt-2 w-[280px] sm:w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-slate-750 border-b border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-300">{t('navbar.notifications')}</h4>
                  <div className="flex gap-1">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title={t('navbar.mark_all_read')}>
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Area */}
                <div className="max-h-[300px] overflow-y-auto">
                  {escalatedCount > 0 && (
                    <div onClick={() => { navigate('/admin-panel/feedbacks', { state: { filter: 'urgent' } }); setShowNotifications(false); }} className="flex items-start gap-3 p-3 border-b border-slate-700/30 bg-red-950/30 hover:bg-red-900/40 cursor-pointer">
                      <AlertOctagon className="w-4 h-4 shrink-0 mt-1 text-red-500 animate-pulse" />
                      <div className="flex-grow">
                        <p className="text-xs text-red-200 font-bold">{t('notifications.urgent_title')}</p>
                        <p className="text-[10px] text-red-300 mt-0.5">{t('notifications.urgent_desc', { count: escalatedCount })}</p>
                      </div>
                    </div>
                  )}
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={(e) => handleNotificationClick(n, e)}
                        className={`p-3 border-b border-slate-700/50 flex gap-3 cursor-pointer hover:bg-slate-800 transition-colors ${!n.is_read ? 'bg-slate-700/20' : ''}`}
                      >
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-slate-600' : 'bg-blue-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate font-medium">
                            {(i18n.language.startsWith('en') && n.branch_name_en) ? n.branch_name_en : n.branch_name}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{formatTimeAgo(n.created_at, t)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">{t('navbar.no_notifications')}</div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-700 bg-slate-750/50">
                  <Button onClick={handleViewAll} variant="ghost" size="sm" className="w-full text-xs h-8 text-teal-400 hover:text-teal-300 hover:bg-slate-700">
                    {t('navbar.view_all')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminMobileNavbar;