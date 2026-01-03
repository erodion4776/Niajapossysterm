
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { 
  formatNaira, 
  applyInventoryUpdate, 
  exportStaffSalesReport 
} from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, TrendingUp, History, Calendar as CalendarIcon, 
  ChevronRight, Landmark, Banknote, BookOpen, Gem, 
  Info, ShieldAlert, Award, ArrowUpRight, TrendingDown,
  Download, Send, Loader2, CheckCircle2, RefreshCw, Hand
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [ownerGreeting, setOwnerGreeting] = useState('');
  const [displayShopName, setDisplayShopName] = useState('NaijaShop');

  const syncInputRef = useRef<HTMLInputElement>(null);
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  useEffect(() => {
    const loadIdentity = async () => {
      const sn = await db.settings.get('shop_name');
      const on = await db.settings.get('owner_name');
      if (sn) setDisplayShopName(sn.value);
      if (on) setOwnerGreeting(on.value.split(' ')[0]); 
    };
    loadIdentity();
  }, []);

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
    if (!salesInRange || !expensesInRange) return { revenue: 0, costOfGoods: 0, expenses: 0, netProfit: 0, cash: 0, transfers: 0, itemsSold: 0 };
    
    const revenue = salesInRange.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const expenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const itemsSold = salesInRange.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);

    const cash = salesInRange
      .filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'Partial')
      .reduce((sum, s) => sum + (s.cashPaid || s.total), 0);
    
    const transfers = salesInRange
      .filter(s => s.paymentMethod === 'Transfer' || s.paymentMethod === 'Card' || s.paymentMethod === 'Wallet')
      .reduce((sum, s) => sum + Number(s.total - (s.paymentMethod === 'Partial' ? (s.cashPaid || 0) : 0)), 0);
    
    const costOfGoods = salesInRange.reduce((acc, sale) => {
      const saleCogs = sale.items.reduce((iSum, item) => iSum + (Number(item.costPrice || 0) * item.quantity), 0);
      return acc + saleCogs;
    }, 0);
    
    const netProfit = revenue - costOfGoods - expenses;
    return { revenue, costOfGoods, expenses, netProfit, cash, transfers, itemsSold };
  }, [salesInRange, expensesInRange]);

  const totalMoneyOutside = useMemo(() => debts?.filter(d => d.status === 'Unpaid').reduce((sum, d) => sum + Number(d.remainingBalance || 0), 0) || 0, [debts]);

  const handleSyncFromBoss = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        const result = await applyInventoryUpdate(data);
        alert(`✅ Shop Updated! ${result.added + result.updated} items received from Boss.`);
        window.location.reload();
      } catch (err) {
        alert("Sync failed: Invalid file.");
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSendReport = async () => {
    if (!salesInRange || salesInRange.length === 0) {
      alert("No sales to report today!");
      return;
    }
    setIsExporting(true);
    try {
      await exportStaffSalesReport(salesInRange);
    } catch (err) {
      alert("Failed to generate report.");
    } finally {
      setIsExporting(false);
    }
  };

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
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase truncate max-w-[180px]">{displayShopName}</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            {isAdmin ? <><span className="text-emerald-600">Welcome, {ownerGreeting}!</span> <Hand size={10}/></> : 'Staff Terminal'}
          </p>
        </div>
        <button onClick={() => setShowDateModal(true)} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2 active:scale-95 transition-all">
          <CalendarIcon size={20} /><span className="text-[10px] font-black uppercase">{datePreset}</span>
        </button>
      </header>

      {/* STAFF VIEW PRIMARY CARD: COUNTS ONLY */}
      <section className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">
              {isAdmin ? `Net Profit (${datePreset})` : `Activity Volume (${datePreset})`}
            </p>
            {isAdmin && <button onClick={() => setShowProfitInfo(!showProfitInfo)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><Info size={12}/></button>}
          </div>
          
          <h2 className="text-4xl font-black tracking-tighter">
            {isAdmin 
              ? formatNaira(financialStats.netProfit) 
              : `${salesInRange?.length || 0} Sales Recorded`}
          </h2>

          <div className="flex items-center gap-2 mt-2">
             <div className="px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <TrendingUp size={10} /> 
               {isAdmin 
                 ? `Revenue: ${formatNaira(financialStats.revenue)}` 
                 : `${financialStats.itemsSold} Items Moved Today`}
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

      {/* STAFF WORKSPACE TOOLS */}
      {isStaffDevice && (
        <section className="bg-white dark:bg-emerald-900/40 border-2 border-dashed border-emerald-200 dark:border-emerald-800 p-6 rounded-[32px] space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600"><CheckCircle2 size={18}/></div>
             <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Sync Loop</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="w-full bg-emerald-50 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all cursor-pointer border border-emerald-100 dark:border-emerald-700/50">
               <input type="file" ref={syncInputRef} className="hidden" accept=".json" onChange={handleSyncFromBoss} />
               {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 📥 Update Stock from Boss
            </label>
            <button onClick={handleSendReport} disabled={isExporting} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100 dark:shadow-none">
               {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 📤 Send Daily Report to Boss
            </button>
          </div>
        </section>
      )}

      {/* ADMIN MONEY BREAKDOWN */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-2">
           <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
              <Banknote size={16} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cash</p>
              <p className="text-[10px] font-black text-emerald-600 truncate">{formatNaira(financialStats.cash)}</p>
           </div>
           <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all">
              <Landmark size={16} className="text-blue-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Bank / POS</p>
              <p className="text-[10px] font-black text-blue-600 truncate">{formatNaira(financialStats.transfers)}</p>
           </div>
           <div onClick={() => setPage(Page.DEBTS)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] text-center shadow-sm border border-slate-50 dark:border-emerald-800/20 active:scale-95 transition-all cursor-pointer">
              <BookOpen size={16} className="text-red-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Debt Book</p>
              <p className="text-[10px] font-black text-red-500 truncate">{formatNaira(totalMoneyOutside)}</p>
           </div>
        </div>
      )}

      {/* SHARED ACTIVITY SECTION */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600"><Award size={18} /></div>
          <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Top Sellers</h3>
        </div>
        <div className="space-y-2">
           {topProducts.length > 0 ? topProducts.map((p, idx) => (
             <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-600 dark:text-emerald-100 uppercase truncate pr-4">{p.name}</span>
                <span className="bg-white dark:bg-emerald-950 px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 border border-slate-100 dark:border-emerald-800">x{p.qty}</span>
             </div>
           )) : <p className="text-[9px] text-slate-300 font-black uppercase text-center py-4">No activity yet</p>}
        </div>
      </section>

      {/* RECENT SALES FEED */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600"><History size={18} /></div><h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Sale Feed</h3></div>
          <button onClick={() => setPage(Page.SALES)} className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1">Ledger <ArrowUpRight size={10}/></button>
        </div>
        <div className="space-y-3">
          {salesInRange?.slice(-5).reverse().map(sale => (
            <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl">
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-emerald-100 uppercase tracking-tight">#{String(sale.id).slice(-4)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
              </div>
              <p className="text-xs font-black text-emerald-600">{isAdmin ? formatNaira(sale.total) : 'RECOGNIZED'}</p>
            </div>
          ))}
        </div>
      </section>

      {showDateModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-xs rounded-[40px] p-6 shadow-2xl">
            <h2 className="text-xl font-black mb-6 uppercase text-center italic">Change Period</h2>
            <div className="grid grid-cols-1 gap-2">
              {(['today', 'yesterday', 'thisMonth', 'allTime'] as DatePreset[]).map(p => (
                <button key={p} onClick={() => { setDatePreset(p); setShowDateModal(false); }} className={`p-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest ${datePreset === p ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-emerald-800 text-slate-400'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
