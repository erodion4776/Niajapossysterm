import { createClient } from '@supabase/supabase-js';

// Real Supabase credentials provided for this project
const SUPABASE_URL = 'https://rvgqcnwjsrsbwxsgncfw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bOS9YW-wIImt1qOH8DtxyQ_6wn2QrEE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Gets or generates a unique Cloud UUID for this shop.
 * This is the primary identifier for records in the Supabase cloud tables.
 * For NaijaShop, the Boss's "Request Code" is typically used as the Shop ID.
 */
export const getShopId = (): string => {
  return localStorage.getItem('shop_cloud_uuid') || '';
};

export const setShopId = (id: string) => {
  localStorage.setItem('shop_cloud_uuid', id);
};

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);