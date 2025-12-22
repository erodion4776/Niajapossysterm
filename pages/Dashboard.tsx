
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { ShoppingCart, Package, AlertTriangle, TrendingUp, DollarSign, ReceiptText, Wallet } from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role }) => {
  const isAdmin = role === 'Admin';
  const lowStockItems = useLiveQuery(() => db.inventory.where('stock').below(5).toArray());
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const salesToday = useLiveQuery(() => db.sales.where('timestamp').between(todayStart.getTime(), todayEnd.getTime()).toArray());
  const expensesToday = useLiveQuery(() => db.expenses.toArray()); // Simplified for all expenses, or filter by date

  const totalSales = salesToday?.reduce((sum, sale) => sum + sale.total, 0) || 0;
  const totalCostOfSales = salesToday?.reduce((sum, sale) => sum + (sale.totalCost || 0), 0) || 0;
  
  // Filtering expenses for today specifically if they have ISO strings or timestamps
  const actualExpensesToday = expensesToday?.filter(e => {
    const d = new Date(e.date).getTime();
    return d >= todayStart.getTime() && d <= todayEnd.getTime();
  }).reduce((sum, e) => sum + e.amount, 0) || 0;

  const grossProfit = totalSales - totalCostOfSales;
  const netProfit = grossProfit - actualExpensesToday;

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-tight">Financial Summary</p>
        </div>
        <div className="bg-emerald-100 p-2.5 rounded-2xl">
          <TrendingUp className="text-emerald-600" size={24} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Revenue Today</p>
            <h2 className="text-4xl font-black mt-1">{formatNaira(totalSales)}</h2>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={140} />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white border-2 border-amber-50 p-5 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Expenses</p>
              <h2 className="text-xl font-black mt-1 text-amber-600">{formatNaira(actualExpensesToday)}</h2>
            </div>
            <Wallet className="absolute -right-2 -bottom-2 text-amber-50 opacity-50" size={60} />
          </div>

          <div className="bg-white border-2 border-emerald-50 p-5 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Net Profit</p>
              <h2 className="text-xl font-black mt-1 text-emerald-600">{formatNaira(netProfit)}</h2>
            </div>
            <DollarSign className="absolute -right-2 -bottom-2 text-emerald-50 opacity-50" size={60} />
          </div>
        </div>

        <button 
          onClick={() => setPage(Page.POS)}
          className="w-full bg-white border-2 border-gray-100 text-gray-800 font-bold py-5 rounded-3xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:border-emerald-200"
        >
          <div className="bg-emerald-500 text-white p-2 rounded-xl">
            <ShoppingCart size={20} />
          </div>
          New Sale
        </button>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-amber-500" size={20} />
          <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Stock Alerts</h3>
        </div>
        {lowStockItems && lowStockItems.length > 0 ? (
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-gray-800">{item.name}</h4>
                  <p className="text-sm font-semibold text-red-500 mt-0.5">CRITICAL: {item.stock} LEFT</p>
                </div>
                <button 
                  onClick={() => setPage(Page.INVENTORY)}
                  className="bg-gray-50 text-gray-400 p-3 rounded-xl hover:text-emerald-600 transition-colors"
                >
                  <Package size={20} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 p-10 rounded-3xl text-center">
            <p className="text-gray-400 font-bold uppercase text-xs">All stock is secured</p>
          </div>
        )}
      </section>
    </div>
  );
};
