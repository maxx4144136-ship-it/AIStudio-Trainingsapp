import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://puufevhijdyuqpievkds.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SuE-gYcnFf6AZqdbuQeJZg_MrM8Sqyh';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
export const loginWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Listen to auth changes
export const onAuthStateChanged = (callback: (user: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
  return subscription;
};

// Database helpers for workout data
export const getUserData = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data?.data || null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const saveUserData = async (userId: string, data: any) => {
  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data: data,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving user data:", error);
    return false;
  }
};

// Real-time subscription for data changes
export const subscribeToUserData = (userId: string, callback: (data: any) => void) => {
  const channel = supabase
    .channel(`user_data:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new?.data || null);
      }
    )
    .subscribe();
  
  return channel;
};
