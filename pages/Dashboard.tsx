
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { getRequestCode } from '../utils/security.ts';
import { 
  Package, History, Landmark, BookOpen, 
  ArrowUpRight, Eye, EyeOff, Bell, HelpCircle, User, Plus, 
  Wallet, Scan, ArrowDownLeft, Share2, Coins, Receipt,
  LayoutGrid, BarChart3, AlertTriangle, ChevronRight,
  TrendingUp, Wallet2, Clock
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter }) => {
  const [showProfit, setShowProfit] = useState(() => localStorage.getItem('show_dashboard_profit') !== 'false');
  const [requestCode, setRequestCode] = useState('...');
  
  // Real-time Data Queries
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());
  const shopNameSetting = useLiveQuery(() => db.settings.get('shop_name'));
  const ownerUser = useLiveQuery(() => db.users.where('role').equals('Admin').first());

  useEffect(() => {
    getRequestCode().then(setRequestCode);
  }, []);

  const toggleProfit = () => {
    const newVal = !showProfit;
    setShowProfit(newVal);
    localStorage.setItem('show_dashboard_profit', String(newVal));
  };

  // Today's Profit Calculation
  const todayStats = useMemo(() => {
    if (!allSales || !allExpenses) return { revenue: 0, profit: 0 };
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const salesToday = allSales.filter(s => s.timestamp >= startOfDay);
    const expensesToday = allExpenses.filter(e => typeof e.date === 'number' ? e.date >= startOfDay : new Date(e.date).getTime() >= startOfDay);

    const revenue = salesToday.reduce((sum, s) => sum + (s.total || 0), 0);
    const cogs = salesToday.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const expenseTotal = expensesToday.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return { revenue, profit: revenue - cogs - expenseTotal };
  }, [allSales, allExpenses]);

  // Alert Calculations
  const alerts = useMemo(() => {
    if (!inventory) return { lowStock: 0, expiring: 0 };
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      lowStock: inventory.filter(i => i.stock <= (i.minStock || 5)).length,
      expiring: inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= nextWeek).length
    };
  }, [inventory]);

  const recentSales = useMemo(() => {
    if (!allSales) return [];
    return [...allSales].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [allSales]);

  return (
    <div className="bg-emerald-950 min-h-screen pb-32 font-sans selection:bg-emerald-500/20 text-white">
      
      {/* 1. THE "BOSS" HEADER */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-emerald-950 sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center border border-emerald-700/50 overflow-hidden">
             <img src="https://i.ibb.co/TD1JLFvQ/Generated-Image-September-24-2025-3-37-AM.png" className="w-full h-full object-cover" alt="Profile" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{role}</span>
               <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            </div>
            <h2 className="text-white text-sm font-bold opacity-90 leading-none mt-1">Hello, {ownerUser?.name?.split(' ')[0] || 'Boss'}!</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setPage(Page.HELP_CENTER)} className="p-2 text-white/60 hover:text-white transition-colors">
            <HelpCircle size={22} />
          </button>
          <div className="relative">
            <button className="p-2 text-white/60 hover:text-white transition-colors">
              <Bell size={22} />
            </button>
            {(alerts.lowStock > 0 || alerts.expiring > 0) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-emerald-950 animate-pulse"></span>
            )}
          </div>
        </div>
      </header>

      {/* 2. THE "MASTER BALANCE" CARD */}
      <section className="px-5 mb-8">
        <div className="bg-emerald-900/30 border border-white/5 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-xl relative overflow-hidden group">
          {/* Subtle Glow Background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-tight opacity-70">
                {shopNameSetting?.value || 'NaijaShop'} | {requestCode}
              </span>
              <Share2 size={12} className="text-emerald-500/40" />
            </div>
            <div className="bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
               <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Master Terminal</p>
            </div>
          </div>

          <div className="space-y-1 mb-8">
            <div className="flex items-center gap-1">
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Net Profit Today</p>
              <button onClick={toggleProfit} className="p-2 text-emerald-500/40 hover:text-emerald-400 transition-colors">
                {showProfit ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <h3 className="text-4xl font-black tracking-tighter text-white transition-all duration-300">
              {showProfit ? formatNaira(todayStats.profit) : '₦' + '•'.repeat(8)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
               {/* Added Clock to imports to fix error on line 134 */}
               <Clock size={10} className="text-emerald-500/40" />
               <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">
                 Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
            </div>
          </div>

          <div className="flex gap-2 relative z-10">
            <button 
              onClick={() => setPage(Page.INVENTORY)}
              className="flex-1 bg-white text-emerald-950 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              <Plus size={14} strokeWidth={3} /> Add Stock
            </button>
            <button 
              onClick={() => setPage(Page.SALES)}
              className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <History size={14} /> History
            </button>
            <button 
              onClick={() => setPage(Page.STOCK_LOGS)}
              className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <BarChart3 size={14} /> Reports
            </button>
          </div>
        </div>
      </section>

      {/* 3. THE "SERVICES" GRID */}
      <section className="bg-white rounded-t-[3rem] px-6 pt-10 pb-12 min-h-[400px] text-slate-900">
        <div className="flex justify-between items-center mb-8 px-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quick Services</h3>
          <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Customize</button>
        </div>

        <div className="grid grid-cols-4 gap-y-10 gap-x-2">
          <ServiceItem icon={<ArrowDownLeft size={22}/>} label="POS" onClick={() => setPage(Page.POS)} color="bg-blue-50 text-blue-600" />
          <ServiceItem icon={<Package size={22}/>} label="Stock" onClick={() => setPage(Page.INVENTORY)} color="bg-emerald-50 text-emerald-600" />
          <ServiceItem icon={<BookOpen size={22}/>} label="Debts" onClick={() => setPage(Page.DEBTS)} color="bg-amber-50 text-amber-600" />
          <ServiceItem icon={<Receipt size={22}/>} label="Expenses" onClick={() => setPage(Page.EXPENSES)} color="bg-red-50 text-red-600" />
          <ServiceItem icon={<Wallet2 size={22}/>} label="Wallet" onClick={() => setPage(Page.CUSTOMERS)} color="bg-purple-50 text-purple-600" />
          <ServiceItem icon={<LayoutGrid size={22}/>} label="Lab" onClick={() => setPage(Page.CATEGORY_MANAGER)} color="bg-indigo-50 text-indigo-600" />
          <ServiceItem icon={<Scan size={22}/>} label="Scanner" onClick={() => setPage(Page.AI_ASSISTANT)} color="bg-teal-50 text-teal-600" />
          <ServiceItem icon={<LayoutGrid size={22}/>} label="More" onClick={() => setPage(Page.SETTINGS)} color="bg-slate-100 text-slate-500" />
        </div>

        {/* 4. THE "INSIGHTS" CARDS */}
        <div className="mt-14">
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => onInventoryFilter('low-stock')}
              className="bg-red-50 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden active:scale-95 transition-all cursor-pointer border border-red-100/50"
            >
              <div className="bg-white p-2.5 rounded-2xl w-fit shadow-sm text-red-500">
                <AlertTriangle size={20} className="fill-red-500/10" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Critical Alerts</p>
                <h4 className="text-xl font-black text-red-600 tracking-tight">{alerts.lowStock + alerts.expiring} Issues</h4>
              </div>
              <ChevronRight size={16} className="absolute bottom-6 right-6 text-red-300" />
            </div>

            <div 
              onClick={() => setPage(Page.AFFILIATES)}
              className="bg-emerald-50 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden active:scale-95 transition-all cursor-pointer border border-emerald-100/50"
            >
              <div className="bg-white p-2.5 rounded-2xl w-fit shadow-sm text-emerald-600">
                <Coins size={20} className="fill-emerald-500/10" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Refer & Earn</p>
                <h4 className="text-xl font-black text-emerald-600 tracking-tight">₦2,000 Bonus</h4>
              </div>
              <ChevronRight size={16} className="absolute bottom-6 right-6 text-emerald-300" />
            </div>
          </div>
        </div>

        {/* 5. RECENT TRANSACTIONS FEED */}
        <div className="mt-14 px-1">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Sales</h3>
            <button onClick={() => setPage(Page.SALES)} className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-1.5 tracking-widest hover:gap-2 transition-all">View All <ChevronRight size={14}/></button>
          </div>

          <div className="space-y-2">
            {recentSales.length > 0 ? (
              recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                      {sale.paymentMethod === 'Transfer' ? <Landmark size={20} className="text-blue-500" /> : <Banknote size={20} className="text-emerald-500" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Receipt #{String(sale.id).slice(-4)}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Today</p>
                    </div>
                  </div>
                  <p className="text-base font-black text-emerald-600 tracking-tighter">
                    +{formatNaira(sale.total)}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-24 text-center opacity-20">
                <Receipt size={40} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No sales yet today</p>
              </div>
            )}
          </div>
        </div>

        {/* Lifetime Summary */}
        <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 italic">Shop Lifetime Records</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="text-3xl font-black tracking-tighter">{allSales?.length || 0}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Accumulated Gain</p>
                    <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                      {showProfit ? formatNaira(allSales?.reduce((s, x) => s + (x.total - x.totalCost), 0) || 0) : '₦••••'}
                    </p>
                 </div>
              </div>
           </div>
           <BarChart3 className="absolute -right-8 -bottom-8 opacity-[0.03] text-white scale-150 pointer-events-none" />
        </div>
      </section>
    </div>
  );
};

const ServiceItem = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-3 active:scale-90 transition-all group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all ${color}`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500 group-hover:text-emerald-600 transition-colors uppercase tracking-[0.1em] text-center">{label}</span>
  </button>
);

const Banknote = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);
