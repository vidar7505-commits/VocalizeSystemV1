import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle, Copy } from 'lucide-react'; // Copy eklendi
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const QRRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(''); // Hata detayları için
  
  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const processQRScan = async () => {
      try {
        const qrCode = searchParams.get('qr') || searchParams.get('code');

        if (!qrCode) {
          throw new Error("URL'de QR kodu parametresi bulunamadı.");
        }

        // 1. Şube Bilgisini Çek
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, business_id, branch_name_tr, qr_code')
          .eq('qr_code', qrCode)
          .single();

        if (branchError) throw { step: 'Branch Fetch', ...branchError };
        if (!branchData) throw { step: 'Branch Data', message: 'Şube bulunamadı' };

        const { id: branch_id, business_id, branch_name_tr } = branchData;

        // 2. Taramayı Logla
        const logResult = await supabase.from('qr_scans').insert({
          branch_id,
          business_id,
          qr_code,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });
        
        if (logResult.error) {
            console.error("QR Insert Error:", logResult.error);
            // Insert hatası olsa bile akışı kesmeyelim, sadece loglayalım
            // throw { step: 'QR Insert', ...logResult.error }; 
        }

        // 3. Kullanıcı Oturumunu Kontrol Et ve Yönlendir
        const { data: { session } } = await supabase.auth.getSession();

        // LocalStorage
        try {
            const existing = JSON.parse(localStorage.getItem('vocalize_visited_businesses') || '[]');
            if (!existing.includes(business_id)) {
                existing.push(business_id);
                localStorage.setItem('vocalize_visited_businesses', JSON.stringify(existing));
            }
            localStorage.setItem('vocalize_last_business', business_id);
            localStorage.setItem('vocalize_last_branch', branch_id);
        } catch (e) { console.warn("Storage Error", e); }

        if (session) {
          const userType = session.user?.user_metadata?.user_type;
          
          if (userType === 'manager') {
            await supabase.auth.signOut({ scope: 'local' });
            navigate(`/?qr=${qrCode}&business=${business_id}&branch=${branch_id}&openAuth=true&authTab=login`, { replace: true });
            return;
          }
          
          const user_id = session.user.id;
          // Müşteri geçmişini kaydet (Hata verirse yut, kritik değil)
          await supabase.from('customer_qr_scans').upsert({ user_id, business_id, branch_id, qr_code, last_scan_at: new Date().toISOString() }, { onConflict: 'user_id, business_id, branch_id, qr_code' }).then(res => {
              if(res.error) console.error("History Save Error:", res.error);
          });
          
          navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`, { replace: true });

        } else {
          navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&guest=true&from_qr=true`, { replace: true });
        }

      } catch (err) {
        console.error('QR Process Error:', err);
        // Hatayı string'e çevirip ekrana basacağız
        const errorMsg = err.message || JSON.stringify(err, null, 2);
        setError('Bir hata oluştu.');
        setDebugInfo(errorMsg); // Ekrana basılacak detay
        setIsLoading(false);
      }
    };

    processQRScan();
  }, [searchParams, navigate, toast]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4 overflow-auto">
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500/50">
          <div className="bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-500 mb-3">Hata Oluştu</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          
          {/* HATA DETAYLARI (DEBUG İÇİN) */}
          <div className="bg-black/50 p-3 rounded-lg text-left mb-4 overflow-auto max-h-48">
            <p className="text-xs text-red-300 font-mono whitespace-pre-wrap break-all">
                {debugInfo}
            </p>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full bg-slate-700 hover:bg-slate-600 text-white mb-2">Tekrar Dene</Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-slate-600 text-slate-300">Ana Sayfa</Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;