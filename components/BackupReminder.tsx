import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../db.ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload, AlertCircle, X, Loader2, ShieldAlert } from 'lucide-react';
import { backupToWhatsApp } from '../utils/whatsapp.ts';
import { BackupSuccessModal } from './BackupSuccessModal.tsx';

// 6. EXTRACT CONSTANTS
const BACKUP_REMINDER_HOUR = 17;
const MIN_SALES_FOR_REMINDER = 5;
const CHECK_INTERVAL_MS = 60000;

// 9. ADD TypeScript interface for backup result
interface BackupResult {
  success: boolean;
  method?: 'DOWNLOAD' | 'SHARE' | 'FILE_SHARE' | 'TEXT_SHARE';
  fileName?: string;
}

export const BackupReminder: React.FC = () => {
  // 1. CRITICAL - Memory Leak: mounted ref
  const isMounted = useRef(true);
  const [showReminder, setShowReminder] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // 2. CRITICAL - Add error handling states
  const [queryError, setQueryError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');

  // 2. CRITICAL - Add error handling for useLiveQuery
  const salesTodayCount = useLiveQuery(async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return await db.sales.where('timestamp').between(start.getTime(), end.getTime()).count();
    } catch (err) {
      console.error("Dexie query error (salesTodayCount):", err);
      if (isMounted.current) setQueryError("Could not load sales count");
      return 0;
    }
  }, []);

  const lastBackup = useLiveQuery(async () => {
    try {
      return await db.settings.get('last_backup_timestamp');
    } catch (err) {
      console.error("Dexie query error (lastBackup):", err);
      return null;
    }
  });

  // 7. OPTIMIZE useEffect: Memoized condition checking
  const checkConditions = useCallback(() => {
    if (!isMounted.current || salesTodayCount === undefined) return;

    const now = new Date();
    const currentHour = now.getHours();
    
    const isCorrectTime = currentHour >= BACKUP_REMINDER_HOUR;
    const hasEnoughSales = salesTodayCount >= MIN_SALES_FOR_REMINDER;

    // 3. CRITICAL - Validate lastBackup.value before parsing
    let backedUpToday = false;
    if (lastBackup?.value) {
      const val = lastBackup.value;
      const ts = typeof val === 'number' ? val : Number(val);
      const backupDate = !isNaN(ts) ? new Date(ts) : null;
      
      if (backupDate && !isNaN(backupDate.getTime())) {
        backedUpToday = backupDate.toDateString() === now.toDateString();
      }
    }

    if (isCorrectTime && hasEnoughSales && !backedUpToday) {
      setShowReminder(true);
    } else {
      setShowReminder(false);
    }
  }, [salesTodayCount, lastBackup]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    checkConditions();
  }, [checkConditions]);

  // 7. OPTIMIZE useEffect: Split into interval effect
  useEffect(() => {
    const interval = setInterval(checkConditions, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkConditions]);

  const handleBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setBackupError(null);

    try {
      const [inventory, sales, expenses, debts, usersList] = await Promise.all([
        db.inventory.toArray(),
        db.sales.toArray(),
        db.expenses.toArray(),
        db.debts.toArray(),
        db.users.toArray()
      ]);

      const shopName = localStorage.getItem('shop_name') || 'NaijaShop';
      const shopInfo = localStorage.getItem('shop_info') || '';
      
      const result: BackupResult = await backupToWhatsApp({ 
        inventory, 
        sales, 
        expenses, 
        debts,
        users: usersList,
        shopName,
        shopInfo,
        timestamp: Date.now() 
      });

      // 1. CRITICAL - check mounted ref before setState
      if (!isMounted.current) return;

      if (result.success && (result.method === 'DOWNLOAD' || result.method === 'FILE_SHARE')) {
        setBackupFileName(result.fileName || 'NaijaShop_Backup.json');
        setShowBackupSuccess(true);
      } else if (result.success) {
        setShowReminder(false);
      } else {
        // 5. UX IMPROVEMENT: Inline error instead of alert
        setBackupError("Backup failed. Please try from Settings.");
      }
    } catch (err) {
      if (isMounted.current) {
        setBackupError("System error during backup. Check permissions.");
      }
    } finally {
      if (isMounted.current) {
        setIsBackingUp(false);
      }
    }
  };

  // 10. ADD loading state for initial data
  if (salesTodayCount === undefined && !queryError) return null;

  return (
    <>
      <BackupSuccessModal 
        isOpen={showBackupSuccess} 
        onClose={() => {
          if (isMounted.current) {
            setShowBackupSuccess(false);
            setShowReminder(false);
          }
        }} 
        fileName={backupFileName} 
      />

      {showReminder && (
        <div 
          className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500"
          role="alert" // 4. ACCESSIBILITY
          aria-live="polite" // 4. ACCESSIBILITY
        >
          <div className="bg-amber-600 text-white p-5 rounded-[28px] shadow-2xl shadow-amber-900/20 border-2 border-amber-500 relative overflow-hidden flex items-center gap-4">
            {/* 8. PERFORMANCE: Reduced size of ping/pulse for background circle */}
            <div className="absolute -left-2 -top-2 w-16 h-16 bg-white/10 rounded-full animate-pulse pointer-events-none"></div>
            
            <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0">
              {backupError || queryError ? (
                <ShieldAlert size={24} className="text-red-200" />
              ) : (
                <AlertCircle size={24} className="text-white" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-[13px] font-black leading-tight">
                {backupError || queryError || `Oga, you have ${salesTodayCount} new sales!`}
              </p>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">
                {backupError || queryError ? 'Technical issue' : 'Backup your records for safety'}
              </p>
            </div>

            <button 
              onClick={handleBackup}
              disabled={isBackingUp}
              aria-busy={isBackingUp} // 4. ACCESSIBILITY
              className="bg-white text-amber-700 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              {isBackingUp ? 'Wait...' : 'Backup'}
            </button>

            <button 
              onClick={() => setShowReminder(false)}
              aria-label="Dismiss backup reminder" // 4. ACCESSIBILITY
              className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};