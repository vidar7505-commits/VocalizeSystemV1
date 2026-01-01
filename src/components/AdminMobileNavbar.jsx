import React, { useEffect, useState, useRef } from 'react';
import { useAdminContext } from '@/contexts/AdminContext';
import { Bell, QrCode, Building2, CheckCheck, X, Info } from 'lucide-react';
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
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import { cn } from '@/lib/utils';

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
    isSpecialOffer,
    monthlyFeeOverride
  } = useAdminContext();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  
  // Pricing flag detail state
  const [showPricingDetail, setShowPricingDetail] = useState(false);
  
  // FeedbackDetailModal için state'ler
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pricing badge config
  const badgeConfig = React.useMemo(() => {
    if (!isSpecialOffer || monthlyFeeOverride === null) return null;
    
    const fee = Number(monthlyFeeOverride);
    
    if (fee === 79.00) {
      return {
        text: "Erken Erişim",
        icon: "⭐",
        badgeClassName: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        cardTitle: "⭐ Ayrıcalıklı Erken Erişim",
        cardDesc: "Bu işletme Vocalize'ın ilk destekçileri arasındadır. Aylık abonelik bedeli ömür boyu $79 olarak mühürlenmiştir.",
        cardBorderColor: "border-amber-500/50",
        cardTitleColor: "text-amber-400"
      };
    } else {
      return {
        text: "Esnek Plan",
        icon: "🚀",
        badgeClassName: "bg-teal-500/10 border-teal-500/30 text-teal-400",
        cardTitle: "🚀 Kurumsal Esnek Paket",
        cardDesc: `İşletmenizin ihtiyaçlarına özel olarak yapılandırılmış ödeme planıdır. Aylık kullanım bedeli $${fee} olarak tanımlanmıştır.`,
        cardBorderColor: "border-teal-500/50",
        cardTitleColor: "text-teal-400"
      };
    }
  }, [isSpecialOffer, monthlyFeeOverride]);

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

    fetchNotifications();

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleBellClick = (e) => {
    e.stopPropagation(); 
    setShowNotifications(!showNotifications);
  };

  const handleViewAll = () => {
    setShowNotifications(false);
    navigate('/admin-panel/notifications');
  };

  const handleNotificationClick = async (notification, e) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    // Önce paneli kapat
    setShowNotifications(false);
    
    // Kısa bir gecikme ile modal aç (state update'lerin tamamlanması için)
    setTimeout(async () => {
      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedbacks')
          .select(`
            *, 
            branches(branch_name_tr),
            customer_profiles(
              id, name, email, phone, customer_number, created_at, updated_at,
              flag_vip_customer, flag_sensitive_customer, admin_note,
              users:user_id(first_name, last_name)
            ),
            manager_note_updater:manager_note_updated_by(first_name, last_name)
          `)
          .eq('id', notification.related_id)
          .single();
        
        if (feedbackError) {
          console.error('Feedback fetch error:', feedbackError);
          if (notification.related_id) {
            navigate('/admin-panel/feedbacks', { 
              state: { openFeedbackId: notification.related_id } 
            });
          }
          return;
        }

        setSelectedFeedback(feedbackData);
        setIsModalOpen(true);
      } catch (error) {
        console.error('Error fetching feedback:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Hata', 
          description: 'Geri bildirim detayı yüklenemedi.' 
        });
      }

      // Okundu işaretle
      if (!notification.is_read) {
          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));

          supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('id', notification.id)
              .then(({ error }) => {
                  if (error) console.error("Bildirim DB hatası:", error);
              });
      }
    }, 100);
  };

  const handleMarkAllRead = async (e) => {
     if(e) e.stopPropagation();
     
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
        
        {/* LEFT: QR Counter */}
        <div className="flex items-center gap-1.5 bg-teal-900/20 border border-teal-500/30 rounded-lg px-2 py-1 shrink-0 max-w-[100px]">
          <QrCode className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-teal-400 font-medium text-xs truncate">
            {qrCount} Tarama
          </span>
        </div>

        {/* MIDDLE: Branch Selector veya Pricing Flag */}
        <div className="flex-1 flex justify-center px-1 min-w-0">
           {badgeConfig ? (
             /* Pricing Flag Badge */
             <div className="relative">
               <div 
                 onClick={() => setShowPricingDetail(!showPricingDetail)}
                 className={cn(
                   "flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95",
                   badgeConfig.badgeClassName
                 )}
               >
                 <span className="text-sm">{badgeConfig.icon}</span>
                 <span className="text-xs font-semibold whitespace-nowrap">{badgeConfig.text}</span>
                 <Info className="w-3 h-3 ml-0.5 opacity-70" />
               </div>
               
               {/* Detail Dropdown */}
               <AnimatePresence>
                 {showPricingDetail && (
                   <>
                     {/* Backdrop */}
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       onClick={() => setShowPricingDetail(false)}
                       className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                     />
                     
                     {/* Detail Box */}
                     <motion.div
                       initial={{ opacity: 0, scale: 0.95, y: -10 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95, y: -10 }}
                       className={cn(
                         "fixed left-1/2 top-20 -translate-x-1/2 w-[85%] max-w-sm px-4 py-3 rounded-lg shadow-2xl z-[70] bg-slate-800 border",
                         badgeConfig.cardBorderColor
                       )}
                       onClick={(e) => e.stopPropagation()}
                     >
                       <div className="flex items-start justify-between mb-2">
                         <div className={cn("text-sm font-semibold", badgeConfig.cardTitleColor)}>
                           {badgeConfig.cardTitle}
                         </div>
                         <button
                           onClick={() => setShowPricingDetail(false)}
                           className="text-slate-400 hover:text-white -mt-1 -mr-1 p-1"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="text-xs text-slate-300 leading-relaxed">
                         {badgeConfig.cardDesc}
                       </div>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
             </div>
           ) : branches.length > 1 ? (
             /* Branch Selector */
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
           ) : null}
        </div>

        {/* RIGHT: Notifications */}
        <div className="flex items-center gap-2 shrink-0 relative" ref={notificationRef}>
          <Button onClick={handleBellClick} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white p-0 relative">
            <Bell className="w-5 h-5" />
             {unreadCount > 0 && (
               <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse border-2 border-slate-900"></span>
             )}
          </Button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()} 
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
                <div className="max-h-[300px] overflow-y-auto">
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

      {/* FeedbackDetailModal */}
      {isModalOpen && selectedFeedback && (
        <FeedbackDetailModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          feedback={selectedFeedback} 
        />
      )}
    </div>
  );
};

export default AdminMobileNavbar;