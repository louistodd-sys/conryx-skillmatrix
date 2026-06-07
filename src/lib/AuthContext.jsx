import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = async (authUser) => {
    if (!authUser) return null;
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role, organisation_id, full_name, status')
      .eq('id', authUser.id)
      .single();
    return profile ? { ...authUser, ...profile } : null;
  };

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on subscribe, so no need for a
    // separate getSession() call — using both causes a double-fetch race.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const merged = await fetchProfile(session.user);
        if (!merged) {
          // Auth user exists but no profile row — trigger may have failed
          setAuthError({ type: 'user_not_registered', message: 'Your account is not registered in this application.' });
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setAuthError(null);
          setUser(merged);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Call this after any operation that updates the user's profile (e.g., onboarding)
  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const merged = await fetchProfile(authUser);
    if (merged) {
      setUser(merged);
      setIsAuthenticated(true);
    }
  }, []);

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await supabase.auth.signOut();
  };

  const navigateToLogin = () => {
    // No-op: App.jsx route guards handle redirect to landing
  };

  const checkAppState = () => {
    // No-op: replaced by Supabase session check via onAuthStateChange
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
