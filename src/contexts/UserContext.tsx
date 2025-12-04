"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/utils/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  session: null,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const supabase = createClient();
      // Use getUser() to ensure we get fresh session data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      // Also get session for detailed session info
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // If both getUser and getSession fail, clear the session
      if (userError && sessionError && !session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      // Prefer user from getUser() as it's more reliable, fallback to session.user
      const finalUser = user || session?.user || null;
      setSession(session);
      setUser(finalUser);
      setLoading(false);
    } catch (error) {
      console.error("Error refreshing session:", error);
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    refreshSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  // Refresh session when coming from auth callback with refresh param
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const refresh = urlParams.get("refresh");

    if (refresh === "true") {
      // Small delay to ensure cookies are set after server redirect
      const timer = setTimeout(() => {
        refreshSession();
        // Clean up URL by removing refresh param
        urlParams.delete("refresh");
        const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
        window.history.replaceState({}, "", newUrl);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [refreshSession]);

  return (
    <UserContext.Provider
      value={{ user, session, loading, refresh: refreshSession }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export async function getProfileID() {
  const supabase = createClient();

  // Get the currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  // Query profile row for matching UUID
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .single();

  if (error) {
    console.log("authID: ", user.id);
    console.error("Failed to fetch profile ID:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function getUserTeams() {
  const pID = await getProfileID();

  const supabase = createClient();

  // Get the currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  // Query profile row for matching UUID
  const { data, error } = await supabase
    .from("profiles")
    .select("teams")
    .eq("id", pID)
    .single();

  if (error) {
    console.log("authID: ", user.id);
    console.error("Failed to fetch profile permissions:", error);
    return null;
  }

  return data?.teams ?? null;
}

export async function isAdmin() {
  const teams = await getUserTeams();
  if (!teams) return null;

  return teams?.includes("admin") ?? false;
}
