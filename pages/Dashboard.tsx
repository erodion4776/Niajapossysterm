
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale } from '../db.ts';
import { 
  formatNaira, 
  applyInventoryUpdate, 
  exportStaffSalesReport 
} from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, TrendingUp, History, Calendar as CalendarIcon, 
  ChevronRight, Landmark, Banknote, BookOpen, Gem, 
  Info, ShieldAlert, Award, ArrowUpRight, TrendingDown,
  Download, Send, Loader2, CheckCircle2, RefreshCw, Hand, CalendarDays, X, BarChart3
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
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showProfitInfo, setShowProfitInfo] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<Sale | null>(null);
  
  const [ownerGreeting, setOwnerGreeting] = useState('');
  const [displayShopName, setDisplayShopName] = useState('NaijaShop');

  const syncInputRef = useRef<HTMLInputElement>(null);
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  // LIFETIME DATA (Always visible at bottom for comparison)
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());

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
    if (datePreset === 'today') { 
      start.setHours(0,0,0,0); 
      end.setHours(23,59,59,999); 
    }
    else if (datePreset === 'yesterday') { 
      start.setDate(start.getDate()-1); 
      start.setHours(0,0,0,0); 
      end.setDate(end.getDate()-1); 
      end.setHours(23,59,59,999); 
    }
    else if (datePreset === 'thisMonth') { 
      start.setDate(1); 
      start.setHours(0,0,0,0); 
    }
    else if (datePreset === 'custom' && customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      start.setFullYear(y, m - 1, d);
      start.setHours(0,0,0,0);
      end.setFullYear(y, m - 1, d);
      end.setHours(23,59,59,999);
    }
    else if (datePreset === 'allTime') { 
      start.setTime(0); 
    }
    return { start: start.getTime(), end: end.getTime() };
  }, [datePreset, customDate]);

  const salesInRange = useLiveQuery(() => db.sales.where('timestamp').between(dateRange.start, dateRange.end).toArray(), [dateRange]);
  const expensesInRange = useLiveQuery(() => db.expenses.where('date').between(dateRange.start, dateRange.end).toArray(), [dateRange]);

  const calculateStats = (sales: Sale[] | undefined, expenses: any[] | undefined) => {
    if (!sales || !expenses) return { revenue: 0, costOfGoods: 0, expenses: 0, netProfit: 0, cash: 0, transfers: 0, itemsSold: 0 };
    
    const revenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);

    const cash = sales
      .filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'Partial')
      .reduce((sum, s) => sum + (s.cashPaid || s.total), 0);
    
    const transfers = sales
      .filter(s => s.paymentMethod === 'Transfer' || s.paymentMethod === 'Card' || s.paymentMethod === 'Wallet')
      .reduce((sum, s) => sum + Number(s.total - (s.paymentMethod === 'Partial' ? (s.cashPaid || 0) : 0)), 0);
    
    const costOfGoods = sales.reduce((acc, sale) => {
      const saleCogs = sale.items.reduce((iSum, item) => iSum + (Number(item.costPrice || 0) * item.quantity), 0);
      return acc + saleCogs;
    }, 0);
    
    const netProfit = revenue - costOfGoods - expenseTotal;
    return { revenue, costOfGoods, expenses: expenseTotal, netProfit, cash, transfers, itemsSold };
  };

  const financialStats = useMemo(() => calculateStats(salesInRange, expensesInRange), [salesInRange, expensesInRange]);
  const lifetimeStats = useMemo(() => calculateStats(allSales, allExpenses), [allSales, allExpenses]);

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
          <CalendarIcon size={20} /><span className="text-[10px] font-black uppercase">{datePreset === 'custom' ? customDate : datePreset}</span>
        </button>
      </header>

      {/* DASHBOARD SUMMARY CARD */}
      <section className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">
              {isAdmin 
                ? (datePreset === 'custom' ? `Net Profit on ${customDate}` : `Net Profit (${datePreset})`) 
                : `Activity Volume (${datePreset})`}
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
                 : `${financialStats.itemsSold} Items Moved`}
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

      {/* HISTORICAL SALES FEED */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600"><History size={18} /></div>
            <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">
              {datePreset === 'custom' ? `Sales on ${customDate}` : 'Recent Sales'}
            </h3>
          </div>
          <button onClick={() => setPage(Page.SALES)} className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1">Full Ledger <ArrowUpRight size={10}/></button>
        </div>
        <div className="space-y-3">
          {salesInRange && salesInRange.length > 0 ? (
            salesInRange.slice(-15).reverse().map(sale => (
              <button 
                key={sale.id} 
                onClick={() => setSelectedSaleForModal(sale)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl active:scale-95 transition-all"
              >
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-800 dark:text-emerald-100 uppercase tracking-tight">#{String(sale.id).slice(-4)}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">{isAdmin ? formatNaira(sale.total) : 'RECOGNIZED'}</p>
                  <p className="text-[7px] font-bold text-slate-300 uppercase">{sale.paymentMethod}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center bg-slate-50/50 dark:bg-emerald-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-emerald-800">
               <CalendarDays size={32} className="mx-auto text-slate-200 mb-2" />
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-6">
                 No records found for this date. The shop might have been closed.
               </p>
            </div>
          )}
        </div>
      </section>

      {/* TOP SELLERS */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600"><Award size={18} /></div>
          <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Top Items ({datePreset === 'custom' ? customDate : datePreset})</h3>
        </div>
        <div className="space-y-2">
           {topProducts.length > 0 ? topProducts.map((p, idx) => (
             <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-600 dark:text-emerald-100 uppercase truncate pr-4">{p.name}</span>
                <span className="bg-white dark:bg-emerald-950 px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 border border-slate-100 dark:border-emerald-800">x{p.qty}</span>
             </div>
           )) : <p className="text-[9px] text-slate-300 font-black uppercase text-center py-4 italic">No top items for this period</p>}
        </div>
      </section>

      {/* SHOP LIFETIME RECORDS (Always visible for comparison) */}
      {isAdmin && (
        <section className="bg-slate-900 text-white p-7 rounded-[40px] shadow-2xl relative overflow-hidden">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/10 rounded-xl"><Gem size={18} className="text-emerald-400" /></div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Lifetime Records</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="text-2xl font-black tracking-tighter">{allSales?.length || 0}</p>
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Profit</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">{formatNaira(lifetimeStats.netProfit)}</p>
                 </div>
              </div>
           </div>
           <BarChart3 size={160} className="absolute -right-8 -bottom-8 opacity-5 text-white" />
        </section>
      )}

      {/* DATE SELECTION MODAL */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-black uppercase italic tracking-tight">Select Period</h2>
               <button onClick={() => setShowDateModal(false)} className="text-slate-300"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-1 gap-2 mb-6">
              {(['today', 'yesterday', 'thisMonth', 'allTime'] as DatePreset[]).map(p => (
                <button key={p} onClick={() => { setDatePreset(p); setShowDateModal(false); }} className={`py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all ${datePreset === p ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-emerald-800 text-slate-400'}`}>{p}</button>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-emerald-800">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Lookup Specific Day</p>
               <input 
                  type="date" 
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-emerald-950 border border-slate-200 dark:border-emerald-800 rounded-2xl p-4 font-black text-emerald-600 outline-none text-center"
               />
               <button 
                onClick={() => { setDatePreset('custom'); setShowDateModal(false); }}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all shadow-xl"
               >
                 Check Date
               </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE DETAILS MODAL (FOR FEED) */}
      {selectedSaleForModal && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 dark:bg-blue-900 rounded-xl text-blue-600"><History size={18}/></div>
                 <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Receipt History</h2>
              </div>
              <button onClick={() => setSelectedSaleForModal(null)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-emerald-950/40 p-6 rounded-[32px] font-mono text-xs space-y-3 border border-slate-100 dark:border-emerald-800">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-dashed border-slate-200 dark:border-emerald-800 pb-2 mb-2">
                   <span>TRANS #{String(selectedSaleForModal.id).padStart(4, '0')}</span>
                   <span>{new Date(selectedSaleForModal.timestamp).toLocaleString()}</span>
                </div>
                {selectedSaleForModal.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-4 uppercase">{item.name} x{item.quantity}</span>
                    <span className="font-bold">{isAdmin ? formatNaira(item.price * item.quantity) : '***'}</span>
                  </div>
                ))}
                {isAdmin && (
                  <div className="border-t border-dashed border-slate-200 dark:border-emerald-800 mt-2 pt-2 flex justify-between font-black text-sm text-emerald-600">
                    <span>TOTAL</span>
                    <span>{formatNaira(selectedSaleForModal.total)}</span>
                  </div>
                )}
                <div className="pt-2 text-[8px] font-black text-slate-400 uppercase">
                   Payment: {selectedSaleForModal.paymentMethod} • Recorded by {selectedSaleForModal.staff_name}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => { exportStaffSalesReport([selectedSaleForModal]); setSelectedSaleForModal(null); }} 
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-xl active:scale-95"
                >
                  <Send size={16}/> Export Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
