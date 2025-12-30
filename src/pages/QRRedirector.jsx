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
    const initializeScan = async () => {
      try {
        const qrCode = searchParams.get('qr') || searchParams.get('code');

        if (!qrCode) {
          toast({
            title: "Hata",
            description: "Geçersiz QR kod parametresi.",
            variant: "destructive"
          });
          setError("QR kod parametresi bulunamadı.");
          setIsLoading(false);
          return;
        }

        // 1. Şube Bilgisini Çek
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

        // 2. HAFIZA İŞLEMLERİ (GÜNCELLENDİ)
        // A) Son okutulanı kaydet (Otomatik açılış için)
        localStorage.setItem('vocalize_last_qr', qrCode);
        localStorage.setItem('vocalize_last_business', branchData.business_id);
        localStorage.setItem('vocalize_last_branch', branchData.id);

        // B) "Ziyaret Edilen İşletmeler" listesine ekle (Kalıcılık için)
        const storedVisits = localStorage.getItem('vocalize_visited_businesses');
        let visitedIds = storedVisits ? JSON.parse(storedVisits) : [];
        
        // Eğer listede yoksa ekle
        if (!visitedIds.includes(branchData.business_id)) {
            visitedIds.push(branchData.business_id);
            localStorage.setItem('vocalize_visited_businesses', JSON.stringify(visitedIds));
        }

        // 3. Oturum Kontrolü
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Giriş yapmışsa -> Logla ve Panele git
          await handleAuthenticatedUser(session, branchData);
        } else {
          // Giriş yapmamışsa -> Landing Page'e git ve Modalı aç
          navigate('/', { 
            state: { 
              openAuthModal: true, 
              defaultTab: 'register',
              qrData: branchData 
            } 
          });
        }

      } catch (err) {
        console.error('Scan error:', err);
        setError('İşlem sırasında beklenmedik bir hata oluştu.');
        setIsLoading(false);
      }
    };

    initializeScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleAuthenticatedUser = async (session, branchInfo) => {
    try {
      const user_id = session.user.id;
      const { id: branch_id, business_id, qr_code, branch_name_tr } = branchInfo;

      // Loglama
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
        className: "bg-teal-600 text-white border-none"
      });

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <Loader2 className="h-12 w-12 text-teal-500 animate-spin mb-6" />
          <p className="text-slate-400 text-lg font-medium">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 pointer-events-none" />
          <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-3">QR Kod Geçersiz</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">{error}</p>
          <Button onClick={() => navigate('/')} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-teal-500/20 transition-all duration-300">
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;