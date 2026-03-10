import { createClient } from '@supabase/supabase-js';

// these env vars must be defined in development and in production
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(url, key);
