
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Package, TrendingUp, History, Landmark, Banknote, BookOpen, Gem, 
  Info, ShieldAlert, ArrowUpRight, CheckCircle2, CalendarDays, 
  BarChart3, Gift, MessageCircle, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const isActivated = localStorage.getItem('is_activated') === 'true';
  const isAdmin = role === 'Admin';
  
  // Real-time Data Queries
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());
  const allDebts = useLiveQuery(() => db.debts.toArray());
  const shopNameSetting = useLiveQuery(() => db.settings.get('shop_name'));
  const ownerUser = useLiveQuery(() => db.users.where('role').equals('Admin').first());

  // Trial Logic
  const trialDaysLeft = useMemo(() => {
    if (isActivated) return 0;
    const start = localStorage.getItem('trial_start_date');
    if (!start) return 14;
    const elapsed = Date.now() - parseInt(start);
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((fourteenDays - elapsed) / (24 * 60 * 60 * 1000)));
  }, [isActivated]);

  // Alert Calculations
  const alerts = useMemo(() => {
    if (!inventory) return { lowStock: 0, expiring: 0 };
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      lowStock: inventory.filter(i => i.stock <= (i.minStock || 5)).length,
      expiring: inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= nextWeek).length
    };
  }, [inventory]);

  // Financial Aggregations
  const stats = useMemo(() => {
    if (!allSales || !allExpenses || !allDebts) return null;

    const revenue = allSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const cogs = allSales.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
    const expenseTotal = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const cash = allSales
      .filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'Partial')
      .reduce((sum, s) => sum + (s.cashPaid || (s.paymentMethod === 'Cash' ? s.total : 0)), 0);
    
    const bank = allSales
      .filter(s => ['Transfer', 'Card'].includes(s.paymentMethod))
      .reduce((sum, s) => sum + (s.total - (s.walletUsed || 0)), 0);

    const moneyOutside = allDebts
      .filter(d => d.status === 'Unpaid')
      .reduce((sum, d) => sum + (Number(d.remainingBalance) || 0), 0);

    return {
      revenue,
      netProfit: revenue - cogs - expenseTotal,
      cash,
      bank,
      moneyOutside,
      totalSalesCount: allSales.length
    };
  }, [allSales, allExpenses, allDebts]);

  const getTrialBadgeColor = () => {
    if (trialDaysLeft >= 7) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (trialDaysLeft >= 3) return 'bg-orange-50 text-orange-600 border-orange-200';
    return 'bg-red-50 text-red-600 border-red-200 animate-pulse';
  };

  return (
    <div className="p-4 space-y-6 pb-28 animate-in fade-in duration-500">
      {/* 1. PERSONALIZED HEADER */}
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase">
            Welcome, Boss {ownerUser?.name?.split(' ')[0] || ''}!
          </h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            Managing <span className="text-emerald-600 dark:text-emerald-400">{shopNameSetting?.value || 'NaijaShop'}</span>
          </p>
        </div>
        {!isActivated && isAdmin && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-tighter ${getTrialBadgeColor()}`}>
            <Gift size={10} /> {trialDaysLeft} Days Left
          </div>
        )}
      </header>

      {/* 2. ALERT BAR */}
      {(alerts.lowStock > 0 || alerts.expiring > 0) && (
        <section className="space-y-2">
          {alerts.lowStock > 0 && (
            <button 
              onClick={() => onInventoryFilter('low-stock')}
              className="w-full bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 p-4 rounded-2xl flex items-center justify-between animate-pulse"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-500" size={18} />
                <p className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">
                  {alerts.lowStock} Items are running low!
                </p>
              </div>
              <ChevronRight size={16} className="text-orange-300" />
            </button>
          )}
          {alerts.expiring > 0 && (
            <button 
              onClick={() => onInventoryFilter('expiring')}
              className="w-full bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-red-500" size={18} />
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest">
                  {alerts.expiring} Items expiring soon!
                </p>
              </div>
              <ChevronRight size={16} className="text-red-300" />
            </button>
          )}
        </section>
      )}

      {/* 3. MAIN PROFIT CARD */}
      <section className="bg-emerald-600 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">Net Business Profit</p>
            <Info size={12} className="opacity-40" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-5xl font-black tracking-tighter">
              {formatNaira(stats?.netProfit || 0)}
            </h2>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
               <TrendingUp size={10} className="text-emerald-300" />
               <p className="text-[9px] font-black uppercase tracking-widest">
                 Revenue: {formatNaira(stats?.revenue || 0)}
               </p>
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
           <Gem size={180} />
        </div>
      </section>

      {/* 4. THE 3-CARD ROW */}
      <div className="grid grid-cols-3 gap-2">
         <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600">
               <Banknote size={20} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash In Hand</p>
            <p className="text-[11px] font-black text-emerald-600 truncate">{formatNaira(stats?.cash || 0)}</p>
         </div>
         
         <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600">
               <Landmark size={20} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bank / POS</p>
            <p className="text-[11px] font-black text-blue-600 truncate">{formatNaira(stats?.bank || 0)}</p>
         </div>

         <div onClick={() => setPage(Page.DEBTS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-600">
               <BookOpen size={20} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Money Outside</p>
            <p className="text-[11px] font-black text-red-600 truncate">{formatNaira(stats?.moneyOutside || 0)}</p>
         </div>
      </div>

      {/* 5. SALES FEED */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[40px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600"><History size={18} /></div>
            <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Recent Sales</h3>
          </div>
          <button onClick={() => setPage(Page.SALES)} className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:gap-2 transition-all">View All <ArrowUpRight size={12}/></button>
        </div>
        
        <div className="space-y-3">
          {allSales && allSales.length > 0 ? (
            allSales.slice(-5).reverse().map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-[24px]">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900 flex items-center justify-center text-slate-400">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-800 dark:text-emerald-100 uppercase tracking-tight">#{String(sale.id).slice(-4)}</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">{formatNaira(sale.total)}</p>
                  <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{sale.paymentMethod}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-3 opacity-20">
               <CalendarDays size={32} className="mx-auto" />
               <p className="text-[9px] font-black uppercase tracking-widest">No Sales Recorded Yet</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. LIFETIME CARD */}
      <section className="bg-slate-900 text-white p-8 rounded-[48px] shadow-2xl relative overflow-hidden border-t border-white/5">
         <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/20 rounded-xl"><Gem size={18} className="text-emerald-400" /></div>
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 italic">Shop Lifetime Records</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-50">Total Transactions</p>
                  <p className="text-3xl font-black tracking-tighter">{stats?.totalSalesCount || 0}</p>
               </div>
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-50">Accumulated Gain</p>
                  <p className="text-3xl font-black text-emerald-400 tracking-tighter">{formatNaira(stats?.netProfit || 0)}</p>
               </div>
            </div>
         </div>
         <BarChart3 size={200} className="absolute -right-12 -bottom-12 opacity-[0.03] text-white pointer-events-none" />
      </section>
    </div>
  );
};
