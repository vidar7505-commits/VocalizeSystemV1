import * as React from 'react';
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
            const hash = new URLSearchParams(window.location.hash.substring(1));

            const error = query.get('error_description') || query.get('error') ||
                hash.get('error_description') || hash.get('error');

            if (error) {
                console.error('[AuthCallback] Error:', error);
                toast({
                    title: "Giriş Hatası",
                    description: error === 'identity_already_exists'
                        ? "Bu e-posta ile zaten başka bir hesap tanımlı."
                        : error,
                    variant: "destructive"
                });
                navigate(`/${window.location.search}`, { replace: true });
                return;
            }

            // 2. Session'ı Al
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                const search = window.location.search;
                navigate(`/${search}`, { replace: true });
                return;
            }

            // 3. Profili Kontrol Et ve Oluştur (Eğer müşteri ise)
            const user = session.user;
            const userType = user?.user_metadata?.user_type || 'customer'; // Default to customer if not set
            const search = window.location.search;

            if (userType === 'customer') {
                try {
                    // Profili kontrol et
                    const { data: profile, error: profileError } = await supabase
                        .from('customer_profiles')
                        .select('id')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (!profile && !profileError) {
                        // Yeni profil oluştur
                        const name = user.user_metadata?.full_name ||
                            (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : 'Kullanıcı');

                        await supabase.from('customer_profiles').insert({
                            user_id: user.id,
                            name: name,
                            email: user.email,
                            created_at: new Date().toISOString()
                        });
                        console.log('[AuthCallback] Created new customer profile for:', user.email);
                    }
                } catch (profErr) {
                    console.error('[AuthCallback] Profile creation error:', profErr);
                }
            }

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
