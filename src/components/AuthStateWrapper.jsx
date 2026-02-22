import * as React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const AuthStateWrapper = ({ children }) => {
  const [sessionReady, setSessionReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {


        // 1. Session'ı kontrol et
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('❌ Auth session hatası:', error);
          setAuthChecked(true);
          setSessionReady(true);
          return;
        }

        // 2. Session varsa RLS policy'lerinin aktif olmasını bekle
        if (session?.user) {


          // RLS test query - user'ın verilerine erişebiliyor mu?
          const { error: rlsError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (!mounted) return;

          if (rlsError) {
            console.warn('⚠️ RLS henüz aktif değil, 500ms bekleniyor...', rlsError);
            // RLS policy'leri henüz aktif değil, kısa bir süre bekle
            await new Promise(resolve => setTimeout(resolve, 500));
          }


        } else {

        }

        if (mounted) {
          setAuthChecked(true);
          setSessionReady(true);
        }

      } catch (error) {
        console.error('❌ Auth initialization hatası:', error);
        if (mounted) {
          setAuthChecked(true);
          setSessionReady(true);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Auth kontrolü tamamlanana kadar loading göster
  if (!authChecked || !sessionReady) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-slate-400 text-sm">Oturum başlatılıyor...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthStateWrapper;