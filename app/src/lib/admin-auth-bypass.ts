// import { NextRequest } from 'next/server';
import { supabaseServer } from './supabase-server';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export async function verifyAdminAccessBypass(): Promise<{ 
  success: true; 
  user: AdminUser; 
} | { 
  success: false; 
  error: string; 
  status: number; 
}> {
  try {
    const supabase = await supabaseServer();
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'Authentication failed', 
        status: 401 
      };
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return { 
        success: false, 
        error: 'User profile not found', 
        status: 404 
      };
    }
    
    // Check if user is admin (bypass for backup operations)
    if (profile.role !== 'admin') {
      return { 
        success: false, 
        error: 'Admin access required', 
        status: 403 
      };
    }
    
    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role
      }
    };
    
  } catch (error) {
    console.error('Error in verifyAdminAccessBypass:', error);
    return { 
      success: false, 
      error: 'Internal server error', 
      status: 500 
    };
  }
}
