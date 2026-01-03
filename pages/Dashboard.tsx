
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, TrendingUp, History, Calendar as CalendarIcon, 
  ChevronRight, Landmark, Banknote, BookOpen, Gem, 
  Info, ShieldAlert, Award, ArrowUpRight
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

type DatePreset = 'today' | 'yesterday' | 'thisMonth' | 'allTime';

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const isStaff = localStorage.getItem('user_role') === 'staff';
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice' || isStaff;
  const isAdmin = role === 'Admin' && !isStaffDevice;
  
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
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
    return { start: start.getTime(), end: end.getTime() };
  }, [datePreset]);

  const salesInRange = useLiveQuery(() => db.sales.where('timestamp').between(dateRange.start, dateRange.end).toArray(), [dateRange]);
  const expensesInRange = useLiveQuery(() => db.expenses.where('date').between(dateRange.start, dateRange.end).toArray(), [dateRange]);

  const financialStats = useMemo(() => {
    if (!salesInRange || !expensesInRange) return { revenue: 0, costOfGoods: 0, expenses: 0, netProfit: 0, cash: 0, transfers: 0 };
    const revenue = salesInRange.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const expenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cash = salesInRange.filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'Partial').reduce((sum, s) => sum + (s.cashPaid || s.total), 0);
    const transfers = salesInRange.filter(s => s.paymentMethod === 'Transfer' || s.paymentMethod === 'Card').reduce((sum, s) => sum + Number(s.total || 0), 0);
    
    const costOfGoods = salesInRange.reduce((acc, sale) => {
      const saleCogs = sale.items.reduce((iSum, item) => iSum + (Number(item.costPrice || 0) * item.quantity), 0);
      return acc + saleCogs;
    }, 0);
    
    const netProfit = revenue - costOfGoods - expenses;
    return { revenue, costOfGoods, expenses, netProfit, cash, transfers };
  }, [salesInRange, expensesInRange]);

  const totalMoneyOutside = useMemo(() => debts?.filter(d => d.status === 'Unpaid').reduce((sum, d) => sum + Number(d.remainingBalance || 0), 0) || 0, [debts]);

  const topProducts = useMemo(() => {
    if (!salesInRange) return [];
    const counts: Record<string, { name: string, qty: number }> = {};
    salesInRange.forEach(s => {
      s.items.forEach(i => {
        if (!counts[i.name]) counts[i.name] = { name: i.name, qty: 0 };
        counts[i.name].qty += i.quantity;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [salesInRange]);

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
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">{isAdmin ? 'Boss Overview' : 'Staff Terminal'}</p>
        </div>
        <button onClick={() => setShowDateModal(true)} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2">
          <CalendarIcon size={20} /><span className="text-[10px] font-black uppercase">{datePreset}</span>
        </button>
      </header>

      {/* CRITICAL ALERTS BAR */}
      {(alerts.lowStock > 0 || alerts.expiring > 0) && (
        <section className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-[28px] flex items-center gap-4 animate-pulse">
           <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none shrink-0"><ShieldAlert size={20}/></div>
           <div className="flex-1">
              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Attention Required</p>
              <h4 className="text-[11px] font-black text-red-900 dark:text-red-100 leading-tight">
                {alerts.lowStock > 0 && `${alerts.lowStock} items low`}
                {alerts.lowStock > 0 && alerts.expiring > 0 && ' & '}
                {alerts.expiring > 0 && `${alerts.expiring} items expiring soon`}
              </h4>
           </div>
           <button onClick={() => onInventoryFilter('low-stock')} className="p-2 bg-white dark:bg-red-900 rounded-xl text-red-500 shadow-sm"><ChevronRight size={16}/></button>
        </section>
      )}

      {/* MAIN PROFIT CARD */}
      <section className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">
              {isAdmin ? `Net Profit Today` : `Total Sales Today`}
            </p>
            {isAdmin && <button onClick={() => setShowProfitInfo(!showProfitInfo)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><Info size={12}/></button>}
          </div>
          <h2 className="text-4xl font-black tracking-tighter">
            {formatNaira(isAdmin ? financialStats.netProfit : financialStats.revenue)}
          </h2>
          <div className="flex items-center gap-2 mt-2">
             <div className="px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <TrendingUp size={10} /> Revenue: {formatNaira(financialStats.revenue)}
             </div>
          </div>
          
          {showProfitInfo && isAdmin && (
            <div className="mt-5 bg-emerald-900/50 backdrop-blur-md p-5 rounded-3xl border border-white/10 text-[10px] font-bold uppercase space-y-2.5 animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center opacity-70"><span>Gross Revenue:</span><span>{formatNaira(financialStats.revenue)}</span></div>
              <div className="flex justify-between items-center text-red-300"><span>- Cost of Stock:</span><span>{formatNaira(financialStats.costOfGoods)}</span></div>
              <div className="flex justify-between items-center text-red-300"><span>- Business Expenses:</span><span>{formatNaira(financialStats.expenses)}</span></div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-emerald-300 font-black text-xs"><span>NET PROFIT:</span><span>{formatNaira(financialStats.netProfit)}</span></div>
            </div>
          )}
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
           <Gem size={180} />
        </div>
      </section>

      {/* INTELLIGENCE TILES (CASH, BANK, DEBT) */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-2">
           <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
              <Banknote size={16} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cash</p>
              <p className="text-[10px] font-black text-emerald-600 truncate">{formatNaira(financialStats.cash)}</p>
           </div>
           <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
              <Landmark size={16} className="text-blue-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Bank</p>
              <p className="text-[10px] font-black text-blue-600 truncate">{formatNaira(financialStats.transfers)}</p>
           </div>
           <div onClick={() => setPage(Page.DEBTS)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
              <BookOpen size={16} className="text-red-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Debts</p>
              <p className="text-[10px] font-black text-red-500 truncate">{formatNaira(totalMoneyOutside)}</p>
           </div>
        </div>
      )}

      {/* TOP PRODUCTS TODAY */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600"><Award size={18} /></div>
          <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Best Sellers Today</h3>
        </div>
        <div className="space-y-2">
           {topProducts.length > 0 ? topProducts.map((p, idx) => (
             <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-600 dark:text-emerald-100 uppercase truncate pr-4">{p.name}</span>
                <span className="bg-white dark:bg-emerald-950 px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 border border-slate-100 dark:border-emerald-800 whitespace-nowrap">x{p.qty} sold</span>
             </div>
           )) : (
             <p className="text-[9px] text-slate-300 font-black uppercase text-center py-4">No records yet</p>
           )}
        </div>
      </section>

      {/* RECENT SALES */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600"><History size={18} /></div>
            <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Recent Activity</h3>
          </div>
          <button onClick={() => setPage(Page.SALES)} className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1">Ledger <ArrowUpRight size={10}/></button>
        </div>
        <div className="space-y-3">
          {salesInRange?.length === 0 ? (
            <div className="py-6 text-center opacity-30 text-[9px] font-black uppercase tracking-widest italic">No sales for this period</div>
          ) : salesInRange?.slice(-5).reverse().map(sale => (
            <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl group active:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-white dark:bg-emerald-950 text-slate-300"><History size={14}/></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-emerald-100 uppercase tracking-tight">#{String(sale.id).slice(-4)}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {sale.paymentMethod}</p>
                 </div>
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
            <h2 className="text-xl font-black mb-6 uppercase text-center italic tracking-tight">Change Period</h2>
            <div className="grid grid-cols-1 gap-2">
              {(['today', 'yesterday', 'thisMonth', 'allTime'] as DatePreset[]).map(p => (
                <button key={p} onClick={() => { setDatePreset(p); setShowDateModal(false); }} className={`p-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all ${datePreset === p ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 dark:bg-emerald-800 text-slate-400'}`}>{p}</p>
              ))}
            </div>
            <button onClick={() => setShowDateModal(false)} className="w-full mt-4 py-3 text-[10px] font-black uppercase text-slate-300">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
