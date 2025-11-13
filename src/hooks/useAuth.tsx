// hooks/useAuth.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { Session, User } from '@supabase/supabase-js';

// The user state can be:
// - undefined: Initial/Loading
// - null: Logged out
// - User: Logged in
type AuthUser = User | null | undefined;

interface AuthState {
  user: AuthUser;
  session: Session | null;
}

// Custom hook to manage user authentication state
export const useAuth = () => {
  // Initialize user state as 'undefined' to signify loading
  const [authState, setAuthState] = useState<AuthState>({
      user: undefined, 
      session: null
  });

  useEffect(() => {
    // 1. Initial check: Get the current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthState({
          session,
          user: session?.user ?? null // Set to User object or null, ending the loading (undefined) state
      });
    };

    checkSession();
    
    // 2. Listener: Set up subscription for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthState({
          session,
          user: session?.user ?? null
      });
    });

    // 3. Cleanup: CRITICAL for preventing loops
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Return user state and convenience flag for loading
  return { 
      user: authState.user, 
      session: authState.session,
      // The loading flag is true only when user is strictly undefined
      isLoading: authState.user === undefined 
  };
};