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
    // If we have a real session, we are definitely not a guest anymore
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
        // In case of fetch error (e.g. invalid URL or network issue), 
        // we stop loading to prevent infinite loops/hangs.
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
      const { error } = await supabase.auth.signOut();
      
      // Reset guest state on sign out
      setIsGuest(false);

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign out Failed",
          description: error.message || "Something went wrong",
        });
      }
      return { error };
    } catch (err) {
      console.error("Sign out error:", err);
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