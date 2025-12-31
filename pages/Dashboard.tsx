
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
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
  BookOpen
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice';
  const isAdmin = role === 'Admin' && !isStaffDevice;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAlerts, setShowAlerts] = useState(true);
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());
  const securityTable = useLiveQuery(() => db.security.toArray());

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

  const queryStart = new Date(selectedDate);
  queryStart.setHours(0, 0, 0, 0);
  const queryEnd = new Date(selectedDate);
  queryEnd.setHours(23, 59, 59, 999);

  const salesOnDate = useLiveQuery(() => 
    db.sales.where('timestamp').between(queryStart.getTime(), queryEnd.getTime()).reverse().toArray()
  , [selectedDate]);

  // Profit uses the FULL sale amount (Gross)
  const totalSalesOnDate = salesOnDate?.reduce((sum, sale) => sum + sale.total, 0) || 0;
  const totalCostOnDate = salesOnDate?.reduce((sum, sale) => sum + (sale.totalCost || 0), 0) || 0;

  const revenueBreakdown = useMemo(() => {
    if (!salesOnDate) return { cash: 0, digital: 0 };
    return salesOnDate.reduce((acc, sale) => {
      // CASH IN HAND: Only physical cash physically received today for this transaction
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Partial') {
         acc.cash += (sale.cashPaid || 0);
      } 
      
      // DIGITAL: Track full value for Transfer/Card transactions
      if (sale.paymentMethod === 'Transfer' || sale.paymentMethod === 'Card') {
         acc.digital += sale.total;
      }
      return acc;
    }, { cash: 0, digital: 0 });
  }, [salesOnDate]);

  const totalMoneyOutside = useMemo(() => {
    if (!debts) return 0;
    return debts.reduce((sum, d) => sum + (d.remainingBalance || 0), 0);
  }, [debts]);

  // Fast Movers Logic
  const topProducts = useMemo(() => {
    if (!salesOnDate) return [];
    const counts: Record<string, number> = {};
    salesOnDate.forEach(sale => {
      sale.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [salesOnDate]);
  
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const actualExpensesOnDate = expenses?.filter(e => {
    const d = new Date(e.date).getTime();
    return d >= queryStart.getTime() && d <= queryEnd.getTime();
  }).reduce((sum, e) => sum + e.amount, 0) || 0;

  const grossProfitOnDate = totalSalesOnDate - totalCostOnDate;
  const netProfitOnDate = grossProfitOnDate - actualExpensesOnDate;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const storeNetWorth = useMemo(() => {
    if (!inventory) return 0;
    return inventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.stock || 0)), 0);
  }, [inventory]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Home</h1>
            <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Business Overview</p>
          </div>
          <div className="flex gap-2">
            {!isStaffDevice && (
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-emerald-950 rounded-full border border-slate-200 dark:border-emerald-800/40 pr-3">
                 <div className={`w-7 h-7 rounded-full ${licenseInfo.color} flex items-center justify-center text-white shadow-lg`}>
                    <ShieldCheck size={14} />
                 </div>
                 <div className="flex flex-col -space-y-0.5">
                    <p className={`text-[9px] font-black uppercase tracking-tighter ${licenseInfo.status === 'Expired' ? 'text-red-500' : 'text-slate-800 dark:text-emerald-400'}`}>
                      {licenseInfo.status}
                    </p>
                    {licenseInfo.displayDate && <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{licenseInfo.displayDate}</p>}
                 </div>
              </div>
            )}
            
            <div className="relative">
              <input 
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <div className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2 active:scale-95 transition-all">
                <CalendarIcon size={20} />
              </div>
            </div>
          </div>
        </div>
      </header>

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
            {isToday ? (isAdmin ? 'Net Profit Today' : 'Revenue Today') : (isAdmin ? `Net Profit History` : `Revenue History`)}
          </p>
          <h2 className="text-4xl font-black tracking-tighter">{isAdmin ? formatNaira(netProfitOnDate) : formatNaira(totalSalesOnDate)}</h2>
          <div className="flex items-center gap-2 mt-4">
            <span className="bg-emerald-500/40 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <ShoppingCart size={10}/> {salesOnDate?.length || 0} Orders
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
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-500">{formatNaira(actualExpensesOnDate)}</h2>
            <Wallet className="absolute -right-2 -bottom-2 text-amber-50 dark:text-amber-500/10" size={56} />
          </button>
          <button onClick={() => { onInventoryFilter('all'); setPage(Page.INVENTORY); }} className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left active:scale-95 transition-all">
            <p className="text-slate-400 dark:text-emerald-500/40 text-[9px] font-black uppercase tracking-widest">Store Value</p>
            <h2 className="text-xl font-black text-blue-600 dark:text-blue-50">{formatNaira(storeNetWorth)}</h2>
            <Package className="absolute -right-2 -bottom-2 text-blue-50 dark:text-blue-500/10" size={56} />
          </button>
        </div>
      )}

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600 dark:text-blue-400"><History size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">{isToday ? "Today's Sales" : `Sales History`}</h3>
              <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Transaction Feed</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {salesOnDate && salesOnDate.length > 0 ? (
            salesOnDate.map(sale => (
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
            ))
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
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Top Products {isToday ? "Today" : ""}</h3>
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
    </div>
  );
};
