import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient'; // Supabase importu

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 1. Konsola sadece hatayı bas (Detayları production'da gizle)
    console.error("⚠️ Uygulama Hatası:", error); 
    this.setState({ errorInfo });

    // 2. LOGLAMA: Hatayı Supabase 'client_errors' tablosuna sessizce gönder
    // await kullanmıyoruz, kullanıcıyı bekletmemek için "fire and forget" yapıyoruz.
    const logErrorToSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.from('client_errors').insert({
          message: error?.toString() || 'Bilinmeyen Hata',
          stack: error?.stack,
          component: errorInfo?.componentStack,
          url: window.location.href,
          user_agent: navigator.userAgent,
          user_id: session?.user?.id || null // Kullanıcı giriş yaptıysa ID'si
        });
      } catch (err) {
        // Loglama servisi çalışmazsa yapacak bir şey yok, uygulamayı kırma
        console.error("Log gönderilemedi", err);
      }
    };

    logErrorToSupabase();
  }

  handleReload = () => {
    // Önbellek temizliği
    try {
      localStorage.removeItem('vocalize_last_business');
      localStorage.removeItem('vocalize_last_branch');
      localStorage.removeItem('vocalize_pending_feedback');
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  handleReport = () => {
    const subject = "Vocalize Hata Bildirimi";
    const body = `Hata: ${this.state.error?.toString()}%0D%0ASayfa: ${window.location.href}`;
    window.location.href = `mailto:destek@vocalize.com?subject=${subject}&body=${body}`;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-6 text-center font-sans">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-300">
            
            <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Bir Şeyler Ters Gitti
            </h2>

            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              İşleminiz sırasında beklenmedik bir sorun oluştu. Teknik ekibimiz durumdan haberdar edildi.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReload} 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6 text-base shadow-lg shadow-teal-900/20"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Sayfayı Yenile
              </Button>

              <Button 
                onClick={this.handleReport} 
                variant="outline"
                className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white py-6"
              >
                <Mail className="w-5 h-5 mr-2" />
                Destek Ekibine Bildir
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default GlobalErrorBoundary;