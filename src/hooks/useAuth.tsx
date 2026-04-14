import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, AppRole } from "@/types/database";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isVendor: boolean;
  isAffiliate: boolean;
  isPremium: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesData) {
      setRoles(rolesData.map((r) => r.role as AppRole));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          Promise.all([
            fetchProfile(newSession.user.id),
            fetchRoles(newSession.user.id)
          ]).catch((err) => {
            logger.error("Failed to fetch user data", err);
          });
        } else {
          setProfile(null);
          setRoles([]);
        }

        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        Promise.all([
          fetchProfile(existingSession.user.id),
          fetchRoles(existingSession.user.id)
        ]).catch((err) => {
          logger.error("Failed to fetch user data", err);
        });
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null, data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Check email verification
        if (!authUser.email_confirmed_at) {
          await supabase.auth.signOut();
          return { error: new Error("Please verify your email before signing in. Check your inbox for the verification link.") };
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("is_banned, suspended_until")
          .eq("id", authUser.id)
          .single();

        if (prof?.is_banned) {
          await supabase.auth.signOut();
          return { error: new Error("Your account has been permanently banned. Contact support for more information.") };
        }

        if (prof?.suspended_until && new Date(prof.suspended_until) > new Date()) {
          await supabase.auth.signOut();
          const until = new Date(prof.suspended_until).toLocaleDateString();
          return { error: new Error(`Your account is temporarily suspended until ${until}. Contact support for more information.`) };
        }
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      return { error: new Error("No user email found") };
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    return { error: error as Error | null };
  };

  const isAdmin = roles.includes("admin");
  const isEmailVerified = !!user?.email_confirmed_at;

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    isLoading,
    isAdmin,
    isVendor: roles.includes("vendor"),
    isAffiliate: roles.includes("affiliate"),
    isPremium: isAdmin || profile?.vendor_tier === "premium",
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}