import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const handleSession = useCallback((session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      setIsGuest(false);
    }
    setLoading(false);
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
        if (mounted) handleSession(session);
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
      // KRİTİK DÜZELTME: scope: 'local' parametresi eklendi
      // Bu "auth session missing" hatasını önler
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Reset all states
      setIsGuest(false);
      setUser(null);
      setSession(null);

      if (error) {
        // Session missing hatası önemli değil, yine de çıkış yaptır
        if (error.message?.includes('session')) {
          console.warn('Session already cleared:', error);
          return { error: null };
        }
        
        toast({
          variant: "destructive",
          title: "Çıkış Hatası",
          description: error.message || "Bir sorun oluştu",
        });
        return { error };
      }
      
      return { error: null };
    } catch (err) {
      console.error("Sign out error:", err);
      // Hata olsa bile state'i temizle
      setIsGuest(false);
      setUser(null);
      setSession(null);
      return { error: err };
    }
  }, [toast]);

  const loginAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isGuest,
    signUp,
    signIn,
    signOut,
    loginAsGuest,
  }), [user, session, loading, isGuest, signUp, signIn, signOut, loginAsGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};