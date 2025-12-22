
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  ShoppingCart, Package, AlertTriangle, TrendingUp, DollarSign, 
  Wallet, BarChart3, History, Calendar, ArrowUpRight 
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role }) => {
  const isAdmin = role === 'Admin';
  
  // Queries
  const lowStockItems = useLiveQuery(() => db.inventory.where('stock').below(5).toArray());
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const salesToday = useLiveQuery(() => 
    db.sales.where('timestamp').between(todayStart.getTime(), todayEnd.getTime()).reverse().toArray()
  );

  const last7DaysSales = useLiveQuery(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return await db.sales.where('timestamp').aboveOrEqual(sevenDaysAgo.getTime()).toArray();
  });

  const expensesToday = useLiveQuery(() => db.expenses.toArray());

  // Financial Calculations
  const totalSalesToday = salesToday?.reduce((sum, sale) => sum + sale.total, 0) || 0;
  const totalCostToday = salesToday?.reduce((sum, sale) => sum + (sale.totalCost || 0), 0) || 0;
  
  const actualExpensesToday = expensesToday?.filter(e => {
    const d = new Date(e.date).getTime();
    return d >= todayStart.getTime() && d <= todayEnd.getTime();
  }).reduce((sum, e) => sum + e.amount, 0) || 0;

  const grossProfitToday = totalSalesToday - totalCostToday;
  const netProfitToday = grossProfitToday - actualExpensesToday;

  // Chart Data Processing
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
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Shop Performance</p>
        </div>
        <div className="bg-emerald-100 p-2.5 rounded-2xl text-emerald-600">
          <TrendingUp size={24} />
        </div>
      </header>

      {/* 1. Admin Analytics Visualization */}
      {isAdmin && (
        <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">Performance Chart</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase">7-Day Sales & Profit</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-100"></span>
                <span className="text-[7px] font-black text-gray-400 uppercase">Sales</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[7px] font-black text-gray-400 uppercase">Profit</span>
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

      {/* 2. Top-Level Metrics */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Revenue Today</p>
            <h2 className="text-4xl font-black mt-1 tracking-tighter">{formatNaira(totalSalesToday)}</h2>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={140} />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 p-5 rounded-[28px] shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Today's Expenses</p>
                <h2 className="text-lg font-black mt-1 text-amber-600">{formatNaira(actualExpensesToday)}</h2>
              </div>
              <Wallet className="absolute -right-2 -bottom-2 text-amber-50 opacity-50" size={60} />
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-[28px] shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Net Profit</p>
                <h2 className="text-lg font-black mt-1 text-emerald-600">{formatNaira(netProfitToday)}</h2>
              </div>
              <DollarSign className="absolute -right-2 -bottom-2 text-emerald-50 opacity-50" size={60} />
            </div>
          </div>
        )}

        <button 
          onClick={() => setPage(Page.POS)}
          className="w-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black py-5 rounded-[28px] shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
        >
          <div className="bg-emerald-600 text-white p-2 rounded-xl">
            <ShoppingCart size={18} />
          </div>
          Start New Sale
        </button>
      </div>

      {/* 3. Detailed Transaction Log (Filtered for Admin) */}
      <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Today's Activity</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Live Transaction Feed</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-gray-400 uppercase">Total Sales</span>
            <p className="text-sm font-black text-gray-800">{salesToday?.length || 0}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {salesToday && salesToday.length > 0 ? (
            salesToday.map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-xl text-gray-300 shadow-sm">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800">Sale #{String(sale.id).slice(-4)}</p>
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
              <p className="text-[9px] font-bold uppercase tracking-widest">No sales recorded today</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Inventory Alerts */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <AlertTriangle className="text-amber-500" size={18} />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Stock Restock Alerts</h3>
        </div>
        {lowStockItems && lowStockItems.length > 0 ? (
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 p-5 rounded-[28px] flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-black text-gray-800 text-sm">{item.name}</h4>
                  <p className="text-[10px] font-bold text-red-500 uppercase mt-0.5 tracking-wider">Stock at {item.stock} - Order now</p>
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
            <p className="text-emerald-800/40 font-black uppercase text-[9px] tracking-[0.2em]">All stock levels optimal</p>
          </div>
        )}
      </section>
    </div>
  );
};
