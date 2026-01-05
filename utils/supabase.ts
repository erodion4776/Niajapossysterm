import { createClient } from '@supabase/supabase-js';
import { db } from '../db.ts';

// Real Supabase credentials
const SUPABASE_URL = 'https://rvgqcnwjsrsbwxsgncfw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bOS9YW-wIImt1qOH8DtxyQ_6wn2QrEE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Gets the Shop ID (Request Code). 
 * Checks localStorage first, then syncs with Dexie settings if available.
 */
export const getShopId = (): string => {
  const id = localStorage.getItem('shop_cloud_uuid');
  if (!id) {
    // Fallback/Warning will be handled by the sync engine
    return '';
  }
  return id;
};

export const setShopId = async (id: string) => {
  localStorage.setItem('shop_cloud_uuid', id);
  // Persist to Dexie for cross-clear safety
  try {
    await db.settings.put({ key: 'shop_cloud_uuid', value: id });
  } catch (e) {
    console.error("Failed to save shop_id to Dexie", e);
  }
};

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);