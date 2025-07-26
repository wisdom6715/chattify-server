import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv"

dotenv.config();
// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Database table names
export const TABLES = {
  USERS: 'users',
  FRIENDS: 'friends',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group_members'
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  return {
    success: false,
    message: error.message || 'An error occurred',
    error: error
  };
};

// Helper function to handle successful responses
export const handleSupabaseSuccess = (data, message = 'Operation successful') => {
  return {
    success: true,
    data: data,
    message: message
  };
};