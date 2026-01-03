
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import pako from 'pako';
import { 
  applyInventoryUpdate, 
  exportStaffSalesReport 
} from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, History, Calendar as CalendarIcon, 
  ChevronRight, RefreshCw, Send, Download, Loader2,
  CheckCircle2, AlertCircle, Sparkles, BookOpen, Wallet,
  Info, LogOut, Clock, Smartphone, Zap
} from 'lucide-react';
import { Page } from '../types.ts';

interface StaffDashboardProps {
  setPage: (page: Page) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ setPage }) => {
  const staffName = localStorage.getItem('logged_in_staff_name') || 'Staff';
  const shopName = localStorage.getItem('shop_name') || 'NaijaShop';
  const lastSyncTs = localStorage.getItem('last_inventory_sync');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const syncInputRef = useRef<HTMLInputElement>(null);

  // Today's Date Range
  const todayRange = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  const todaySales = useLiveQuery(() => db.sales.where('timestamp').between(todayRange.start, todayRange.end).toArray());
  const todayDebts = useLiveQuery(() => db.debts.where('date').between(todayRange.start, todayRange.end).toArray());

  const stats = useMemo(() => {
    if (!todaySales) return { count: 0, items: 0 };
    const count = todaySales.length;
    const items = todaySales.reduce((sum, s) => sum + s.items.reduce((iS, i) => iS + i.quantity, 0), 0);
    return { count, items };
  }, [todaySales]);

  const handleSyncFromBoss = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
        const data = JSON.parse(decompressed);
        
        const result = await applyInventoryUpdate(data);
        alert(`✅ Sync Success!\n- Updated ${result.updated} prices\n- Added ${result.added} new products.\nYour local stock levels were protected.`);
        window.location.reload();
      } catch (err) {
        alert("Sync failed: Please use the .json.gz file sent by Oga.");
      } finally {
        setIsSyncing(false);
        if (syncInputRef.current) syncInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSendReport = async () => {
    if (!todaySales || todaySales.length === 0) {
      alert("No sales recorded today to report!");
      return;
    }
    setIsExporting(true);
    try {
      await exportStaffSalesReport(todaySales);
      alert("Report generated! Choose WhatsApp to send to Oga.");
    } catch (err) {
      alert("Failed to create report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500 max-h-screen overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-start">
        <div>
          <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Staff Workspace</p>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase truncate max-w-[200px]">{shopName}</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase flex items-center gap-1.5">
            Logged in: {staffName} <CheckCircle2 size={10} className="text-emerald-500"/>
          </p>
        </div>
        <button 
          onClick={() => { localStorage.removeItem('user_role'); localStorage.removeItem('logged_in_staff_name'); window.location.reload(); }}
          className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-red-400 active:scale-90 transition-all"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ACTIVITY VOLUME CARD */}
      <section className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
         <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-white/20 rounded-xl"><ShoppingCart size={16}/></div>
               <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">Activity Ledger (Today)</p>
            </div>
            
            <div className="space-y-1">
               <h2 className="text-5xl font-black tracking-tighter">{stats.count} Sales</h2>
               <p className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest">Digital records on this phone</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
               <div className="px-3 py-1.5 bg-emerald-700/50 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Package size={10}/> {stats.items} Items Moved
               </div>
               <div className="px-3 py-1.5 bg-emerald-700/50 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen size={10}/> {todayDebts?.length || 0} New Debts
               </div>
            </div>
         </div>
         <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Sparkles size={180} />
         </div>
      </section>

      {/* SYNC CENTER */}
      <section className="bg-white dark:bg-emerald-900/40 border-2 border-dashed border-emerald-200 dark:border-emerald-800 p-6 rounded-[32px] space-y-6">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600"><RefreshCw size={18}/></div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Center</h2>
             </div>
             {lastSyncTs && (
               <div className="flex items-center gap-1 text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                  <Clock size={8}/> Updated: {new Date(parseInt(lastSyncTs)).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="w-full bg-emerald-50 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all cursor-pointer border border-emerald-100 dark:border-emerald-700/50 shadow-sm">
               <input type="file" ref={syncInputRef} className="hidden" accept=".json.gz,.gz" onChange={handleSyncFromBoss} />
               {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 1. Update from Boss
            </label>
            <button onClick={handleSendReport} disabled={isExporting} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100 dark:shadow-none">
               {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 2. Send Daily Report
            </button>
          </div>
          
          <div className="bg-slate-50 dark:bg-emerald-950/40 p-4 rounded-2xl flex items-start gap-3">
             <Info className="text-slate-300 shrink-0 mt-0.5" size={14} />
             <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
               Sync daily to ensure Oga's master inventory matches your physical sales. Report exports sales, debts, and wallet updates.
             </p>
          </div>
      </section>

      {/* QUICK STATUS */}
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 shadow-sm space-y-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 w-fit rounded-xl text-blue-600"><Smartphone size={18}/></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Status</p>
            <p className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase italic tracking-tight">Staff Terminal</p>
         </div>
         <div onClick={() => setPage(Page.POS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 shadow-sm space-y-2 active:scale-95 transition-all cursor-pointer">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-800 w-fit rounded-xl text-emerald-600"><Zap size={18}/></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fast Action</p>
            <p className="text-xs font-black text-emerald-600 uppercase italic tracking-tight">Open POS Terminal</p>
         </div>
      </div>

      <div className="pt-4 text-center">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">NaijaShop Offline Sync Loop 🇳🇬</p>
      </div>
    </div>
  );
};
