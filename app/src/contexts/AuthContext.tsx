'use client';

import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

import { Session, User } from '@supabase/supabase-js';

import { supabaseClient } from '@/lib/supabase-client';
import { Invitation, Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  hydrated: boolean; // Nuevo estado para controlar la hidratación inicial
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signUpWithInvitation: (
    email: string,
    password: string,
    name: string,
    invitationToken: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  forceSignOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  createInvitation: (
    email: string,
    role: 'admin' | 'manager' | 'athlete',
    personalMessage?: string,
  ) => Promise<{ emailSent: boolean; actionLink?: string; invitationLink?: string }>;
  getInvitations: () => Promise<Invitation[]>;
  deleteInvitation: (invitationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false); // Estado inicial de hidratación

  // Track the last user ID for which we successfully fetched (or confirmed missing) a profile.
  // This prevents re-fetching (and potentially nulling) the profile on every token refresh.
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // Tracks the currently active user ID so stale fetchProfile callbacks (from cross-tab
  // sign-in races) don't overwrite state after a sign-out has already cleared it.
  const currentUserIdRef = useRef<string | null>(null);

  function syncAuthCookies(currentSession: Session | null): void {
    // Best-effort, fire-and-forget — must never block auth initialization.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const fetchOptions: RequestInit = { method: 'POST', signal: controller.signal };
    if (currentSession?.access_token) {
      fetchOptions.headers = {
        Authorization: `Bearer ${currentSession.access_token}`,
        ...(currentSession.refresh_token
          ? { 'X-Refresh-Token': currentSession.refresh_token }
          : {}),
      };
    }

    fetch('/api/auth/sync', fetchOptions)
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          console.warn('Auth cookie sync failed', e);
        }
      })
      .finally(() => clearTimeout(timeout));
  }

  useEffect(() => {
    setMounted(true);

    // Safety net: if Supabase never responds (paused project, wrong env vars,
    // network issue), unblock the UI after 8 seconds instead of staying stuck.
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      setHydrated(true);
    }, 8000);

    // Real Supabase authentication only
    supabaseClient.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(safetyTimeout);
        setSession(session);
        currentUserIdRef.current = session?.user?.id ?? null;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        setLoading(false);
        setHydrated(true); // Marcar como hidratado después de la carga inicial
        // Best-effort: sync cookies after UI is unblocked
        syncAuthCookies(session ?? null);
      })
      .catch((err) => {
        clearTimeout(safetyTimeout);
        console.error('AuthContext: getSession failed, unblocking UI', err);
        setLoading(false);
        setHydrated(true);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      currentUserIdRef.current = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      if (session?.user) {
        // Skip re-fetching the profile when it's just a token refresh for the same user.
        // Without this guard, every TOKEN_REFRESHED / INITIAL_SESSION event triggers a
        // redundant fetchProfile that can race with the initial getSession() call and
        // temporarily null-out the profile, causing the sidebar to vanish.
        if (lastFetchedUserIdRef.current !== session.user.id) {
          // Show loading while we fetch the profile for the new user.
          // This prevents the broken intermediate state (user set, profile null, loading=false)
          // that renders the app shell without a sidebar.
          setLoading(true);
          await fetchProfile(session.user.id);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
      setHydrated(true); // Asegurarse de que esté hidratado en cambios de auth
      // Best-effort: sync cookies after UI is unblocked
      syncAuthCookies(session ?? null);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Treat "no rows" as a valid state (no profile yet — send to onboarding)
        if (
          (error as any).code === 'PGRST116' ||
          error.message?.toLowerCase().includes('no rows')
        ) {
          lastFetchedUserIdRef.current = userId;
          setProfile(null);
          return;
        }
        // For any other error (network, RLS, etc.) leave the existing profile state
        // untouched — a transient failure shouldn't wipe the sidebar.
        console.error('Error fetching profile:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
        });
        return;
      }

      // Guard: if a sign-out (or sign-in as a different user) happened while this fetch
      // was in-flight, discard the result to prevent stale profile from overwriting cleared state.
      if (currentUserIdRef.current !== userId) return;
      lastFetchedUserIdRef.current = userId;
      setProfile(data);
    } catch (error) {
      // Exception during fetch — leave existing profile state untouched.
      const normalizedError =
        error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error('Error fetching profile:', normalizedError);
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Error signing in with Google:', error);
        throw error;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      // Normalize credentials to avoid common input issues
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();

      console.log('AuthContext: Calling Supabase signInWithPassword...');
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        console.error('AuthContext: Supabase signIn error:', error);

        // Provide more user-friendly error messages
        let userMessage = 'Invalid login credentials';
        if (error.message.includes('Invalid login credentials')) {
          userMessage =
            'Email or password is incorrect. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait a moment before trying again.';
        }

        // Create a custom error with a user-friendly message
        const customError = new Error(userMessage);
        customError.name = error.name;
        throw customError;
      }

      console.log(
        'AuthContext: Supabase signIn successful. Session:',
        data.session ? 'Exists' : 'null',
        'User:',
        data.user ? data.user.id : 'null',
      );
      setSession(data.session ?? null);
      currentUserIdRef.current = data.user?.id ?? null;
      setUser(data.user ?? null);
      if (data.user) {
        console.log('AuthContext: User found, fetching profile for ID:', data.user.id);
        await fetchProfile(data.user.id);
      }
      // Sync cookies immediately after sign-in
      await syncAuthCookies(data.session ?? null);
    } catch (error) {
      console.error('AuthContext: Sign in flow error:', error);
      throw error;
    }
  }

  // Restricted registration: only for administrators
  async function signUpWithEmail(email: string, password: string, name?: string) {
    try {
      // Check if an admin user already exists
      const { data: existingAdmins, error: checkError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (checkError) {
        throw new Error('Error checking existing administrators');
      }

      // Only allow registration if there are no administrators or if current user is admin
      if (existingAdmins && existingAdmins.length > 0 && (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin'))) {
        throw new Error(
          'Registration is restricted. Only administrators can create new accounts. Please contact your system administrator for an invitation.',
        );
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: name ? { name } : undefined,
        },
      });

      if (error) {
        console.error('Error signing up with email:', error);
        throw error;
      }

      const requiresEmailConfirmation = !data.session;

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);

        // Create profile automatically for new admin users
        try {
          await createProfileForUser(data.user.id, email, name, 'admin');
          await fetchProfile(data.user.id);
        } catch (profileError) {
          console.warn('Failed to create profile for new admin user:', profileError);
          // Don't fail the signup if profile creation fails
        }
        await syncAuthCookies(data.session);
      }

      return { requiresEmailConfirmation };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Registration with invitation
  async function signUpWithInvitation(
    email: string,
    password: string,
    name: string,
    invitationToken: string,
  ) {
    try {
      // Verify invitation using validation API
      const validationResponse = await fetch(`/api/invitations/validate?token=${invitationToken}`);
      const validationData = await validationResponse.json();

      if (!validationResponse.ok || !validationData.valid) {
        throw new Error(
          validationData.error ||
            'Invalid or expired invitation. Please contact your administrator for a new invitation.',
        );
      }

      // Invitation is valid, proceed with registration
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: { name },
        },
      });

      if (error) {
        console.error('Error signing up with invitation:', error);

        // Handle rate limiting error specifically
        if (error.message && error.message.includes('36 seconds')) {
          throw new Error(
            'Please wait 36 seconds before trying to create another account. This is a Supabase security limit.',
          );
        }

        throw error;
      }

      const requiresEmailConfirmation = !data.session;

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);

        // Create profile with the role from invitation
        try {
          await createProfileForUser(data.user.id, email, name, validationData.role);

          // Mark invitation as accepted (use API for this as well)
          await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: invitationToken,
              userId: data.user.id,
            }),
          });

          await fetchProfile(data.user.id);
        } catch (profileError) {
          console.warn('Failed to create profile for invited user:', profileError);
        }
        await syncAuthCookies(data.session);
      }

      return { requiresEmailConfirmation };
    } catch (error) {
      console.error('Sign up with invitation error:', error);
      throw error;
    }
  }

  async function createProfileForUser(
    userId: string,
    email: string,
    name?: string,
    role: 'admin' | 'manager' | 'athlete' | 'superadmin' = 'athlete',
  ) {
    try {
      const { error } = await supabaseClient.from('profiles').insert({
        id: userId,
        email: email,
        name: name || email.split('@')[0],
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to create profile for user:', error);
      throw error;
    }
  }

  // Invitation management (only for administrators)
  async function createInvitation(
    email: string,
    role: 'admin' | 'manager' | 'athlete',
    personalMessage?: string,
  ): Promise<{ emailSent: boolean; actionLink?: string; invitationLink?: string }> {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'superadmin')) {
      throw new Error('Only administrators and managers can create invitations');
    }

    if (profile.role === 'manager' && role !== 'athlete') {
      throw new Error('Managers can only invite athletes');
    }

    try {
      // All DB writes happen server-side (service role key bypasses RLS)
      const result = await sendInvitationEmail(email, role, personalMessage);
      return { emailSent: !!result?.emailSent, actionLink: result?.actionLink, invitationLink: result?.invitationLink };
    } catch (error) {
      console.error('Failed to create invitation:', error);
      throw error;
    }
  }

  // Function to send invitation email
  async function sendInvitationEmail(
    email: string,
    role: string,
    personalMessage?: string,
  ) {
    if (!user) throw new Error('User not authenticated');
    try {
      // Call API route to send email — DB record creation happens there (service role key)
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
          invitedBy: user.id,
          personalMessage,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send invitation email';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          console.warn('Invitation email API error:', errorData);
        } catch {
          // ignore json parse errors
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Development-only logs
      if (process.env.NODE_ENV !== 'production') {
      console.log('=== INVITATION EMAIL SENT ===');
      console.log('To:', email);
      console.log('Role:', role);
      console.log('Invitation Link:', result.invitationLink);
      console.log('Email Service:', result.emailService);
      console.log('Service Status:', result.serviceStatus);
      console.log('Sent At:', result.sentAt);
        if (typeof result.emailSent !== 'undefined') {
          console.log('Email Sent:', result.emailSent);
        }
        // Avoid logging provider errors to keep console clean in dev
      console.log('=============================');
      }

      if (result && result.emailSent === false) {
        // Treat as success; if actionLink exists, caller may show/copy it.
        return result;
      }

      return result;
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error(
        `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function getInvitations() {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'superadmin')) {
      throw new Error('Only administrators and managers can view invitations');
    }

    try {
      let query = supabaseClient
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile.role === 'manager') {
        query = query.eq('role', 'athlete').eq('invited_by', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      throw error;
    }
  }

  async function deleteInvitation(invitationId: string): Promise<void> {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'superadmin')) {
      throw new Error('Only administrators and managers can delete invitations');
    }

    try {
      const resp = await fetch('/api/invitations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, requestedBy: user!.id }),
      });
      if (!resp.ok) {
        let msg = 'Failed to delete invitation';
        try { const data = await resp.json(); msg = data.error || msg; } catch { /* ignore JSON parse errors */ }
        throw new Error(msg);
      }
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      throw error;
    }
  }

  async function signOut() {
    // Always clear local state and hard-navigate to /login, even if the Supabase
    // signOut call fails (expired session, network error, etc.). This prevents the
    // button from appearing frozen and avoids stale-session limbo across tabs.
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('Error signing out from Supabase (continuing):', err);
    } finally {
      currentUserIdRef.current = null;
      setUser(null);
      setProfile(null);
      setSession(null);
      syncAuthCookies(null);
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }

  async function forceSignOut() {
    try {
      // Try revoke session server-side
      try {
        await supabaseClient.auth.signOut();
      } catch {
        // ignore
      }

      // Clear client storage defensively
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.clear();
          window.sessionStorage.clear();
        }
      } catch {
        // ignore
      }

      // Clear context state and server cookies
      setUser(null);
      setProfile(null);
      setSession(null);
      await syncAuthCookies(null);
    } catch (error) {
      console.error('Force sign out error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;

    try {
      // Real user - update in Supabase
      const { data, error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    hydrated, // Exponer el nuevo estado
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signUpWithInvitation,
    signOut,
    forceSignOut,
    updateProfile,
    createInvitation,
    getInvitations,
    deleteInvitation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
