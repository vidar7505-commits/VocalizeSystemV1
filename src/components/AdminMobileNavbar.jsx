import React, { useEffect, useState, useRef } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { Bell, QrCode, Building2, CheckCheck, X, AlertOctagon } from 'lucide-react';
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

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)}y`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)}ay`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)}g`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)}sa`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)}dk`;
  return `${Math.floor(seconds)}sn`;
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
    isBranchManager
  } = useAdminContext();


  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [escalatedCount, setEscalatedCount] = useState(0);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error) {
        setNotifications(data || []);
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      }
    };

    const checkEscalatedStatus = async () => {
      if (!businessId) return;
      try {
        let query = supabase.from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'escalated');

        if (isBranchManager && assignedBranchId) {
          query = query.eq('branch_id', assignedBranchId);
        }
        const { count } = await query;
        setEscalatedCount(count || 0);
      } catch (e) {
        console.error(e);
      }
    };

    fetchNotifications();
    checkEscalatedStatus();

    const channel = supabase
      .channel('mobile-nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [payload.new, ...prev].slice(0, 5));
      })
      .subscribe();

    const feedbackChannel = supabase.channel('mobile-nav-feedback-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` }, () => {
        checkEscalatedStatus();
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [user, businessId, isBranchManager, assignedBranchId]);

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
        title: "Hata",
        description: "Geri bildirim ID'si bulunamadı"
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

    // Navigate (State ile birlikte, ama localStorage primary)
    navigate('/admin-panel/feedbacks', {
      state: { openFeedbackId: feedbackId }
    });

    // Okundu işaretleme (Arka planda)
    if (!notification.is_read) {
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast({ title: "Tüm bildirimler okundu" });

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const getSelectedBranchLabel = () => {
    if (selectedBranchId === 'all') return 'Tüm Şubeler';
    const branch = branches.find(b => b.id === selectedBranchId);
    return branch ? branch.branch_name_tr : 'Tüm Şubeler';
  };

  if (loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-900 border-b border-slate-800 px-2 py-3 md:hidden shadow-lg">
      <div className="flex items-center justify-between h-full pl-16">

        {/* QR Sayacı */}
        <div className="flex items-center gap-1.5 bg-teal-900/20 border border-teal-500/30 rounded-lg px-2 py-1 shrink-0 max-w-[100px]">
          <QrCode className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-teal-400 font-medium text-xs truncate">
            {qrCount} Tarama
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
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name_tr}
                    </SelectItem>
                  ))}
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
                  <h4 className="text-xs font-semibold text-slate-300">Bildirimler</h4>
                  <div className="flex gap-1">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Okundu işaretle">
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
                        <p className="text-xs text-red-200 font-bold">Acil Durum</p>
                        <p className="text-[10px] text-red-300 mt-0.5">{escalatedCount} acil bildirim.</p>
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
                          <p className="text-xs text-white truncate font-medium">{n.branch_name}</p>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{formatTimeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">Bildirim yok</div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-700 bg-slate-750/50">
                  <Button onClick={handleViewAll} variant="ghost" size="sm" className="w-full text-xs h-8 text-teal-400 hover:text-teal-300 hover:bg-slate-700">
                    Tümünü Gör
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