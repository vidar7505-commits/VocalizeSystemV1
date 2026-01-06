import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const QRRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
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
          qr_code: qrCode,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });
        
        if (logResult.error) {
            console.error("QR Insert Error:", logResult.error);
        }

        // 3. Kullanıcı Oturumunu Kontrol Et
        const { data: { session } } = await supabase.auth.getSession();

        // Ziyaret edilen işletmeleri tarayıcıya kaydetme (Senin mevcut kodun)
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
          
          // YÖNETİCİ İSE (Mevcut yapı korundu, sadece pending kaydı eklendi)
          if (userType === 'manager') {
            await supabase.auth.signOut({ scope: 'local' });
            
            toast({ 
                title: "Oturum Sonlandırıldı", 
                description: "Müşteri paneline yönlendirilmek üzere Yönetici hesabınızdan çıkış yapılmıştır.",
                duration: 4000 
            });

            // 🔥 EKLENEN KISIM 1: Yönetici çıkış yapıp login'e giderken veri kaybolmasın
            localStorage.setItem('vocalize_pending_qr', JSON.stringify({
                business_id,
                branch_id,
                qr_code: qrCode,
                timestamp: Date.now()
            }));
            // 🔥 BİTİŞ

            setTimeout(() => {
                navigate(`/?business=${business_id}&branch=${branch_id}&qr=${qrCode}&openAuth=true&authTab=login`, { replace: true });
            }, 800);
            return;
          }
          
          // MÜŞTERİ İSE (Aynen korundu)
          const user_id = session.user.id;
          await supabase.from('customer_qr_scans').upsert({ 
              user_id, 
              business_id, 
              branch_id, 
              qr_code: qrCode,
              last_scan_at: new Date().toISOString() 
          }, { 
              onConflict: 'user_id, business_id, branch_id, qr_code' 
          });
          
          navigate(`/customer-panel?business=${business_id}&branch=${branch_id}&from_qr=true`, { replace: true });

        } else {
          // GİRİŞ YAPMAMIŞ / MİSAFİR (Mevcut yapı korundu, sadece pending kaydı eklendi)
          
          // 🔥 EKLENEN KISIM 2: Giriş yapmaya veya misafir olmaya gidiyor. Veriyi cebe atalım.
          localStorage.setItem('vocalize_pending_qr', JSON.stringify({
            business_id,
            branch_id,
            qr_code: qrCode,
            timestamp: Date.now()
          }));
          // 🔥 BİTİŞ

          navigate(`/?business=${business_id}&branch=${branch_id}&qr=${qrCode}&openAuth=true&authTab=login`, { replace: true });
        }

      } catch (err) {
        console.error('QR Process Error:', err);
        const errorMsg = err.message || JSON.stringify(err, null, 2);
        setError('Bağlantı sırasında bir sorun oluştu.');
        setDebugInfo(errorMsg);
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
          <h2 className="text-xl font-bold text-red-500 mb-2">Hata Oluştu</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          
          <div className="mb-4">
            <button 
                onClick={() => setShowDebug(!showDebug)} 
                className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 w-full transition-colors"
            >
                {showDebug ? 'Teknik Detayları Gizle' : 'Teknik Detayları Göster'}
                {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showDebug && (
                <div className="bg-black/50 p-3 rounded-lg text-left mt-2 overflow-auto max-h-48 animate-in slide-in-from-top-2">
                    <p className="text-[10px] text-red-300 font-mono whitespace-pre-wrap break-all">
                        {debugInfo}
                    </p>
                </div>
            )}
          </div>

          <Button onClick={() => window.location.reload()} className="w-full bg-teal-600 hover:bg-teal-700 text-white mb-3">Tekrar Dene</Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">Ana Sayfa</Button>
        </div>
      </div>
    );
  }

  return null;
};

export default QRRedirector;