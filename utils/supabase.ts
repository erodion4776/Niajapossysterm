
import { createClient } from '@supabase/supabase-js';

// Real Supabase credentials provided for this project
const SUPABASE_URL = 'https://rvgqcnwjsrsbwxsgncfw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bOS9YW-wIImt1qOH8DtxyQ_6wn2QrEE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Gets or generates a unique Cloud UUID for this shop.
 * This is the primary identifier for records in the Supabase cloud tables.
 */
export const getShopId = (): string => {
  let shopId = localStorage.getItem('shop_cloud_uuid');
  if (!shopId) {
    shopId = crypto.randomUUID();
    localStorage.setItem('shop_cloud_uuid', shopId);
  }
  return shopId;
};

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
