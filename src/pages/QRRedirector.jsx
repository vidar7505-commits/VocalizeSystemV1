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
  
  // 🔒 KİLİT MEKANİZMASI: Kodun sadece 1 kere çalışmasını sağlar
  const processingRef = useRef(false);

  useEffect(() => {
    // Eğer işlem zaten başladıysa veya bittiyse durdur.
    if (processingRef.current) return;
    processingRef.current = true;

    const processQRScan = async () => {
      try {
        const qrCode = searchParams.get('qr') || searchParams.get('code');

        if (!qrCode) {
          toast({ variant: "destructive", title: "Hata", description: "Geçersiz QR kod." });
          setTimeout(() => navigate('/'), 2000);
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
          setError('Bu QR kod geçersiz veya silinmiş.');
          setIsLoading(false);
          return;
        }

        const { id: branch_id, business_id, branch_name_tr } = branchData;

        // 2. Taramayı Logla (SAYAÇ İÇİN KRİTİK ADIM)
        // Bu işlem asenkron yapılır, kullanıcıyı bekletmez.
        const logPromise = supabase.from('qr_scans').insert({
          branch_id,
          business_id,
          qr_code,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString() // Zaman damgası emin olmak için
        });
        
        // Hata olsa bile kullanıcıyı engellememek için logPromise'i await etmiyoruz ama console'a basıyoruz
        logPromise.then(({ error }) => {
            if (error) console.error("QR Sayaç Hatası:", error);
        });

        // 3. Kullanıcı Oturumunu Kontrol Et
        const { data: { session } } = await supabase.auth.getSession();

        // LocalStorage İşlemleri (Ziyaret geçmişi için)
        saveBusinessToLocalStorage(business_id);
        localStorage.setItem('vocalize_last_branch', branch_id);

        if (session) {
          const userType = session.user?.user_metadata?.user_type;
          
          if (userType === 'manager') {
            await supabase.auth.signOut({ scope: 'local' });
            toast({ title: "Yönetici Çıkışı", description: "Müşteri paneli için çıkış yapıldı." });
            // Login'e yönlendir
            navigate(`/?qr=${qrCode}&business=${business_id}&branch=${branch_id}&openAuth=true&authTab=login`, { replace: true });
            return;
          }
          
          // Müşteri ise logla ve panele at
          const user_id = session.user.id;
          await supabase.from('customer_qr_scans').insert({ user_id, business_id, branch_id, qr_code, is_guest: false });
          
          toast({ title: "Hoş Geldiniz", description: `${branch_name_tr} şubesi tanımlandı.` });
          
          // 🟢 KRİTİK: from_qr parametresi ile panele git, ama URL'i temiz tut
          navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`, { replace: true });

        } else {
          // Misafir ise
          toast({ title: "Hoş Geldiniz", description: `${branch_name_tr}` });
          // Giriş yapmadan devam et
          navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&guest=true&from_qr=true`, { replace: true });
        }

      } catch (err) {
        console.error('QR Process Error:', err);
        setError('Beklenmeyen bir hata oluştu.');
        setIsLoading(false);
      }
    };

    processQRScan();
  }, [searchParams, navigate, toast]);

  const saveBusinessToLocalStorage = (businessId) => {
    try {
      const existing = JSON.parse(localStorage.getItem('vocalize_visited_businesses') || '[]');
      if (!existing.includes(businessId)) {
        existing.push(businessId);
        localStorage.setItem('vocalize_visited_businesses', JSON.stringify(existing));
      }
      localStorage.setItem('vocalize_last_business', businessId);
    } catch (e) { console.warn(e); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <Loader2 className="h-12 w-12 md:h-16 md:w-16 text-teal-500 animate-spin mb-6" />
          <p className="text-slate-400 text-base md:text-lg font-medium text-center">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500/50">
          <div className="bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-500 mb-3">Hata</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="w-full bg-teal-600 hover:bg-teal-700 text-white">Ana Sayfa</Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;