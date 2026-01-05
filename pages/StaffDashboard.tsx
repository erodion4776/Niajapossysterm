import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User as DBUser } from '../db.ts';
import pako from 'pako';
import { 
  applyInventoryUpdate, 
  exportStaffSalesReport,
  formatNaira 
} from '../utils/whatsapp.ts';
import { syncEngine, SyncStatus } from '../utils/syncEngine.ts';
import { 
  ShoppingCart, Package, History, Calendar as CalendarIcon, 
  ChevronRight, RefreshCw, Send, Download, Loader2,
  CheckCircle2, AlertCircle, Sparkles, BookOpen, Wallet,
  Info, LogOut, Clock, Smartphone, Zap, Banknote, Landmark, TrendingUp,
  Cloud, CloudOff, CloudLightning
} from 'lucide-react';
import { Page } from '../types.ts';

interface StaffDashboardProps {
  setPage: (page: Page) => void;
  user: DBUser;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ setPage, user }) => {
  const staffName = localStorage.getItem('logged_in_staff_name') || 'Staff';
  const shopName = localStorage.getItem('shop_name') || 'NaijaShop';
  const lastSyncTs = localStorage.getItem('last_inventory_sync');

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  // Sync Engine integration
  useEffect(() => {
    syncEngine.subscribeStatus(setSyncStatus);
  }, []);

  const todayRange = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  const todaySales = useLiveQuery(() => 
    db.sales
      .where('timestamp')
      .between(todayRange.start, todayRange.end)
      .filter(s => s.staff_id === String(user.id || user.role))
      .toArray(),
    [todayRange, user]
  );

  const stats = useMemo(() => {
    if (!todaySales) return { count: 0, items: 0, revenue: 0, cash: 0, transfer: 0, debt: 0 };
    const count = todaySales.length;
    const items = todaySales.reduce((sum, s) => sum + s.items.reduce((iS, i) => iS + i.quantity, 0), 0);
    const revenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cash = todaySales.reduce((sum, s) => sum + (s.cashPaid || 0), 0);
    const transfer = todaySales.reduce((sum, s) => ['Transfer', 'Card'].includes(s.paymentMethod) ? sum + (s.total - (s.walletUsed || 0)) : sum, 0);
    const debt = todaySales.reduce((sum, s) => sum + Math.max(0, s.total - (s.cashPaid || 0) - (s.walletUsed || 0)), 0);
    return { count, items, revenue, cash, transfer, debt };
  }, [todaySales]);

  const handleManualRefresh = async () => {
    if (!navigator.onLine) {
      alert("⚠️ Oga, you need internet to refresh prices from Admin.");
      return;
    }
    setIsRefreshing(true);
    try {
      await syncEngine.performInitialPull();
    } catch (err) {
      alert("Failed to refresh stock.");
    } finally {
      setIsRefreshing(false);
    }
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
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500 max-h-screen overflow-y-auto custom-scrollbar relative">
      {/* FULL SCREEN PULL PROGRESS */}
      {syncStatus === 'pulling' && (
        <div className="fixed inset-0 z-[2000] bg-emerald-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
           <div className="w-20 h-20 bg-emerald-500/20 rounded-[32px] flex items-center justify-center mb-6 animate-pulse">
              <RefreshCw size={40} className="text-emerald-500 animate-spin" />
           </div>
           <h2 className="text-white text-2xl font-black italic uppercase tracking-tighter mb-2">Connecting to Admin...</h2>
           <p className="text-emerald-500/60 text-xs font-bold uppercase tracking-widest animate-pulse">Downloading Shop Inventory</p>
           <div className="w-full max-w-xs h-1.5 bg-white/10 rounded-full mt-8 overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[shimmer_2s_infinite] w-full origin-left"></div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Staff Workspace</p>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase truncate max-w-[150px]">{shopName}</h1>
             <div className="flex items-center gap-1">
                {syncStatus === 'synced' && <Cloud className="text-emerald-500" size={14} />}
                {syncStatus === 'pending' && <RefreshCw className="text-amber-500 animate-spin" size={14} />}
                {syncStatus === 'offline' && <CloudOff className="text-slate-300" size={14} />}
                {syncStatus === 'error' && <CloudLightning className="text-red-500" size={14} />}
             </div>
          </div>
          <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase flex items-center gap-1.5">
            Logged in: {staffName} <CheckCircle2 size={10} className="text-emerald-500"/>
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-3 bg-emerald-50 dark:bg-emerald-900 border border-emerald-100 rounded-2xl text-emerald-600 active:scale-90 transition-all">
             {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
           </button>
           <button onClick={() => { localStorage.removeItem('user_role'); window.location.reload(); }} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 rounded-2xl text-red-400">
             <LogOut size={18} />
           </button>
        </div>
      </header>

      <section className="bg-emerald-900/10 dark:bg-emerald-900/20 border-2 border-emerald-500/20 p-8 rounded-[40px] shadow-sm relative overflow-hidden group">
         <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl"><TrendingUp size={16}/></div>
                  <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">TOTAL SALES TODAY</p>
               </div>
            </div>
            <div className="space-y-1">
               <h2 className="text-5xl font-black tracking-tighter">{formatNaira(stats.revenue)}</h2>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Personal Sales History on this Device</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
               <div className="px-3 py-1.5 bg-emerald-600/10 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Package size={10}/> {stats.items} Items Moved
               </div>
               <div className="px-3 py-1.5 bg-emerald-600/10 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <History size={10}/> {stats.count} Receipts
               </div>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
         <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20">
            <Banknote size={16} className="text-emerald-500 mx-auto mb-1.5" />
            <p className="text-[10px] font-black text-emerald-600 truncate">{formatNaira(stats.cash)}</p>
         </div>
         <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20">
            <Landmark size={16} className="text-blue-500 mx-auto mb-1.5" />
            <p className="text-[10px] font-black text-blue-600 truncate">{formatNaira(stats.transfer)}</p>
         </div>
         <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20">
            <BookOpen size={16} className="text-amber-500 mx-auto mb-1.5" />
            <p className="text-[10px] font-black text-amber-500 truncate">{formatNaira(stats.debt)}</p>
         </div>
      </div>

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
            <button onClick={handleManualRefresh} disabled={isRefreshing} className="w-full bg-emerald-50 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all border border-emerald-100 dark:border-emerald-700/50 shadow-sm">
               {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 📥 SYNC PRICES FROM CLOUD
            </button>
            <button onClick={handleSendReport} disabled={isExporting} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-lg">
               {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 📤 SEND DAILY REPORT
            </button>
          </div>
      </section>

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
    </div>
  );
};