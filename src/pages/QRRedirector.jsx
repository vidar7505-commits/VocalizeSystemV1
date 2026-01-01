import React, { useEffect, useState, useRef } from 'react';
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
  
  // 🟢 DÜZELTME: Strict Mode için Ref eklendi (Sadece 1 kez çalışır)
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Eğer daha önce işlendiyse dur
    if (hasProcessed.current) return;

    const processQRScan = async () => {
      try {
        hasProcessed.current = true; // Flag'i hemen işaretle

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

        // Branch bilgilerini çek
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

        const { id: branch_id, business_id, branch_name_tr } = branchData;

        // Session kontrolü
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const userType = session.user?.user_metadata?.user_type;
          
          if (userType === 'manager') {
            await supabase.auth.signOut({ scope: 'local' });
            
            toast({
              title: "Yönetici Hesabı",
              description: "Yönetici hesabından çıkış yapıldı. Lütfen müşteri hesabıyla giriş yapın.",
              variant: "default"
            });
            
            saveBusinessToLocalStorage(business_id);
            await logScan(branch_id, business_id, qrCode);
            
            navigate(`/?qr=${qrCode}&business=${business_id}&branch=${branch_id}&openAuth=true&authTab=login`, { replace: true });
            return;
          }
          
          await handleAuthenticatedUser(session, branchData);
        } else {
          // Misafir (Guest) Akışı
          saveBusinessToLocalStorage(business_id);
          await logScan(branch_id, business_id, qrCode);

          toast({
            title: "Hoş Geldiniz",
            description: `${branch_name_tr} - Kayıt olmak için lütfen giriş yapın.`,
            variant: "default"
          });

          // URL'den QR parametresini temizleyerek yönlendir (Sayım tekrarlanmasın diye)
          navigate(`/?business=${business_id}&branch=${branch_id}&openAuth=true`, { replace: true });
        }

      } catch (err) {
        console.error('QR scan error:', err);
        setError('İşlem sırasında bir hata oluştu.');
        setIsLoading(false);
      }
    };

    processQRScan();
  }, [searchParams, navigate, toast]);

  // ✅ ANALYTICS LOGGING (Tekilleştirilmiş fonksiyon)
  const logScan = async (branchId, businessId, qrCode) => {
    try {
      await supabase.from('qr_scans').insert({
        branch_id: branchId,
        business_id: businessId,
        qr_code: qrCode,
        user_agent: navigator.userAgent
      });
    } catch (e) {
      console.warn("Analytics log failed", e);
    }
  };

  const handleAuthenticatedUser = async (session, branchInfo) => {
    try {
      const user_id = session.user.id;
      const { id: branch_id, business_id, qr_code, branch_name_tr } = branchInfo;

      saveBusinessToLocalStorage(business_id);
      localStorage.setItem('vocalize_last_branch', branch_id);

      // Customer scan log
      const { error: scanError } = await supabase
        .from('customer_qr_scans')
        .insert({
          user_id,
          business_id,
          branch_id,
          qr_code,
          is_guest: false
        });

      if (scanError) console.warn('Failed to log customer QR scan:', scanError);

      // Analytics Log (Burada da çağırıyoruz çünkü bu bir authenticated scan)
      await logScan(branch_id, business_id, qr_code);

      toast({
        title: "Hoş Geldiniz",
        description: `✅ ${branch_name_tr} başarıyla seçildi`,
        variant: "default"
      });

      // Temiz URL ile yönlendir
      navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`, { replace: true });

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
          <Button onClick={() => navigate('/')} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-teal-500/20 transition-all duration-300">
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;