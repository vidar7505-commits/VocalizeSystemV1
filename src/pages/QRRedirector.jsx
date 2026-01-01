import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const QRRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processQRScan = async () => {
      try {
        // 1️⃣ QR Code parametresini al
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

        // 2️⃣ Supabase'den branch bilgilerini çek
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

        const { id: branch_id, business_id, qr_code, branch_name_tr } = branchData;

        // 3️⃣ Session kontrolü
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // KRİTİK: User type kontrolü
          const userType = session.user?.user_metadata?.user_type;
          
          if (userType === 'manager') {
            // ⚠️ MANAGER HESABI VARSA: Çıkış yap ve auth modal aç
            console.log('🚨 Manager detected on QR scan - signing out and redirecting to auth');
            
            // Session'ı temizle
            await supabase.auth.signOut({ scope: 'local' });
            
            toast({
              title: "Yönetici Hesabı",
              description: "Müşteri paneline erişmek için yönetici hesabından çıkış yapıldı. Lütfen müşteri hesabınızla giriş yapın.",
              variant: "default"
            });
            
            // Business bilgilerini localStorage'a kaydet
            saveBusinessToLocalStorage(business_id);
            
            // Analytics log
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
            
            // LandingPage'e yönlendir ve auth modal aç
            navigate(`/?qr=${qrCode}&business=${business_id}&branch=${branch_id}&openAuth=true&authTab=login`);
            return;
          }
          
          // ✅ CUSTOMER HESABI: Normal flow
          await handleAuthenticatedUser(session, branchData);
        } else {
          // ❌ KAYITSIZ KULLANICI: localStorage'a kaydet ve LandingPage'e yönlendir
          saveBusinessToLocalStorage(business_id);
          
          // Analytics log (guest için)
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

          toast({
            title: "Hoş Geldiniz",
            description: `${branch_name_tr} - Kayıt olmak için lütfen giriş yapın.`,
            variant: "default"
          });

          // LandingPage'e yönlendir ve modal açılsın
          navigate(`/?qr=${qrCode}&business=${business_id}&branch=${branch_id}&openAuth=true`);
        }

      } catch (err) {
        console.error('QR scan error:', err);
        setError('İşlem sırasında bir hata oluştu.');
        setIsLoading(false);
      }
    };

    processQRScan();
  }, [searchParams, navigate, toast]);

  // ✅ KAYITLI CUSTOMER İÇİN İŞLEM
  const handleAuthenticatedUser = async (session, branchInfo) => {
    try {
      const user_id = session.user.id;
      const { id: branch_id, business_id, qr_code, branch_name_tr } = branchInfo;

      // localStorage'a kaydet
      saveBusinessToLocalStorage(business_id);
      localStorage.setItem('vocalize_last_branch', branch_id);

      // customer_qr_scans tablosuna kaydet
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

      // qr_scans (analytics) tablosuna kaydet
      try {
        await supabase.from('qr_scans').insert({
          branch_id,
          business_id,
          qr_code,
          user_agent: navigator.userAgent
        });
      } catch (logError) {
        console.warn('Failed to log analytics scan:', logError);
      }

      toast({
        title: "Hoş Geldiniz",
        description: `✅ ${branch_name_tr} başarıyla seçildi`,
        variant: "default"
      });

      // CustomerPanel'e yönlendir (işletme ve şube otomatik seçili)
      navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`);

    } catch (err) {
      console.error('Auth user handling error:', err);
      toast({
        title: "Hata",
        description: "Yönlendirme sırasında bir sorun oluştu.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // ✅ LOCALSTORAGE'A İŞLETME KAYDET
  const saveBusinessToLocalStorage = (businessId) => {
    try {
      const existingBusinesses = JSON.parse(localStorage.getItem('vocalize_visited_businesses') || '[]');
      if (!existingBusinesses.includes(businessId)) {
        existingBusinesses.push(businessId);
        localStorage.setItem('vocalize_visited_businesses', JSON.stringify(existingBusinesses));
      }
      localStorage.setItem('vocalize_last_business', businessId);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  // ========== RENDER STATES ==========

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <Loader2 className="h-12 w-12 md:h-16 md:w-16 text-teal-500 animate-spin mb-6" />
          <p className="text-slate-400 text-base md:text-lg font-medium text-center">QR kod işleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 pointer-events-none" />
          
          <div className="bg-slate-900/50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border border-slate-700">
            <AlertCircle className="h-8 w-8 md:h-10 md:w-10 text-red-500" />
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-red-500 mb-3">QR Kod Geçersiz</h2>
          <p className="text-slate-400 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">{error}</p>
          
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-teal-500/20 transition-all duration-300"
          >
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;