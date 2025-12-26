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
  ShieldAlert
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
  
  // Alert Logic
  const alerts = useMemo(() => {
    if (!inventory) return { expiring: 0, lowStock: 0 };
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    let expiring = 0;
    let lowStock = 0;

    inventory.forEach(item => {
      // Expiry Check
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        if (exp >= now && exp <= sevenDaysFromNow) {
          expiring++;
        }
      }
      // Low Stock Check
      const threshold = item.minStock || 5;
      if (item.stock <= threshold) {
        lowStock++;
      }
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

  const last7DaysSales = useLiveQuery(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return await db.sales.where('timestamp').aboveOrEqual(sevenDaysAgo.getTime()).toArray();
  });

  const expenses = useLiveQuery(() => db.expenses.toArray());

  const totalSalesOnDate = salesOnDate?.reduce((sum, sale) => sum + sale.total, 0) || 0;
  const totalCostOnDate = salesOnDate?.reduce((sum, sale) => sum + (sale.totalCost || 0), 0) || 0;
  
  const actualExpensesOnDate = expenses?.filter(e => {
    const d = new Date(e.date).getTime();
    return d >= queryStart.getTime() && d <= queryEnd.getTime();
  }).reduce((sum, e) => sum + e.amount, 0) || 0;

  const grossProfitOnDate = totalSalesOnDate - totalCostOnDate;
  const netProfitOnDate = grossProfitOnDate - actualExpensesOnDate;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const bestSeller = useMemo(() => {
    if (!allSales) return null;
    const itemMap: Record<string, { name: string, quantity: number }> = {};
    allSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, quantity: 0 };
        }
        itemMap[item.name].quantity += item.quantity;
      });
    });
    const sorted = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
    return sorted[0] || null;
  }, [allSales]);

  const storeNetWorth = useMemo(() => {
    if (!inventory) return 0;
    return inventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.stock || 0)), 0);
  }, [inventory]);

  const chartData = useMemo(() => {
    if (!last7DaysSales) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-NG', { weekday: 'short' });
      const dayS = new Date(d).setHours(0, 0, 0, 0);
      const dayE = new Date(d).setHours(23, 59, 59, 999);
      
      const daySales = last7DaysSales.filter(s => s.timestamp >= dayS && s.timestamp <= dayE);
      const revenue = daySales.reduce((sum, s) => sum + s.total, 0);
      const profit = revenue - daySales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
      days.push({ label, revenue, profit });
    }
    return days;
  }, [last7DaysSales]);

  const maxChartVal = Math.max(...chartData.map(d => d.revenue), 1000);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Home</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Business Overview</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2">
              <CalendarIcon size={20} />
              {!isToday && <span className="text-[10px] font-black uppercase text-slate-400 dark:text-emerald-500/40">{new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* PHARMACY GRADE ALERT SYSTEM */}
      {(alerts.expiring > 0 || alerts.lowStock > 0) && showAlerts && (
        <section className="bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/40 rounded-[32px] overflow-hidden shadow-xl animate-in slide-in-from-top duration-500">
          <div className="p-5 border-b border-emerald-50 dark:border-emerald-800/40 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-[11px] font-black text-slate-800 dark:text-emerald-50 uppercase tracking-widest">Critical Alerts</h2>
            </div>
            <button onClick={() => setShowAlerts(false)} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors">Dismiss</button>
          </div>
          
          <div className="flex flex-col">
            {alerts.expiring > 0 && (
              <button 
                onClick={() => onInventoryFilter('expiring')}
                className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-950/20 border-b border-white dark:border-emerald-800/20 text-left active:scale-[0.98] transition-all"
              >
                <div className="bg-red-500 text-white p-2.5 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none">
                  <ShieldAlert size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tight">{alerts.expiring} Items Expiring Soon</p>
                  <p className="text-[9px] font-bold text-red-500/60 uppercase mt-0.5">Expiring within 7 days • Prevent 100% loss</p>
                </div>
                <ChevronRight size={18} className="text-red-300" />
              </button>
            )}

            {alerts.lowStock > 0 && (
              <button 
                onClick={() => onInventoryFilter('low-stock')}
                className="flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-950/20 text-left active:scale-[0.98] transition-all"
              >
                <div className="bg-orange-500 text-white p-2.5 rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none">
                  <Package size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-tight">{alerts.lowStock} Items Low In Stock</p>
                  <p className="text-[9px] font-bold text-orange-500/60 uppercase mt-0.5">Below threshold • Restock now to sell</p>
                </div>
                <ChevronRight size={18} className="text-orange-300" />
              </button>
            )}
          </div>
        </section>
      )}

      {!isToday && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-3 rounded-2xl flex items-center justify-between">
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} /> Viewing History: {new Date(selectedDate).toLocaleDateString([], { dateStyle: 'long' })}
          </p>
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-[9px] font-black text-white bg-amber-600 px-3 py-1 rounded-full uppercase"
          >
            Reset
          </button>
        </div>
      )}

      <section className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="relative z-10 flex flex-col gap-1">
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {isToday ? (isAdmin ? 'Net Profit Today' : 'Revenue Today') : (isAdmin ? `Net Profit on ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : `Revenue on ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`)}
          </p>
          <h2 className="text-4xl font-black tracking-tighter">{isAdmin ? formatNaira(netProfitOnDate) : formatNaira(totalSalesOnDate)}</h2>
          <div className="flex items-center gap-2 mt-4">
            <span className="bg-emerald-500/40 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <ShoppingCart size={10}/> {salesOnDate?.length || 0} Orders
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
              {formatNaira(totalSalesOnDate)} Revenue
            </span>
          </div>
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={160} />
      </section>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setPage(Page.EXPENSES)}
            className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left active:scale-95 transition-all"
          >
            <p className="text-slate-400 dark:text-emerald-500/40 text-[9px] font-black uppercase tracking-widest">Expenses</p>
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-500">{formatNaira(actualExpensesOnDate)}</h2>
            <Wallet className="absolute -right-2 -bottom-2 text-amber-50 dark:text-amber-500/10" size={56} />
          </button>

          <button 
            onClick={() => { onInventoryFilter('all'); setPage(Page.INVENTORY); }}
            className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left active:scale-95 transition-all"
          >
            <p className="text-slate-400 dark:text-emerald-500/40 text-[9px] font-black uppercase tracking-widest">Store Value</p>
            <h2 className="text-xl font-black text-blue-600 dark:text-blue-500">{formatNaira(storeNetWorth)}</h2>
            <Package className="absolute -right-2 -bottom-2 text-blue-50 dark:text-blue-500/10" size={56} />
          </button>
        </div>
      )}

      {bestSeller && (
        <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm">
              <Award size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest leading-none mb-1">Top Performing Product</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-emerald-50 leading-none">{bestSeller.name}</h3>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">Total {bestSeller.quantity} Sold</p>
            </div>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-800/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Performance</h2>
                <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Weekly Trend</p>
              </div>
            </div>
          </div>

          <div className="h-40 flex items-end justify-between gap-3 px-1 pt-4">
            {chartData.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full flex justify-center items-end h-full relative">
                  <div 
                    className="w-full bg-slate-50 dark:bg-emerald-800/10 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-800/20" 
                    style={{ height: `${(day.revenue / maxChartVal) * 100}%` }}
                  >
                    <div 
                      className="w-full bg-emerald-500 rounded-t-lg absolute bottom-0 transition-all duration-700" 
                      style={{ height: day.revenue > 0 ? `${(day.profit / day.revenue) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>
                <span className="text-[8px] font-black text-slate-400 dark:text-emerald-500/40 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl text-blue-600 dark:text-blue-400">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">
                {isToday ? "Today's Sales" : `Sales on ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
              </h3>
              <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Transaction Feed</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {salesOnDate && salesOnDate.length > 0 ? (
            salesOnDate.map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-800/20 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                <div className="flex items-center gap-3">
                  <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-lg text-slate-300 dark:text-emerald-600 shadow-sm">
                    <CalendarIcon size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-emerald-100">#{String(sale.id).slice(-4)}</p>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-emerald-500/40 uppercase">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.items.length} items
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800 dark:text-emerald-100">{formatNaira(sale.total)}</p>
                  {isAdmin && (
                    <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center justify-end gap-1">
                      +{formatNaira(sale.total - (sale.totalCost || 0))} <ArrowUpRight size={8}/>
                    </p>
                  )}
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

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Debt Tracking</h3>
            <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Customer Credit Book</p>
          </div>
        </div>
        <button 
          onClick={() => setPage(Page.DEBTS)}
          className="bg-emerald-50 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
        >
          View Book
        </button>
      </section>
    </div>
  );
};