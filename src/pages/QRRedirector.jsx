import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';

const QRRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const initializeScan = async () => {
      try {
        // 1. Get 'qr' parameter from URL
        // Support both 'qr' and 'code' just in case, prioritizing 'qr' as requested
        const qrCode = searchParams.get('qr') || searchParams.get('code');

        if (!qrCode) {
          toast({
            title: "Hata",
            description: "Geçersiz QR kod parametresi.",
            variant: "destructive"
          });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // 2. Query Supabase branches table
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, business_id, branch_name_tr, qr_code')
          .eq('qr_code', qrCode)
          .single();

        if (branchError || !branchData) {
          console.error('Branch fetch error:', branchError);
          setError('Bu QR kod geçersiz veya sistemde kayıtlı değil.');
          setIsLoading(false);
          return;
        }

        // 3. SAVE DATA TO LOCALSTORAGE (CRITICAL) - YENİ EKLENEN
        localStorage.setItem('vocalize_last_qr', qrCode);
        localStorage.setItem('vocalize_last_business', branchData.business_id);
        localStorage.setItem('vocalize_last_branch', branchData.id);

        // 3.1. VISITED BUSINESSES ARRAY'İNİ GÜNCELLE
        try {
          const visitedBusinessesJson = localStorage.getItem('vocalize_visited_businesses');
          let visitedBusinesses = visitedBusinessesJson ? JSON.parse(visitedBusinessesJson) : [];
          
          // Eğer bu business_id zaten dizide yoksa ekle
          if (!visitedBusinesses.includes(branchData.business_id)) {
            visitedBusinesses.push(branchData.business_id);
            localStorage.setItem('vocalize_visited_businesses', JSON.stringify(visitedBusinesses));
          }
        } catch (e) {
          console.warn('Failed to update visited businesses:', e);
        }

        // Store branch data
        setQrData(branchData);

        // 4. Check authentication status
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // A) User logged in
          await handleAuthenticatedUser(session, branchData);
        } else {
          // B) User not logged in - Redirect to Landing Page with state
          navigate('/', { 
            state: { 
              openAuthModal: true, 
              defaultTab: 'register',
              qrData: branchData 
            },
            replace: true
          });
        }

      } catch (err) {
        console.error('Scan error:', err);
        setError('İşlem sırasında bir hata oluştu.');
        setIsLoading(false);
      }
    };

    initializeScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  const handleAuthenticatedUser = async (session, branchInfo) => {
    try {
      setIsProcessing(true);
      const user_id = session.user.id;
      const { id: branch_id, business_id, qr_code, branch_name_tr } = branchInfo;

      // Insert into customer_qr_scans
      const { error: scanError } = await supabase
        .from('customer_qr_scans')
        .insert({
          user_id,
          business_id,
          branch_id,
          qr_code,
          is_guest: false
        });

      if (scanError) {
        console.warn('Failed to log customer QR scan:', scanError);
      }

      // Insert into qr_scans (general analytics)
      try {
        await supabase.from('qr_scans').insert({
          branch_id,
          business_id,
          qr_code,
        });
      } catch (logError) {
        console.warn('Failed to log analytics scan:', logError);
      }

      toast({
        title: "Hoş Geldiniz",
        description: `✅ QR kod başarıyla okundu - ${branch_name_tr}`,
        variant: "default"
      });

      // Redirect to customer panel
      navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`);

    } catch (err) {
      console.error('Auth user handling error:', err);
      toast({
        title: "Hata",
        description: "Yönlendirme sırasında bir sorun oluştu.",
        variant: "destructive"
      });
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleGuestContinue = async () => {
    if (!qrData) return;

    try {
      setIsProcessing(true);
      setShowAuthModal(false);
      setIsLoading(true); // Show loading spinner again while processing guest

      const { id: branch_id, business_id, qr_code } = qrData;

      // Attempting analytics log only to avoid blocking user with database constraints
      try {
         await supabase.from('qr_scans').insert({
          branch_id,
          business_id,
          qr_code,
          user_agent: navigator.userAgent
        });
      } catch (e) {
        console.warn("Analytics log failed", e);
      }

      // Insert into customer_qr_scans for guest (if table allows null user_id/profile_id)
      try {
         await supabase
        .from('customer_qr_scans')
        .insert({
          business_id,
          branch_id,
          qr_code,
          is_guest: true
          // user_id and customer_profile_id left null
        });
      } catch (e) {
        console.warn("Guest scan log failed", e);
      }

      toast({
        title: "Misafir Modu",
        description: "Misafir olarak devam ediyorsunuz.",
      });

      navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&guest=true&from_qr=true`);

    } catch (err) {
      console.error('Guest continue error:', err);
      toast({
        title: "Hata",
        description: "Misafir girişi sırasında bir sorun oluştu.",
        variant: "destructive"
      });
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  const handleModalClose = async () => {
    setShowAuthModal(false);
    setIsLoading(true);
    
    // Check if user logged in via modal
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && qrData) {
       handleAuthenticatedUser(session, qrData);
    } else {
       // User closed modal without logging in and didn't choose guest
       // Redirect to home or stay on loading/error?
       // Let's redirect to home for better UX
       navigate('/'); 
    }
  };

  // RENDER STATES

  if (isLoading || isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <Loader2 className="h-12 w-12 text-teal-500 animate-spin mb-6" />
          <p className="text-slate-400 text-lg font-medium">QR kod işleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500/50 relative overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 pointer-events-none" />
          
          <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-red-500 mb-3">QR Kod Geçersiz</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">{error}</p>
          
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-teal-500/20 transition-all duration-300"
          >
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  // Eğer buraya gelindiyse, kullanıcı zaten yönlendirilmiş demektir
  // Bu kısım artık erişilmemeli ama güvenlik için null döndürelim
  return null;
};

export default QRRedirector;