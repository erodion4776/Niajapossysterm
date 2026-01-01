
import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira, applyInventoryUpdate } from '../utils/whatsapp.ts';
import { 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Wallet, 
  BarChart3, 
  History, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  Star, 
  Award,
  Users,
  Bell,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  Banknote,
  Landmark,
  CreditCard,
  BookOpen,
  X,
  Check,
  Coins,
  Gem,
  RotateCcw,
  RefreshCw,
  Loader2,
  CloudUpload
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

type DatePreset = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'allTime' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const isStaff = localStorage.getItem('user_role') === 'staff';
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice' || isStaff;
  const isAdmin = role === 'Admin' && !isStaffDevice && !isStaff;
  
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const syncInputRef = useRef<HTMLInputElement>(null);
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());
  const securityTable = useLiveQuery(() => db.security.toArray());

  // ALL-TIME DATA FOR LIFETIME SECTION
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());

  // License Visibility Logic
  const licenseInfo = useMemo(() => {
    const expiryStr = localStorage.getItem('license_expiry');
    if (!expiryStr) return { status: 'Free Trial', color: 'bg-blue-500', displayDate: '' };
    
    const year = expiryStr.substring(0, 4);
    const month = expiryStr.substring(4, 6);
    const day = expiryStr.substring(6, 8);
    const displayDate = `${year}-${month}-${day}`;

    const expiryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
    const now = Date.now();
    
    if (now > expiryDate.getTime()) return { status: 'Expired', color: 'bg-red-500', displayDate };
    if (expiryDate.getTime() - now < 604800000) return { status: 'Expiring Soon', color: 'bg-amber-500', displayDate };
    return { status: 'License Active', color: 'bg-emerald-500', displayDate };
  }, [securityTable]);

  // Alert Logic
  const alerts = useMemo(() => {
    if (!inventory) return { expiring: 0, lowStock: 0 };
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    let expiring = 0;
    let lowStock = 0;

    inventory.forEach(item => {
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        if (exp >= now && exp <= sevenDaysFromNow) expiring++;
      }
      const threshold = item.minStock || 5;
      if (item.stock <= threshold) lowStock++;
    });

    return { expiring, lowStock };
  }, [inventory]);

  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    
    switch (datePreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setFullYear(start.getFullYear(), start.getMonth(), lastDay.getDate());
        end.setHours(23, 59, 59, 999);
        break;
      case 'allTime':
        start.setTime(0); // Epoch
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        const d = new Date(customDate);
        start.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
        start.setHours(0, 0, 0, 0);
        end.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
        end.setHours(23, 59, 59, 999);
        break;
    }
    return { start: start.getTime(), end: end.getTime() };
  }, [datePreset, customDate]);

  // OPTIMIZED: Fetch only sales in range
  const salesInRange = useLiveQuery(() => 
    db.sales.where('timestamp').between(dateRange.start, dateRange.end).reverse().toArray()
  , [dateRange]);

  // OPTIMIZED: Fetch only expenses in range
  const expensesInRange = useLiveQuery(() =>
    db.expenses.where('date').between(dateRange.start, dateRange.end).toArray()
  , [dateRange]);

  const totalSalesInRange = useMemo(() => salesInRange?.reduce((sum, sale) => sum + sale.total, 0) || 0, [salesInRange]);
  const totalCostInRange = useMemo(() => salesInRange?.reduce((sum, sale) => sum + (sale.totalCost || 0), 0) || 0, [salesInRange]);
  const actualExpensesInRange = useMemo(() => expensesInRange?.reduce((sum, e) => sum + e.amount, 0) || 0, [expensesInRange]);

  const revenueBreakdown = useMemo(() => {
    if (!salesInRange) return { cash: 0, digital: 0 };
    return salesInRange.reduce((acc, sale) => {
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Partial') {
         acc.cash += (sale.cashPaid || 0);
      } 
      if (sale.paymentMethod === 'Transfer' || sale.paymentMethod === 'Card') {
         acc.digital += sale.total;
      }
      return acc;
    }, { cash: 0, digital: 0 });
  }, [salesInRange]);

  const totalMoneyOutside = useMemo(() => {
    if (!debts) return 0;
    return debts.reduce((sum, d) => sum + (d.remainingBalance || 0), 0);
  }, [debts]);

  // LIFETIME CALCULATIONS
  const lifetimeStats = useMemo(() => {
    if (!allSales || !allExpenses) return { sales: 0, profit: 0, expenses: 0 };
    const totalSales = allSales.reduce((sum, s) => sum + s.total, 0);
    const totalCost = allSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalExp = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = (totalSales - totalCost) - totalExp;
    return { sales: totalSales, profit: netProfit, expenses: totalExp };
  }, [allSales, allExpenses]);

  // Fast Movers Logic
  const topProducts = useMemo(() => {
    if (!salesInRange) return [];
    const counts: Record<string, number> = {};
    salesInRange.forEach(sale => {
      sale.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [salesInRange]);
  
  const grossProfitInRange = totalSalesInRange - totalCostInRange;
  const netProfitInRange = grossProfitInRange - actualExpensesInRange;

  const storeNetWorth = useMemo(() => {
    if (!inventory) return 0;
    return inventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.stock || 0)), 0);
  }, [inventory]);

  const rangeLabel = useMemo(() => {
    switch (datePreset) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'allTime': return 'All Time';
      case 'custom': return customDate;
      default: return 'Range';
    }
  }, [datePreset, customDate]);

  const handleImportInventoryUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsUpdatingInventory(true);
        const jsonStr = event.target?.result as string;
        const data = JSON.parse(jsonStr);
        
        const result = await applyInventoryUpdate(data);
        alert(`Shop Updated! ${result.updated + result.added} items updated with new prices/details.`);
        window.location.reload();
      } catch (err) {
        alert('Update failed: ' + (err as Error).message);
      } finally {
        setIsUpdatingInventory(false);
        if (syncInputRef.current) syncInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Home</h1>
            <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">{isAdmin ? 'Business Overview' : 'Workplace'}</p>
          </div>
          <div className="flex gap-2 items-center">
            {datePreset !== 'today' && (
              <button 
                onClick={() => setDatePreset('today')}
                className="bg-red-50 dark:bg-red-950/20 text-red-500 p-2.5 rounded-2xl border border-red-100 dark:border-red-900/40 active:scale-90 transition-all flex items-center gap-1.5"
                title="Clear Filter"
              >
                <RotateCcw size={16} />
                <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Today</span>
              </button>
            )}
            <button 
              onClick={() => setShowDateModal(true)}
              className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <CalendarIcon size={20} />
              <span className="text-[10px] font-black uppercase tracking-tighter pr-1">{rangeLabel}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Staff Sync Button - prominent placement for non-admins */}
      {!isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-300">
               <RefreshCw size={18} />
             </div>
             <h2 className="text-[11px] font-black text-slate-800 dark:text-emerald-50 uppercase tracking-widest">Inventory Sync</h2>
          </div>
          
          <label className="w-full bg-emerald-50 dark:bg-emerald-800/40 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept=".json" 
              onChange={handleImportInventoryUpdate}
              ref={syncInputRef}
            />
            {isUpdatingInventory ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
            Sync Inventory from Boss
          </label>
          <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-widest">Update shop prices & items from WhatsApp file</p>
        </section>
      )}

      {/* ALERT SYSTEM */}
      {(alerts.expiring > 0 || alerts.lowStock > 0) && showAlerts && (
        <section className="bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/40 rounded-[32px] overflow-hidden shadow-xl animate-in slide-in-from-top duration-500">
          <div className="p-5 border-b border-emerald-50 dark:border-emerald-800/40 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-[11px] font-black text-slate-800 dark:text-emerald-50 uppercase tracking-widest">Critical Alerts</h2>
            </div>
            <button onClick={() => setShowAlerts(false)} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500">Dismiss</button>
          </div>
          <div className="flex flex-col">
            {alerts.expiring > 0 && (
              <button onClick={() => onInventoryFilter('expiring')} className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-950/20 border-b border-white dark:border-emerald-800/20 text-left active:scale-[0.98] transition-all">
                <div className="bg-red-500 text-white p-2.5 rounded-2xl shadow-lg"><ShieldAlert size={20} /></div>
                <div className="flex-1"><p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tight">{alerts.expiring} Items Expiring Soon</p></div>
                <ChevronRight size={18} className="text-red-300" />
              </button>
            )}
            {alerts.lowStock > 0 && (
              <button onClick={() => onInventoryFilter('low-stock')} className="flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-950/20 text-left active:scale-[0.98] transition-all">
                <div className="bg-orange-500 text-white p-2.5 rounded-2xl shadow-lg"><Package size={20} /></div>
                <div className="flex-1"><p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-tight">{alerts.lowStock} Items Low In Stock</p></div>
                <ChevronRight size={18} className="text-orange-300" />
              </button>
            )}
          </div>
        </section>
      )}

      <section className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-1">
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {isAdmin ? `Net Profit ${rangeLabel}` : `Revenue ${rangeLabel}`}
          </p>
          <h2 className="text-4xl font-black tracking-tighter">{isAdmin ? formatNaira(netProfitInRange) : formatNaira(totalSalesInRange)}</h2>
          {isAdmin && (
            <p className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.1em] mt-0.5">
              Total Revenue: {formatNaira(totalSalesInRange)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-4">
            <span className="bg-emerald-500/40 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <ShoppingCart size={10}/> {salesInRange?.length || 0} Orders
            </span>
            {licenseInfo.displayDate && (
              <span className="bg-white/10 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/5">
                <ShieldCheck size={8}/> License until {licenseInfo.displayDate}
              </span>
            )}
          </div>
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={160} />
      </section>

      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-[32px] p-1 flex gap-1 shadow-sm overflow-hidden">
           <div className="flex-1 bg-slate-50 dark:bg-emerald-950/40 p-3 rounded-[24px] text-center">
              <Banknote size={14} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cash in Hand</p>
              <p className="text-xs font-black text-emerald-600">{formatNaira(revenueBreakdown.cash)}</p>
           </div>
           <div className="flex-1 bg-slate-50 dark:bg-emerald-950/40 p-3 rounded-[24px] text-center">
              <Landmark size={14} className="text-blue-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Bank/POS</p>
              <p className="text-xs font-black text-blue-600">{formatNaira(revenueBreakdown.digital)}</p>
           </div>
           <div className="flex-1 bg-slate-50 dark:bg-emerald-950/40 p-3 rounded-[24px] text-center">
              <BookOpen size={14} className="text-red-500 mx-auto mb-1" />
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-tight">Money Outside</p>
              <p className="text-xs font-black text-red-500">{formatNaira(totalMoneyOutside)}</p>
           </div>
        </section>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setPage(Page.EXPENSES)} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left active:scale-95 transition-all">
            <p className="text-slate-400 dark:text-emerald-500/40 text-[9px] font-black uppercase tracking-widest">Expenses</p>
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-500">{formatNaira(actualExpensesInRange)}</h2>
            <Wallet className="absolute -right-2 -bottom-2 text-amber-50 dark:text-amber-500/10" size={56} />
          </button>
          <button onClick={() => { onInventoryFilter('all'); setPage(Page.INVENTORY); }} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left active:scale-95 transition-all">
            <p className="text-slate-400 dark:text-emerald-500/40 text-[9px] font-black uppercase tracking-widest">Store Value</p>
            <h2 className="text-xl font-black text-blue-600 dark:text-blue-50">{formatNaira(storeNetWorth)}</h2>
            <Package className="absolute -right-2 -bottom-2 text-blue-50 dark:text-blue-500/10" size={56} />
          </button>
        </div>
      )}

      {/* SHOP LIFETIME RECORDS - New Distinct Section */}
      {isAdmin && (
        <section className="bg-slate-900 dark:bg-blue-950 p-6 rounded-[32px] border border-slate-800 dark:border-blue-900 shadow-xl space-y-5 animate-in slide-in-from-bottom duration-500">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                <Gem size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Shop Lifetime Records</h3>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Total Business History</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-3">
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Coins size={14}/></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Sales</span>
                 </div>
                 <span className="text-sm font-black text-white">{formatNaira(lifetimeStats.sales)}</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><TrendingUp size={14}/></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Profit</span>
                 </div>
                 <span className="text-sm font-black text-emerald-400">{formatNaira(lifetimeStats.profit)}</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><Wallet size={14}/></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Expenses</span>
                 </div>
                 <span className="text-sm font-black text-amber-400">{formatNaira(lifetimeStats.expenses)}</span>
              </div>
           </div>
        </section>
      )}

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600 dark:text-blue-400"><History size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">{rangeLabel} Sales</h3>
              <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Transaction Feed</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {salesInRange && salesInRange.length > 0 ? (
            <>
              {salesInRange.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-lg text-slate-300 dark:text-emerald-600 shadow-sm"><CalendarIcon size={12} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-emerald-100">#{String(sale.id).slice(-4)}</p>
                      <p className="text-[8px] font-bold text-slate-400 dark:text-emerald-500/40 uppercase">{sale.paymentMethod} • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800 dark:text-emerald-100">{formatNaira(sale.total)}</p>
                  </div>
                </div>
              ))}
              {salesInRange.length > 5 && (
                <button 
                  onClick={() => setPage(Page.SALES)}
                  className="w-full py-4 bg-slate-100 dark:bg-emerald-800/40 rounded-2xl text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  View All {salesInRange.length} Transactions <ChevronRight size={14} />
                </button>
              )}
            </>
          ) : (
            <div className="py-12 text-center space-y-3 bg-emerald-50/20 dark:bg-emerald-800/10 p-8 rounded-[32px] border border-dashed border-emerald-100 dark:border-emerald-800/40">
              <History size={40} className="mx-auto text-emerald-200 dark:text-emerald-800" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 dark:text-emerald-700">No sales recorded</p>
            </div>
          )}
        </div>
      </section>

      {/* TOP PRODUCTS SECTION */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600 dark:text-amber-400"><Zap size={18} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Top Products {rangeLabel}</h3>
            <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Fast Movers</p>
          </div>
        </div>
        <div className="space-y-2">
          {topProducts.length > 0 ? (
            topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-amber-50/30 dark:bg-emerald-800/10 rounded-2xl border border-amber-100/50 dark:border-emerald-800/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-[10px]">
                    #{idx + 1}
                  </div>
                  <p className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight truncate max-w-[140px]">{product.name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-xs font-black text-amber-600 dark:text-amber-400">{product.qty}</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">sold</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-emerald-800">No data for this date</p>
          )}
        </div>
      </section>

      {/* Date Range Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><CalendarIcon size={20}/></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Select Range</h2>
              </div>
              <button onClick={() => setShowDateModal(false)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
            </div>
            
            <div className="space-y-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'allTime', label: 'All Time' }
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => { setDatePreset(preset.id as DatePreset); setShowDateModal(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${datePreset === preset.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 dark:bg-emerald-950 text-slate-600 dark:text-emerald-400 hover:bg-slate-100'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{preset.label}</span>
                  {datePreset === preset.id && <Check size={16} />}
                </button>
              ))}

              <div className="pt-4 border-t border-slate-100 dark:border-emerald-800 mt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Custom Date Selection</p>
                <div className="flex gap-2">
                  <input 
                    type="date"
                    className={`flex-1 p-4 bg-slate-50 dark:bg-emerald-950 border rounded-2xl text-[10px] font-black uppercase outline-none transition-all ${datePreset === 'custom' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100 dark:border-emerald-800'}`}
                    value={customDate}
                    onChange={(e) => { setCustomDate(e.target.value); setDatePreset('custom'); }}
                  />
                  <button 
                    onClick={() => { setDatePreset('custom'); setShowDateModal(false); }}
                    className="p-4 bg-emerald-600 text-white rounded-2xl active:scale-90 transition-all shadow-md"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
