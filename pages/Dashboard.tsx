import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, AlertTriangle, TrendingUp,
  Wallet, BarChart3, History, Calendar as CalendarIcon, ArrowUpRight, Star, Award
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role }) => {
  const isAdmin = role === 'Admin';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const lowStockItems = useLiveQuery(() => db.inventory.where('stock').below(5).toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());
  
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

  const bestSeller = React.useMemo(() => {
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

  const storeNetWorth = React.useMemo(() => {
    if (!inventory) return 0;
    return inventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.stock || 0)), 0);
  }, [inventory]);

  const chartData = React.useMemo(() => {
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
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Home</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Business Overview</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="bg-white border border-gray-100 p-2.5 rounded-2xl text-emerald-600 shadow-sm flex items-center gap-2">
              <CalendarIcon size={20} />
              {!isToday && <span className="text-[10px] font-black uppercase text-gray-400">{new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
            </div>
          </div>
        </div>
      </header>

      {!isToday && (
        <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center justify-between">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
            <History size={14} /> Viewing History: {new Date(selectedDate).toLocaleDateString([], { dateStyle: 'long' })}
          </p>
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-[9px] font-black text-white bg-amber-600 px-3 py-1 rounded-full uppercase"
          >
            Reset to Today
          </button>
        </div>
      )}

      {isAdmin ? (
        <section className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="relative z-10 flex flex-col gap-1">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              {isToday ? 'Net Profit Today' : `Net Profit on ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
            </p>
            <h2 className="text-4xl font-black tracking-tighter">{formatNaira(netProfitOnDate)}</h2>
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
      ) : (
        <section className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">
               {isToday ? 'Revenue Today' : `Revenue for ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
            </p>
            <h2 className="text-4xl font-black mt-1 tracking-tighter">{formatNaira(totalSalesOnDate)}</h2>
            <div className="flex items-center gap-2 mt-4">
              <span className="bg-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {salesOnDate?.length || 0} Transactions
              </span>
            </div>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={140} />
        </section>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setPage(Page.EXPENSES)}
            className="bg-white border border-gray-100 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32 text-left"
          >
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Expenses ({isToday ? 'Today' : 'Date'})</p>
            <h2 className="text-xl font-black text-amber-600">{formatNaira(actualExpensesOnDate)}</h2>
            <Wallet className="absolute -right-2 -bottom-2 text-amber-50" size={56} />
          </button>

          <div className="bg-white border border-gray-100 p-5 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Store Value</p>
            <h2 className="text-xl font-black text-blue-600">{formatNaira(storeNetWorth)}</h2>
            <Package className="absolute -right-2 -bottom-2 text-blue-50" size={56} />
          </div>
        </div>
      )}

      {bestSeller && (
        <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shadow-sm">
              <Award size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Top Performing Product</p>
              <h3 className="text-lg font-black text-gray-800 leading-none">{bestSeller.name}</h3>
              <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Total {bestSeller.quantity} Sold</p>
            </div>
          </div>
          <div className="bg-gray-50 px-3 py-1 rounded-full flex items-center gap-1">
             <Star size={10} className="fill-amber-400 text-amber-400" />
             <span className="text-[9px] font-black text-gray-600 uppercase">Best Seller</span>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">Performance</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Weekly Trend</p>
              </div>
            </div>
          </div>

          <div className="h-40 flex items-end justify-between gap-3 px-1 pt-4">
            {chartData.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="w-full flex justify-center items-end h-full relative">
                  <div 
                    className="w-full bg-emerald-50 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-100" 
                    style={{ height: `${(day.revenue / maxChartVal) * 100}%` }}
                  >
                    <div 
                      className="w-full bg-emerald-500 rounded-t-lg absolute bottom-0 transition-all duration-700" 
                      style={{ height: day.revenue > 0 ? `${(day.profit / day.revenue) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>
                <span className="text-[8px] font-black text-gray-400 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                {isToday ? "Today's Sales" : `Sales: ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Transaction Feed</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {salesOnDate && salesOnDate.length > 0 ? (
            salesOnDate.map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-gray-300 shadow-sm">
                    <CalendarIcon size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800">#{String(sale.id).slice(-4)}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.items.length} items
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-800">{formatNaira(sale.total)}</p>
                  {isAdmin && (
                    <p className="text-[8px] font-bold text-emerald-600 uppercase flex items-center justify-end gap-1">
                      +{formatNaira(sale.total - (sale.totalCost || 0))} <ArrowUpRight size={8}/>
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-3 opacity-30">
              <History size={40} className="mx-auto" />
              <p className="text-[9px] font-bold uppercase tracking-widest">No sales on this date</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <AlertTriangle className="text-amber-500" size={18} />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Stock Warnings</h3>
        </div>
        {lowStockItems && lowStockItems.length > 0 ? (
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 p-5 rounded-[28px] flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-black text-gray-800 text-sm">{item.name}</h4>
                  <p className="text-[10px] font-bold text-red-500 uppercase mt-0.5 tracking-wider">Only {item.stock} left in store</p>
                </div>
                <button 
                  onClick={() => setPage(Page.INVENTORY)}
                  className="bg-gray-50 text-gray-400 p-3 rounded-2xl hover:text-emerald-600 transition-colors"
                >
                  <Package size={20} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/20 p-8 rounded-[32px] text-center border border-emerald-50 border-dashed">
            <p className="text-emerald-800/40 font-black uppercase text-[9px] tracking-[0.2em]">All stock levels are optimal</p>
          </div>
        )}
      </section>
    </div>
  );
};