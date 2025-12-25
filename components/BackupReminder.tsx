
import React, { useEffect, useState } from 'react';
import { db } from '../db.ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload, AlertCircle, X, Loader2 } from 'lucide-react';
import { backupToWhatsApp } from '../utils/whatsapp.ts';

export const BackupReminder: React.FC = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // Get sales count for today
  const salesTodayCount = useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return await db.sales.where('timestamp').between(start.getTime(), end.getTime()).count();
  }, []);

  // Get last backup timestamp from settings
  const lastBackup = useLiveQuery(() => db.settings.get('last_backup_timestamp'));

  useEffect(() => {
    const checkConditions = () => {
      if (salesTodayCount === undefined) return;

      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if it's after 5 PM (17:00)
      const isCorrectTime = currentHour >= 17;
      
      // Check if more than 5 sales
      const hasEnoughSales = salesTodayCount >= 5;

      // Check if already backed up today
      let backedUpToday = false;
      if (lastBackup) {
        const backupDate = new Date(lastBackup.value).toDateString();
        const todayDate = now.toDateString();
        backedUpToday = backupDate === todayDate;
      }

      if (isCorrectTime && hasEnoughSales && !backedUpToday) {
        setShowReminder(true);
      } else {
        setShowReminder(false);
      }
    };

    checkConditions();
    const interval = setInterval(checkConditions, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [salesTodayCount, lastBackup]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const inventory = await db.inventory.toArray();
      const sales = await db.sales.toArray();
      const expenses = await db.expenses.toArray();
      const debts = await db.debts.toArray();
      const usersList = await db.users.toArray();
      const shopName = localStorage.getItem('shop_name') || 'NaijaShop';
      const shopInfo = localStorage.getItem('shop_info') || '';
      
      await backupToWhatsApp({ 
        inventory, 
        sales, 
        expenses, 
        debts,
        users: usersList,
        shopName,
        shopInfo,
        timestamp: Date.now() 
      });
      setShowReminder(false);
    } catch (err) {
      alert("Backup failed. Please try from Settings.");
    } finally {
      setIsBackingUp(false);
    }
  };

  if (!showReminder) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-amber-600 text-white p-5 rounded-[28px] shadow-2xl shadow-amber-900/20 border-2 border-amber-500 relative overflow-hidden flex items-center gap-4">
        {/* Pulsing Background Circle */}
        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full animate-ping pointer-events-none"></div>
        
        <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0">
          <AlertCircle size={24} className="text-white" />
        </div>

        <div className="flex-1">
          <p className="text-[13px] font-black leading-tight">
            Oga, you have {salesTodayCount} new sales!
          </p>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">
            Backup your records for safety
          </p>
        </div>

        <button 
          onClick={handleBackup}
          disabled={isBackingUp}
          className="bg-white text-amber-700 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
        >
          {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
          {isBackingUp ? 'Wait...' : 'Backup'}
        </button>

        <button 
          onClick={() => setShowReminder(false)}
          className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
