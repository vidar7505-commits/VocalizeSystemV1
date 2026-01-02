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

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  
  const [dateRange, setDateRange] = useState('last7'); 

  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Date Range Helper - GÜNCELLENDİ (Timezone Fix)
  const getDateRange = useCallback((range) => {
    const endDate = new Date();
    let startDate = new Date();
    
    // 🟢 DÜZELTME: Bitiş tarihini günün son milisaniyesine sabitle (Timezone Fix)
    endDate.setHours(23, 59, 59, 999);
    
    // Başlangıç saatini günün ilk anına çek
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

  // Main Data Fetcher
  const refreshData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Fetch Manager & Business
      const { data: profileData, error: profileError } = await supabase
        .from('manager_profiles')
        .select('business_id, businesses(business_name, created_at, is_special_offer, monthly_fee_override)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setLoading(false);
        return;
      }

      const bId = profileData.business_id;
      setBusinessId(bId);
      setBusinessName(profileData.businesses?.business_name || 'İşletmem');
      setBusinessCreatedAt(profileData.businesses?.created_at);
      setIsSpecialOffer(profileData.businesses?.is_special_offer || false);
      setMonthlyFeeOverride(profileData.businesses?.monthly_fee_override);

      // 2. Fetch Branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, branch_name_tr')
        .eq('business_id', bId)
        .eq('is_active', true)
        .order('branch_name_tr');

      if (branchError) throw branchError;
      setBranches(branchData || []);

      // 3. Fetch QR Count - TEMİZLENDİ (Loglar kaldırıldı)
      const { startDate, endDate } = getDateRange(dateRange);

      let qrQuery = supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Şube filtresi varsa uygula
      if (selectedBranchId && selectedBranchId !== 'all') {
        qrQuery = qrQuery.eq('branch_id', selectedBranchId);
      }

      const { count, error: qrError } = await qrQuery;
      
      if (qrError) {
        console.error('❌ QR Query Error:', qrError);
        throw qrError;
      }
      
      setQrCount(count || 0);

    } catch (error) {
      console.error('❌ AdminContext Load Error:', error);
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

  return (
    <AdminContext.Provider value={{
      businessId,
      businessName,
      businessCreatedAt,
      branches,
      selectedBranchId,
      setSelectedBranchId,
      dateRange,
      setDateRange,
      getDateRange,
      getDateFilterISO,
      qrCount,
      loading,
      refreshData,
      isSpecialOffer,
      monthlyFeeOverride
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