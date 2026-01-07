import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Bell, Building2, User, LogOut, QrCode, MessageSquare, X, CheckCheck, AlertOctagon } from 'lucide-react';
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

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} yıl önce`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} ay önce`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} gün önce`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} sa önce`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} dk önce`;
  return `${Math.floor(seconds)} sn önce`;
};

const AdminHeader = () => {
  const { 
    businessId, businessName, branches, selectedBranchId, setSelectedBranchId,
    qrCount, loading, dateRange,
    isSpecialOffer, monthlyFeeOverride
  } = useAdminContext();
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Header içinde modal açma state'leri kaldırıldı/pasife alındı çünkü sayfaya yönlendireceğiz
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isHovered, setIsHovered] = useState(false);
  const [escalatedCount, setEscalatedCount] = useState(0);

  // Check for any escalated feedbacks globally for this business
  const checkEscalatedStatus = useCallback(async () => {
    if (!businessId) return;
    try {
      const { count } = await supabase.from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'escalated');
      
      setEscalatedCount(count || 0);
    } catch (e) {
      console.error('Error checking escalated status:', e);
    }
  }, [businessId]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching notifications", error);
    } else {
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    checkEscalatedStatus();
    
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchNotifications, checkEscalatedStatus]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          toast({
            title: `Yeni geri bildirim`,
            description: 'Bir müşteriden yeni bildirim aldınız.',
          });
        }
      )
      .subscribe();
      
    // Subscribe to feedbacks to update escalated count in real-time
    const feedbackChannel = supabase
      .channel('header-feedback-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` }, 
        () => {
           checkEscalatedStatus();
        }
      )
      .subscribe();
      
    return () => {
       supabase.removeChannel(channel);
       supabase.removeChannel(feedbackChannel);
    };
  }, [user, toast, businessId, checkEscalatedStatus]);

  // 🟢 DÜZELTİLEN FONKSİYON: Artık fetch yapmaz, direkt yönlendirir.
  const handleNotificationClick = async (notification) => {
    // 1. Hedef ID'yi güvenli şekilde al (Farklı isimlendirmelere karşı önlem)
    // Supabase tablonuzda sütun adı 'related_id' veya 'feedback_id' olabilir.
    const targetId = notification.related_id || notification.feedback_id;

    if (!targetId) {
        console.error("HATA: Bildirimde ID bulunamadı!", notification);
        return;
    }

    // 2. Menüyü kapat
    setNotificationOpen(false);

    // 3. Okundu olarak işaretle (Arka planda sessizce)
    if (!notification.is_read) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Hata olsa bile kullanıcıyı bekletmemek için await kullanmıyoruz
        supabase.from('notifications').update({ is_read: true }).eq('id', notification.id).then();
    }

    // 4. SAYFAYA YÖNLENDİR (State ile ID taşıyoruz)
    // Bu state FeedbackManagement.jsx tarafından yakalanıp scroll/highlight yapılacak.
    navigate('/admin-panel/feedbacks', {
        state: { openFeedbackId: targetId }
    });
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    if(error) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Bildirimler güncellenemedi.' });
    } else {
      setNotifications(prev => prev.map(n => ({...n, is_read: true})));
      setUnreadCount(0);
      toast({ title: 'Tüm bildirimler okundu olarak işaretlendi.'});
    }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };
  
  const getSelectedBranchLabel = () => {
    if (selectedBranchId === 'all') return 'Tüm Şubeler';
    const branch = branches.find(b => b.id === selectedBranchId);
    return branch ? branch.branch_name_tr : 'Tüm Şubeler';
  };
  
  const getQrDateLabel = () => {
    const labels = {
      'today': 'Bugün',
      'last7': 'Son 7 Gün',
      'last30': 'Son 30 Gün',
      'last90': 'Son 90 Gün',
      'thisMonth': 'Bu Ay',
      'allTime': 'Tüm Zamanlar',
    };
    return labels[dateRange] || 'Son 7 Gün';
  };

  let badgeConfig = null;

  if (!loading && isSpecialOffer === true && monthlyFeeOverride !== null) {
    const fee = Number(monthlyFeeOverride);
    
    if (fee === 79.00) {
      badgeConfig = {
        text: "Erken Aşama Avantajı",
        icon: "⭐",
        badgeClassName: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
        cardTitle: "⭐ Ayrıcalıklı Erken Erişim",
        // DEĞİŞİKLİK BURADA: + KDV Eklendi
        cardDesc: "Bu işletme Vocalize'ın ilk destekçileri arasındadır. Aylık abonelik bedeli $79 + KDV olarak belirlenmiştir ve ömür boyu %20 indirim hakkı mühürlenmiştir.",
        cardBorderColor: "border-amber-500/50",
        cardTitleColor: "text-amber-400"
      };
    } else {
      badgeConfig = {
        text: "Esnek Plan Tanımlandı",
        icon: "🚀",
        badgeClassName: "bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20",
        cardTitle: "🚀 Kurumsal Esnek Paket",
        // DEĞİŞİKLİK BURADA: + KDV Eklendi
        cardDesc: `İşletmenizin ihtiyaçlarına özel olarak yapılandırılmış ödeme planıdır. Aylık kullanım bedeli $${fee} + KDV olarak tanımlanmıştır.`,
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
            {loading ? "Yükleniyor..." : businessName}
          </span>

          {badgeConfig && (
            <div 
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer",
                badgeConfig.badgeClassName
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span className="text-sm">{badgeConfig.icon}</span>
              <span className="text-xs font-semibold whitespace-nowrap hidden md:inline-block">{badgeConfig.text}</span>

              <div 
                className={cn(
                  "absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-200 bg-slate-800 border",
                  badgeConfig.cardBorderColor,
                  isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
              >
                <div className={cn("text-sm font-semibold mb-1", badgeConfig.cardTitleColor)}>
                  {badgeConfig.cardTitle}
                </div>
                <div className="text-xs text-slate-300">
                  {badgeConfig.cardDesc}
                </div>
              </div>
            </div>
          )}

          {!loading && branches.length > 1 && (
            <div className="w-56">
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 font-semibold text-base h-10 hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <SelectValue placeholder="Şube Seçiniz">{getSelectedBranchLabel()}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.branch_name_tr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/50 border border-teal-500/30 rounded-lg px-4 py-2 hover:bg-slate-700/50 transition-colors">
            <QrCode className="h-5 w-5 text-teal-400" />
            <span className="text-sm font-semibold text-teal-300 whitespace-nowrap">
              {getQrDateLabel()}: <span className="text-white font-bold">{loading ? '...' : qrCount}</span> Tarama
            </span>
          </div>
          
          <div ref={notificationRef} className="relative">
            <Button onClick={() => setNotificationOpen(prev => !prev)} variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-slate-800">
              <Bell className="h-5 w-5" />
              {(unreadCount > 0 || escalatedCount > 0) && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-[#111827]"></span>}
            </Button>
            <AnimatePresence>
              {notificationOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-700/50">
                    <h3 className="text-white font-bold text-sm">Bildirimler</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button onClick={handleMarkAllAsRead} title="Tümünü okundu işaretle" className="p-1 text-slate-400 hover:text-white"><CheckCheck className="w-4 h-4" /></button>}
                      <button onClick={() => setNotificationOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {/* Persistent Escalated Notification */}
                    {escalatedCount > 0 && (
                      <div 
                         onClick={() => { navigate('/admin-panel/feedbacks'); setNotificationOpen(false); }}
                         className="flex items-start gap-3 p-3 border-b border-slate-700/30 bg-red-950/30 hover:bg-red-900/40 cursor-pointer transition-colors"
                      >
                         <AlertOctagon className="w-4 h-4 shrink-0 mt-1 text-red-500 animate-pulse" />
                         <div className="flex-grow">
                            <p className="text-sm text-red-200 font-bold">
                               Acil Geri Bildirimleriniz Var
                            </p>
                            <p className="text-xs text-red-300 mt-1">
                               {escalatedCount} adet acil durumlu geri bildirim bekliyor.
                            </p>
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
                              <span className="font-semibold">{n.branch_name || 'Bilinmeyen Şube'}</span>: {n.message ? (n.message.length > 40 ? n.message.substring(0, 40) + '...' : n.message) : 'Yeni geri bildirim.'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      ))
                    ) : escalatedCount === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">Okunmamış bildirim yok.</p>
                    ) : null}
                  </div>
                  <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-700/50 text-center">
                    <button onClick={() => { navigate('/admin-panel/notifications'); setNotificationOpen(false); }} className="text-teal-400 hover:text-teal-300 text-sm font-medium w-full">Tümünü Gör</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><User className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700 text-white">
              <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={() => navigate('/admin-panel/settings')} className="cursor-pointer focus:bg-slate-700 focus:text-white">Ayarlar</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-900/20 focus:text-red-300 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {/* NOT: Burada modal açan kodlar kalabilir ama handleNotificationClick artık bunları kullanmıyor.
         Sayfaya yönlendirme yaptığı için bu kısım pasif kalacak, sorun yaratmaz.
      */}
      {isModalOpen && selectedFeedback && (
        <FeedbackDetailModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          feedback={selectedFeedback} 
        />
      )}
    </>
  );
};

export default AdminHeader;