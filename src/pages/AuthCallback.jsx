import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function AuthCallback() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const handle = async () => {
            // 1. URL Hatalarını Kontrol Et (Supabase hata ile dönerse)
            const query = new URLSearchParams(window.location.search);
            const error = query.get('error_description') || query.get('error');

            if (error) {
                toast({
                    title: "Giriş Hatası",
                    description: error === 'identity_already_exists'
                        ? "Bu e-posta ile zaten başka bir hesap tanımlı."
                        : error,
                    variant: "destructive"
                });
                navigate('/', { replace: true });
                return;
            }

            // 2. Session'ı Al
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                const search = window.location.search;
                // session henüz gelmemiş olabilir (yavaşlık), bir saniye sonra tekrar dene?
                // Ama handled.current true olduğu için loop'a girmemeli.
                // Basitçe landing'e atalım.
                navigate(`/${search}`, { replace: true });
                return;
            }

            // 3. Çakışan Hesap Kontrolü (User isteği: Email ile kayıtlıysa Google'a izin verme)
            const user = session.user;
            const identities = user?.identities || [];
            const hasEmailIdentity = identities.some(identity => identity.provider === 'email');
            const hasGoogleIdentity = identities.some(identity => identity.provider === 'google');

            // Eğer kullanıcı e-posta/şifre ile kayıtlıysa (hasEmailIdentity)
            // ve Google ile giriş yaptıysa (hasGoogleIdentity)
            // Bu hesapların birleşmesini engellemek için oturumu kapatıyoruz.
            if (hasEmailIdentity && hasGoogleIdentity) {
                await supabase.auth.signOut();
                toast({
                    title: "Hesap Zaten Mevcut",
                    description: "Bu Gmail adresi ile daha önce e-posta ve şifre kullanarak kayıt olunmuş. Lütfen şifrenizle giriş yapın.",
                    variant: "destructive"
                });
                navigate('/', { replace: true });
                return;
            }

            // 4. Normal Yönlendirme
            const userType = user?.user_metadata?.user_type;
            const search = window.location.search;

            if (userType === 'manager') {
                navigate(`/admin-panel${search}`, { replace: true });
            } else {
                navigate(`/customer-panel${search}`, { replace: true });
            }
        };

        // Supabase'in fragment'ları (access_token vs) işlemesi için bekleyelim
        const timer = setTimeout(handle, 500);
        return () => clearTimeout(timer);
    }, [navigate, toast]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] text-white">
            <div className="relative flex flex-col items-center gap-6">
                <div className="relative w-24 h-24 flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-3xl" />
                    <img src="/faviconbeyaz.png" alt="Vocalize" className="w-full h-full object-contain relative z-10" />
                </div>
                <div className="h-1 w-40 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-orange-500 w-1/2"
                        style={{ animation: 'shimmer 1.5s infinite linear' }}
                    />
                </div>
                <p className="text-slate-400 text-sm font-medium tracking-widest uppercase animate-pulse">
                    Yönlendiriliyorsunuz...
                </p>
                <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
            </div>
        </div>
    );
}
