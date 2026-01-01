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
  
  // 🟢 DÜZELTME 1: Varsayılan tarih 'last7' (Son 7 Gün) yapıldı.
  const [dateRange, setDateRange] = useState('last7'); 

  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Date Range Helper
  const getDateRange = useCallback((range) => {
    const endDate = new Date();
    let startDate = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    switch (range) {
      case 'today': 
      case 'Bugün': 
        break; 
      case 'last7':
      case 'Son 7 Gün': 
        startDate.setDate(endDate.getDate() - 7); 
        break;
      case 'last30':
      case 'Son 30 Gün': 
        startDate.setDate(endDate.getDate() - 30); 
        break;
      case 'last90':
      case 'Son 90 Gün': 
        startDate.setDate(endDate.getDate() - 90); 
        break;
      case 'thisMonth':
      case 'Bu Ay': 
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); 
        break;
      case 'allTime': 
      case 'Tüm Zamanlar':
        // Başlangıç tarihini çok eskiye çek
        startDate = new Date(2000, 0, 1);
        break;
      default: 
        startDate.setDate(endDate.getDate() - 7); 
        break;
    }

    return { startDate, endDate };
  }, [businessCreatedAt]);

  const getDateFilterISO = useCallback((range) => {
    if (range === 'allTime' || range === 'Tüm Zamanlar') {
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

      // 🟢 DÜZELTME 2: QR Count Sorgusu (Tarih Filtresi Kaldırıldı)
      // Artık tarih ne seçilirse seçilsin TOPLAM tarama sayısını getirir.
      let qrQuery = supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bId);

      // NOT: qrQuery.gte(...) satırı kaldırıldı. 
      // Böylece header'daki sayaç her zaman "Tüm Zamanlar"ı gösterir.

      if (selectedBranchId && selectedBranchId !== 'all') {
        qrQuery = qrQuery.eq('branch_id', selectedBranchId);
      }

      const { count, error: qrError } = await qrQuery;
      if (qrError) throw qrError;
      setQrCount(count || 0);

    } catch (error) {
      console.error('AdminContext Load Error:', error);
      toast({
        variant: "destructive",
        title: "Veri Yükleme Hatası",
        description: "Yönetici bilgileri alınamadı."
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, selectedBranchId]); // getDateFilterISO ve dateRange dependency'den çıkarıldı çünkü QR için kullanmıyoruz artık

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