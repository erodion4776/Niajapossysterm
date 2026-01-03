
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, TrendingUp, History, Calendar as CalendarIcon, 
  ChevronRight, RefreshCw, Landmark, Banknote, BookOpen, Gem, Coins, 
  Wallet, X, Check, Info, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

type DatePreset = 'today' | 'yesterday' | 'thisMonth' | 'allTime' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const isStaff = localStorage.getItem('user_role') === 'staff';
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice' || isStaff;
  const isAdmin = role === 'Admin' && !isStaffDevice;
  
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showProfitInfo, setShowProfitInfo] = useState(false);
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    if (datePreset === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    else if (datePreset === 'yesterday') { start.setDate(start.getDate()-1); start.setHours(0,0,0,0); end.setDate(end.getDate()-1); end.setHours(23,59,59,999); }
    else if (datePreset === 'thisMonth') { start.setDate(1); start.setHours(0,0,0,0); }
    else if (datePreset === 'allTime') { start.setTime(0); }
    else if (datePreset === 'custom') { const d = new Date(customDate); start.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); start.setHours(0,0,0,0); end.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); end.setHours(23,59,59,999); }
    return { start: start.getTime(), end: end.getTime() };
  }, [datePreset, customDate]);

  const salesInRange = useLiveQuery(() => db.sales.where('timestamp').between(dateRange.start, dateRange.end).toArray(), [dateRange]);
  const expensesInRange = useLiveQuery(() => db.expenses.where('date').between(dateRange.start, dateRange.end).toArray(), [dateRange]);

  const financialStats = useMemo(() => {
    if (!salesInRange || !expensesInRange) return { revenue: 0, costOfGoods: 0, expenses: 0, netProfit: 0 };
    const revenue = salesInRange.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const expenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const costOfGoods = salesInRange.reduce((acc, sale) => {
      const saleCogs = sale.items.reduce((iSum, item) => iSum + (Number(item.costPrice || 0) * item.quantity), 0);
      return acc + saleCogs;
    }, 0);
    const netProfit = revenue - costOfGoods - expenses;
    return { revenue, costOfGoods, expenses, netProfit };
  }, [salesInRange, expensesInRange]);

  const totalMoneyOutside = useMemo(() => debts?.filter(d => d.status === 'Unpaid').reduce((sum, d) => sum + Number(d.remainingBalance || 0), 0) || 0, [debts]);
  const storeNetWorth = useMemo(() => inventory?.reduce((sum, item) => sum + (Number(item.costPrice || 0) * Number(item.stock || 0)), 0) || 0, [inventory]);

  // Intelligence Alerts
  const alerts = useMemo(() => {
    if (!inventory) return { lowStock: 0, expiring: 0 };
    const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 7);
    return {
      lowStock: inventory.filter(i => i.stock <= (i.minStock || 5)).length,
      expiring: inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= weekOut).length
    };
  }, [inventory]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase">NaijaShop</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">{isAdmin ? 'Shop Overview' : 'Staff Terminal'}</p>
        </div>
        <button onClick={() => setShowDateModal(true)} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2">
          <CalendarIcon size={20} /><span className="text-[10px] font-black uppercase">{datePreset}</span>
        </button>
      </header>

      {/* CRITICAL ALERTS - PULSING INTELLIGENCE */}
      {(alerts.lowStock > 0 || alerts.expiring > 0) && (
        <section className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-[32px] flex items-center gap-4 animate-pulse">
           <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none"><ShieldAlert size={24}/></div>
           <div className="flex-1">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Critical Alerts</p>
              <h4 className="text-xs font-black text-red-900 dark:text-red-100 leading-tight">
                {alerts.lowStock > 0 && `${alerts.lowStock} Items Low`}
                {alerts.lowStock > 0 && alerts.expiring > 0 && ' | '}
                {alerts.expiring > 0 && `${alerts.expiring} Expiring Soon`}
              </h4>
           </div>
           <button onClick={() => onInventoryFilter('low-stock')} className="p-2 bg-white dark:bg-red-900 rounded-xl text-red-500"><ChevronRight size={18}/></button>
        </section>
      )}

      {/* PROFIT SECTION */}
      <section className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">
              {isAdmin ? `Net Profit` : `Total Sales`} ({datePreset})
            </p>
            {isAdmin && <button onClick={() => setShowProfitInfo(!showProfitInfo)} className="p-1 bg-white/20 rounded-full"><Info size={12}/></button>}
          </div>
          <h2 className="text-4xl font-black tracking-tighter">
            {formatNaira(isAdmin ? financialStats.netProfit : financialStats.revenue)}
          </h2>
          
          {showProfitInfo && isAdmin && (
            <div className="mt-4 bg-emerald-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase space-y-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between"><span>Gross Revenue:</span><span>{formatNaira(financialStats.revenue)}</span></div>
              <div className="flex justify-between text-red-300"><span>- Stock Cost:</span><span>{formatNaira(financialStats.costOfGoods)}</span></div>
              <div className="flex justify-between text-red-300"><span>- Overheads:</span><span>{formatNaira(financialStats.expenses)}</span></div>
            </div>
          )}
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={140} />
      </section>

      {/* INTELLIGENCE TILES (REVENUE, DEBTS, EXPENSES, STOCK) */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
           <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
              <Banknote size={16} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase">Revenue</p>
              <p className="text-[10px] font-black text-emerald-600 truncate">{formatNaira(financialStats.revenue)}</p>
           </div>
           <div onClick={() => setPage(Page.DEBTS)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
              <BookOpen size={16} className="text-red-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase">Debts</p>
              <p className="text-[10px] font-black text-red-500 truncate">{formatNaira(totalMoneyOutside)}</p>
           </div>
           <div onClick={() => setPage(Page.EXPENSES)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
              <History size={16} className="text-amber-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase">Expenses</p>
              <p className="text-[10px] font-black text-amber-500 truncate">{formatNaira(financialStats.expenses)}</p>
           </div>
           <div onClick={() => setPage(Page.INVENTORY)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
              <Gem size={16} className="text-blue-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase">Stock Val</p>
              <p className="text-[10px] font-black text-blue-600 truncate">{formatNaira(storeNetWorth)}</p>
           </div>
        </div>
      )}

      {/* RECENT SALES */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600"><History size={18} /></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Recent Sales</h3>
          </div>
          <button onClick={() => setPage(Page.SALES)} className="text-[9px] font-black text-emerald-600 uppercase">View All</button>
        </div>
        <div className="space-y-3">
          {salesInRange?.length === 0 ? (
            <div className="py-6 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">No sales yet for {datePreset}</div>
          ) : salesInRange?.slice(-3).reverse().map(sale => (
            <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-emerald-100">#{String(sale.id).slice(-4)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">{sale.paymentMethod} • {new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
              </div>
              <p className="text-xs font-black text-emerald-600">{formatNaira(sale.total)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-xs rounded-[40px] p-6 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-xl font-black mb-6 uppercase text-center">Select Range</h2>
            <div className="grid grid-cols-1 gap-2">
              {['today', 'yesterday', 'thisMonth', 'allTime'].map(p => (
                <button key={p} onClick={() => { setDatePreset(p as any); setShowDateModal(false); }} className={`p-4 rounded-2xl font-black uppercase text-[10px] ${datePreset === p ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-emerald-800'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
