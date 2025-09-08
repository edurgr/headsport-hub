'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';
import { Profile, Invitation } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  hydrated: boolean; // Nuevo estado para controlar la hidratación inicial
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signUpWithInvitation: (email: string, password: string, name: string, invitationToken: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  createInvitation: (email: string, role: 'manager' | 'athlete', personalMessage?: string) => Promise<void>;
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

  async function syncAuthCookies(currentSession: Session | null) {
    try {
      if (currentSession?.access_token) {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${currentSession.access_token}`,
        };
        if (currentSession.refresh_token) {
          headers['X-Refresh-Token'] = currentSession.refresh_token;
        }
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers,
        });
      } else {
        await fetch('/api/auth/sync', { method: 'POST' });
      }
    } catch (e) {
      // Best-effort cookie sync; do not block UI
      console.warn('Auth cookie sync failed', e);
    }
  }

  useEffect(() => {
    setMounted(true);
    // Real Supabase authentication only
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      // Ensure SSR/middleware can see the session
      await syncAuthCookies(session ?? null);
      setLoading(false);
      setHydrated(true); // Marcar como hidratado después de la carga inicial
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      // Keep cookies in sync on every auth state change
      await syncAuthCookies(session ?? null);
      setLoading(false);
      setHydrated(true); // Asegurarse de que esté hidratado en cambios de auth
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Treat "no rows" as a valid state (no profile yet)
        if ((error as any).code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
          setProfile(null);
          return;
        }
        console.error('Error fetching profile:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      const normalizedError = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
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
          userMessage = 'Email or password is incorrect. Please check your credentials and try again.';
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

      console.log('AuthContext: Supabase signIn successful. Session:', data.session ? 'Exists' : 'null', 'User:', data.user ? data.user.id : 'null');
      setSession(data.session ?? null);
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
      if (existingAdmins && existingAdmins.length > 0 && (!profile || profile.role !== 'admin')) {
        throw new Error('Registration is restricted. Only administrators can create new accounts. Please contact your system administrator for an invitation.');
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
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
  async function signUpWithInvitation(email: string, password: string, name: string, invitationToken: string) {
    try {
      // Verify invitation using validation API
      const validationResponse = await fetch(`/api/invitations/validate?token=${invitationToken}`);
      const validationData = await validationResponse.json();

      if (!validationResponse.ok || !validationData.valid) {
        throw new Error(validationData.error || 'Invalid or expired invitation. Please contact your administrator for a new invitation.');
      }

      // Invitation is valid, proceed with registration
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: { name },
        },
      });

      if (error) {
        console.error('Error signing up with invitation:', error);
        
        // Handle rate limiting error specifically
        if (error.message && error.message.includes('36 seconds')) {
          throw new Error('Please wait 36 seconds before trying to create another account. This is a Supabase security limit.');
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
              userId: data.user.id
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

  async function createProfileForUser(userId: string, email: string, name?: string, role: 'admin' | 'manager' | 'athlete' = 'athlete') {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          name: name || email.split('@')[0],
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
  async function createInvitation(email: string, role: 'manager' | 'athlete', personalMessage?: string): Promise<void> {
    if (!profile || profile.role !== 'admin') {
      throw new Error('Only administrators can create invitations');
    }

    try {
      // First check if an invitation already exists for this email
      const { data: existingInvitation, error: checkError } = await supabaseClient
        .from('invitations')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing invitation:', checkError);
        throw new Error('Failed to check existing invitation');
      }

      if (existingInvitation) {
        // If an invitation already exists, check its status
        if (existingInvitation.status === 'pending') {
          // If pending, check if it hasn't expired
          if (new Date(existingInvitation.expires_at) > new Date()) {
            throw new Error(`An invitation for ${email} already exists and is still valid. It expires on ${new Date(existingInvitation.expires_at).toLocaleDateString()}.`);
          } else {
            // If expired, update the existing invitation
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

            const { error: updateError } = await supabaseClient
              .from('invitations')
              .update({
                role: role,
                invited_by: user!.id,
                token: token,
                expires_at: expiresAt.toISOString(),
                status: 'pending',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingInvitation.id);

            if (updateError) {
              console.error('Error updating expired invitation:', updateError);
              throw new Error('Failed to update expired invitation');
            }

            // Send email with new invitation
            await sendInvitationEmail(email, role, token, personalMessage);
            return; // Invitation updated successfully
          }
        } else if (existingInvitation.status === 'accepted') {
          throw new Error(`User ${email} has already accepted an invitation and has an account.`);
        } else {
          // Si está expirada, actualizarla
          const token = crypto.randomUUID();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const { error: updateError } = await supabaseClient
            .from('invitations')
            .update({
              role: role,
              invited_by: user!.id,
              token: token,
              expires_at: expiresAt.toISOString(),
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInvitation.id);

          if (updateError) {
            console.error('Error updating expired invitation:', updateError);
            throw new Error('Failed to update expired invitation');
          }

          // Send email with new invitation
          await sendInvitationEmail(email, role, token, personalMessage);
          return; // Invitation updated successfully
        }
      }

      // If it doesn't exist or can be reused, create a new one
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error } = await supabaseClient
        .from('invitations')
        .insert({
          email,
          role,
          invited_by: user!.id,
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        });

      if (error) {
        console.error('Error creating invitation:', error);
        throw error;
      }

      // Send email with new invitation
      await sendInvitationEmail(email, role, token, personalMessage);

    } catch (error) {
      console.error('Failed to create invitation:', error);
      throw error;
    }
  }

  // Function to send invitation email
  async function sendInvitationEmail(email: string, role: string, token: string, personalMessage?: string) {
    try {
      // Call API route to send email
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
          token,
          invitedBy: user!.id,
          personalMessage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation email');
      }

      const result = await response.json();
      
      // Mostrar información en consola para desarrollo
      console.log('=== INVITATION EMAIL SENT ===');
      console.log('To:', email);
      console.log('Role:', role);
      console.log('Invitation Link:', result.invitationLink);
      console.log('Email Service:', result.emailService);
      console.log('Service Status:', result.serviceStatus);
      console.log('Sent At:', result.sentAt);
      console.log('=============================');

      return result;

    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error(`Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function getInvitations() {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
      throw new Error('Only administrators and managers can view invitations');
    }

    try {
      let query = supabaseClient
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      // For managers, only show athlete invitations
      // For admins, show all invitations
      if (profile.role === 'manager') {
        query = query.eq('role', 'athlete');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching invitations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      throw error;
    }
  }

  async function deleteInvitation(invitationId: string): Promise<void> {
    if (!profile || profile.role !== 'admin') {
      throw new Error('Only administrators can delete invitations');
    }

    try {
      const { error } = await supabaseClient
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('Error deleting invitation:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      // Sign out from Supabase if real user
      if (session) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error('Error signing out:', error);
          throw error;
        }
      }

      // Clear state
      setUser(null);
      setProfile(null);
      setSession(null);
      await syncAuthCookies(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
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
