import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { clearVocalizeCache } from '@/lib/cacheUtils'; // ✅ YENİ SATIR

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Flag to prevent onAuthStateChange from overriding manual loading state during sign out
  const isSigningOut = useRef(false);

  const handleSession = useCallback((session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      setIsGuest(false);
      localStorage.removeItem('vocalize_guest_mode');

      // Fetch onboarding status for managers
      const fetchOnboardingStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('manager_profiles')
            .select('has_seen_onboarding')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!error && data) {
            setHasSeenOnboarding(data.has_seen_onboarding);
          }
        } catch (err) {
          console.error("Error fetching onboarding status:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchOnboardingStatus();
    } else {
      setIsGuest(true); // Default or reset
      setHasSeenOnboarding(false);
      // Check if guest mode was previously active
      const guestMode = localStorage.getItem('vocalize_guest_mode');
      if (guestMode === 'true') {
        setIsGuest(true);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) handleSession(session);
      } catch (error) {
        console.error("Auth session fetch error:", error);
        if (mounted) setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Don't process auth changes if we are manually handling sign out
        if (mounted && !isSigningOut.current) handleSession(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign up Failed",
          description: error.message || "Something went wrong",
        });
      }
      return { error };
    } catch (err) {
      console.error("Sign up error:", err);
      return { error: err };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign in Failed",
          description: error.message || "Something went wrong",
        });
      }
      return { error };
    } catch (err) {
      console.error("Sign in error:", err);
      return { error: err };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      isSigningOut.current = true;
      setLoading(true); // Start loading UI

      // ✅ YENİ: Cache temizle (logout öncesi)
      clearVocalizeCache();

      // KRİTİK DÜZELTME: scope: 'local' parametresi eklendi
      // Bu "auth session missing" hatasını önler
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      // Reset all states
      setIsGuest(false);
      setUser(null);
      setSession(null);

      // Force a small delay to let the loading screen be seen and ensuring smooth transition
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (error) {
        // Session missing hatası önemli değil, yine de çıkış yaptır
        if (error.message?.includes('session')) {
          console.warn('Session already cleared:', error);
          isSigningOut.current = false;
          setLoading(false);
          return { error: null };
        }

        toast({
          variant: "destructive",
          title: "Çıkış Hatası",
          description: error.message || "Bir sorun oluştu",
        });
        isSigningOut.current = false;
        setLoading(false);
        return { error };
      }

      isSigningOut.current = false;
      setLoading(false);
      return { error: null };
    } catch (err) {
      console.error("Sign out error:", err);
      // Hata olsa bile state'i temizle
      setIsGuest(false);
      setUser(null);
      setSession(null);
      isSigningOut.current = false;
      setLoading(false);
      return { error: err };
    }
  }, [toast]);

  const loginAsGuest = useCallback(async () => {
    // 🟢 KRİTİK DÜZELTME: Eğer aktif bir kullanıcı oturumu varsa, misafir girişinden önce onu temizle.
    // Bu, misafir panelinde eski kullanıcı verilerinin görünmesini engeller.
    if (user || session) {
      isSigningOut.current = true;
      try {
        await supabase.auth.signOut({ scope: 'local' });
        // State'leri hemen temizle
        setUser(null);
        setSession(null);
      } catch (err) {
        console.error("Session clear error during guest login:", err);
      } finally {
        isSigningOut.current = false;
      }
    }

    setIsGuest(true);
    localStorage.setItem('vocalize_guest_mode', 'true'); // Persistent guest mode
  }, [user, session]);

  // 🟢 YENİ: Onboarding durumunu güncelleme
  const updateOnboardingStatus = useCallback(async (status) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('manager_profiles')
        .update({ has_seen_onboarding: status })
        .eq('user_id', user.id);

      if (error) throw error;
      setHasSeenOnboarding(status);
    } catch (err) {
      console.error("Error updating onboarding status:", err);
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isGuest,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    updateOnboardingStatus,
    signUp,
    signIn,
    signOut,
    loginAsGuest,
  }), [user, session, loading, isGuest, hasSeenOnboarding, updateOnboardingStatus, signUp, signIn, signOut, loginAsGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};