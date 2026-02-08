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

      setBusinessId(bId);
      setBusinessName(profileData.businesses?.business_name || 'İşletmem');
      setBusinessCreatedAt(profileData.businesses?.created_at);
      setIsSpecialOffer(profileData.businesses?.is_special_offer || false);
      setMonthlyFeeOverride(profileData.businesses?.monthly_fee_override);
      setUserRole(role);
      setAssignedBranchId(assignedBranch);

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
      setBranches(branchData || []);

      // 🟢 Force branch_manager to their assigned branch
      if (role === 'branch_manager' && assignedBranch) {
        setSelectedBranchId(assignedBranch);
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

  // Realtime QR Subscription
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('admin-qr-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'qr_scans', filter: `business_id=eq.${businessId}` },
        () => {
          refreshData();
          toast({
            title: "Yeni QR Tarama!",
            description: "Bir müşteri QR kodunuzu taradı.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, toast, refreshData]);

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
      isOwner: userRole === 'owner', // 🟢 NEW: Helper
      isBranchManager: userRole === 'branch_manager' // 🟢 NEW: Helper
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