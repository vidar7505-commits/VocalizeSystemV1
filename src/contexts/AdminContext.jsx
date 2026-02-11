import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessCreatedAt, setBusinessCreatedAt] = useState(null);

  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [monthlyFeeOverride, setMonthlyFeeOverride] = useState(null);

  // 🟢 YENİ: Role-based access control
  const [userRole, setUserRole] = useState(null); // 'owner' | 'branch_manager'
  const [assignedBranchId, setAssignedBranchId] = useState(null);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  const [dateRange, setDateRange] = useState('last7');

  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🟢 BİLDİRİM STATE (Centralized)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [escalatedCount, setEscalatedCount] = useState(0);

  // Date Range Helper
  const getDateRange = useCallback((range) => {
    const endDate = new Date();
    let startDate = new Date();

    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    switch (range) {
      case 'today':
        break;
      case 'last7':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last30':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last90':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'thisMonth':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'allTime':
        startDate = businessCreatedAt ? new Date(businessCreatedAt) : new Date(2020, 0, 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
        break;
    }

    return { startDate, endDate };
  }, [businessCreatedAt]);

  const getDateFilterISO = useCallback((range) => {
    if (range === 'allTime') {
      return null;
    }
    const { startDate } = getDateRange(range);
    return startDate ? startDate.toISOString() : null;
  }, [getDateRange]);

  // 🟢 UPDATED: Main Data Fetcher with Role-Based Access Control
  const refreshData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Fetch Manager & Business + Role Info
      const { data: profileData, error: profileError } = await supabase
        .from('manager_profiles')
        .select(`
          business_id, 
          role, 
          assigned_branch_id,
          businesses(business_name, created_at, is_special_offer, monthly_fee_override)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setLoading(false);
        return;
      }

      const bId = profileData.business_id;
      const role = profileData.role || 'owner'; // Default to owner for backwards compatibility
      const assignedBranch = profileData.assigned_branch_id;

      setBusinessId(prev => bId === prev ? prev : bId);
      setBusinessName(prev => {
        const newName = profileData.businesses?.business_name || 'İşletmem';
        return newName === prev ? prev : newName;
      });
      setBusinessCreatedAt(prev => {
        const newDate = profileData.businesses?.created_at;
        return newDate === prev ? prev : newDate;
      });
      setIsSpecialOffer(prev => {
        const newVal = profileData.businesses?.is_special_offer || false;
        return newVal === prev ? prev : newVal;
      });
      setMonthlyFeeOverride(prev => {
        const newVal = profileData.businesses?.monthly_fee_override;
        return newVal === prev ? prev : newVal;
      });
      setUserRole(prev => role === prev ? prev : role);
      setAssignedBranchId(prev => assignedBranch === prev ? prev : assignedBranch);

      // 2. Fetch Branches (with role-based filtering)
      let branchQuery = supabase
        .from('branches')
        .select('id, branch_name_tr')
        .eq('business_id', bId)
        .eq('is_active', true)
        .order('branch_name_tr');

      // 🟢 If branch_manager, only fetch assigned branch
      if (role === 'branch_manager' && assignedBranch) {
        branchQuery = branchQuery.eq('id', assignedBranch);
      }

      const { data: branchData, error: branchError } = await branchQuery;

      if (branchError) throw branchError;
      setBranches(prev => JSON.stringify(prev) === JSON.stringify(branchData) ? prev : (branchData || []));

      // 🟢 Force branch_manager to their assigned branch
      if (role === 'branch_manager' && assignedBranch) {
        setSelectedBranchId(prev => assignedBranch === prev ? prev : assignedBranch);
      } else if (role === 'owner') {
        // Owner can keep 'all' or their previous selection
        // Only reset if current selection is invalid
        const validBranchIds = (branchData || []).map(b => b.id);
        if (selectedBranchId !== 'all' && !validBranchIds.includes(selectedBranchId)) {
          setSelectedBranchId('all');
        }
      }

      // 3. Fetch QR Count
      const { startDate, endDate } = getDateRange(dateRange);

      let qrQuery = supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 🟢 Apply branch filter based on role
      if (role === 'branch_manager' && assignedBranch) {
        qrQuery = qrQuery.eq('branch_id', assignedBranch);
      } else if (selectedBranchId && selectedBranchId !== 'all') {
        qrQuery = qrQuery.eq('branch_id', selectedBranchId);
      }

      const { count, error: qrError } = await qrQuery;

      if (qrError) {
        console.error('⛔ QR Query Error:', qrError);
        throw qrError;
      }

      setQrCount(count || 0);

    } catch (error) {
      console.error('⛔ AdminContext Load Error:', error);
      toast({
        variant: "destructive",
        title: "Veri Yükleme Hatası",
        description: error.message || "Yönetici bilgileri alınamadı."
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, selectedBranchId, dateRange, getDateRange]);

  // 🟢 FETCH NOTIFICATIONS (Centralized)
  const fetchNotifications = useCallback(async () => {
    if (!user || !businessId) return;
    let query = supabase.from('notifications').select('*, feedbacks(feedback_type)').eq('user_id', user.id).eq('business_id', businessId);
    if (userRole === 'branch_manager' && assignedBranchId) query = query.eq('branch_id', assignedBranchId);

    const { data } = await query.order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  }, [user, businessId, userRole, assignedBranchId]);

  // 🟢 CHECK ESCALATED STATUS (Centralized)
  const checkEscalatedStatus = useCallback(async () => {
    if (!businessId) return;
    try {
      let query = supabase.from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'escalated');

      if (userRole === 'branch_manager' && assignedBranchId) {
        query = query.eq('branch_id', assignedBranchId);
      }
      const { count } = await query;
      setEscalatedCount(count || 0);
    } catch (e) {
      console.error(e);
    }
  }, [businessId, userRole, assignedBranchId]);

  // 🟢 MARK AS READ HELPERS
  const markNotificationAsRead = useCallback(async (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    toast({ title: 'Tüm bildirimler okundu.' });
  }, [user, toast]);

  // 🟢 FIX: Split effects to prevent deadlock
  // 1. Initial Data Fetch (Business, Branch, Role)
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setLoading(false);
      setBusinessId(null);
      setBranches([]);
      setUserRole(null);
      setAssignedBranchId(null);
    }
  }, [user, refreshData]);

  // 2. Dependent Data Fetch (Notifications, Escalated) - Runs after businessId is set
  useEffect(() => {
    if (user && businessId) {
      fetchNotifications();
      checkEscalatedStatus();
    } else if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setEscalatedCount(0);
    }
  }, [user, businessId, fetchNotifications, checkEscalatedStatus]);

  // Realtime QR Subscription
  // Realtime QR & Notifications Subscription
  const subscriptionDebounceRef = React.useRef(null);

  useEffect(() => {
    if (!businessId || !user) return;

    // 1. QR Channel
    const qrChannel = supabase
      .channel('admin-qr-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'qr_scans', filter: `business_id=eq.${businessId}` },
        () => {
          refreshData(); // Refresh stats
          toast({
            title: "Yeni QR Tarama!",
            description: "Bir müşteri QR kodunuzu taradı.",
          });
        }
      )
      .subscribe();

    // 2. Notifications Channel
    const notifChannel = supabase.channel('admin-global-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const newNotification = payload.new;
        const isRelevant = userRole === 'branch_manager' ? newNotification.branch_id === assignedBranchId : newNotification.business_id === businessId;

        if (isRelevant) {
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast({ title: `Yeni Bildirim`, description: newNotification.message || 'Yeni bildirim.' });
        }
      })
      .subscribe();

    // 3. Feedback Updates Channel (for Escalated Count & Stats)
    const feedbackChannel = supabase.channel('admin-feedback-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `business_id=eq.${businessId}` }, () => {
        // Debounce to prevent flooding
        if (subscriptionDebounceRef.current) clearTimeout(subscriptionDebounceRef.current);
        subscriptionDebounceRef.current = setTimeout(() => {
          checkEscalatedStatus();
          refreshData(); // Refresh charts/stats too if feedback changes
        }, 1500);
      }).subscribe();

    return () => {
      supabase.removeChannel(qrChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(feedbackChannel);
      if (subscriptionDebounceRef.current) clearTimeout(subscriptionDebounceRef.current);
    };
  }, [businessId, user, toast, refreshData, userRole, assignedBranchId, checkEscalatedStatus]);

  // 🟢 Override setSelectedBranchId to prevent branch_manager from changing branches
  const handleSetSelectedBranchId = useCallback((newBranchId) => {
    if (userRole === 'branch_manager' && assignedBranchId) {
      // Branch managers cannot change branches
      console.warn('Branch managers cannot change branch selection');
      return;
    }
    setSelectedBranchId(newBranchId);
  }, [userRole, assignedBranchId]);

  return (
    <AdminContext.Provider value={{
      businessId,
      businessName,
      businessCreatedAt,
      branches,
      selectedBranchId,
      setSelectedBranchId: handleSetSelectedBranchId, // 🟢 Protected setter
      dateRange,
      setDateRange,
      getDateRange,
      getDateFilterISO,
      qrCount,
      loading,
      refreshData,
      isSpecialOffer,
      monthlyFeeOverride,
      userRole, // 🟢 NEW
      assignedBranchId, // 🟢 NEW
      isOwner: userRole === 'owner',
      isBranchManager: userRole === 'branch_manager',
      // 🟢 Export Notification Data
      notifications,
      unreadCount,
      escalatedCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      checkEscalatedStatus
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
};