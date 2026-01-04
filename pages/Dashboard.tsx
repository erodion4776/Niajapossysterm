
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User as DBUser, Sale } from '../db.ts';
import pako from 'pako';
import { 
  formatNaira, 
  backupToWhatsApp, 
  reconcileStaffSales, 
  pushInventoryUpdateToStaff, 
  generateStaffInviteKey,
  restoreFullBackup
} from '../utils/whatsapp.ts';
import { getRequestCode } from '../utils/security.ts';
import { processImage } from '../utils/images.ts';
import { 
  Package, History, Landmark, BookOpen, 
  ArrowUpRight, Eye, EyeOff, Bell, HelpCircle, User as UserIcon, Plus, 
  Wallet, Scan, ArrowDownLeft, Share2, Coins, Receipt,
  LayoutGrid, BarChart3, AlertTriangle, ChevronRight,
  TrendingUp, Wallet2, Clock, Camera, X, CheckCircle2, Loader2,
  Download, Send, Smartphone, RefreshCw, CloudUpload, Database, Info, Search,
  Banknote, Sparkles
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface DashboardProps {
  setPage: (page: Page) => void;
  role: Role;
  onInventoryFilter: (filter: 'all' | 'low-stock' | 'expiring') => void;
  user: DBUser;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage, role, onInventoryFilter, user: initialUser }) => {
  const [showProfit, setShowProfit] = useState(() => localStorage.getItem('show_dashboard_profit') !== 'false');
  const [requestCode, setRequestCode] = useState('...');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Action Loading States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Hidden Input Refs
  const reconcileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Real-time Data Queries
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());
  const shopNameSetting = useLiveQuery(() => db.settings.get('shop_name'));
  const activeUser = useLiveQuery(() => db.users.get(initialUser.id!), [initialUser]);

  useEffect(() => {
    getRequestCode().then(setRequestCode);
  }, []);

  const toggleProfit = () => {
    const newVal = !showProfit;
    setShowProfit(newVal);
    localStorage.setItem('show_dashboard_profit', String(newVal));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUser) return;
    setIsUpdatingAvatar(true);
    try {
      const base64 = await processImage(file, 150);
      await db.users.update(activeUser.id!, { avatar: base64 });
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      alert("Failed to update profile photo");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // --- SERVICE ACTIONS ---

  const handleMergeSales = () => reconcileInputRef.current?.click();
  const handleImportStaffSales = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as ArrayBuffer;
        const decompressed = pako.ungzip(new Uint8Array(result), { to: 'string' });
        const jsonData = JSON.parse(decompressed);
        const report = await reconcileStaffSales(jsonData, activeUser?.name || 'Boss');
        alert(`✅ Sync Complete!\n- Merged ${report.mergedSales} new sales\n- Stock subtracted from Master.`);
      } catch (err) {
        alert("Import failed: Use the file sent by Staff.");
      } finally {
        setIsSyncing(false);
        if (reconcileInputRef.current) reconcileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePushUpdate = async () => {
    if (confirm("Force staff stock levels to match yours? (Recommended: CANCEL unless fixing errors)")) {
      await pushInventoryUpdateToStaff(true);
    } else {
      await pushInventoryUpdateToStaff(false);
    }
    alert("Shop data pushed! Send to staff via WhatsApp.");
  };

  const handleClonePhone = async () => {
    if (activeUser) await generateStaffInviteKey(activeUser);
  };

  const handleManualUpdate = async () => {
    if (!navigator.onLine) return alert("Internet required for updates.");
    setIsCheckingUpdates(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        alert(reg.waiting ? "Update found! Restarting..." : "App is up to date (V1.1.5)");
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (err) {
      alert("Check failed.");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const data = {
        inventory: await db.inventory.toArray(),
        sales: await db.sales.toArray(),
        expenses: await db.expenses.toArray(),
        debts: await db.debts.toArray(),
        users: await db.users.toArray(),
        categories: await db.categories.toArray(),
        settings: await db.settings.toArray(),
        security: await db.security.toArray(),
        customers: await db.customers.toArray(),
        stock_logs: await db.stock_logs.toArray(),
        parked_orders: await db.parked_orders.toArray(),
        shopName: shopNameSetting?.value,
        timestamp: Date.now() 
      };
      await backupToWhatsApp(data);
    } catch (err) {
      alert("Backup failed.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => restoreInputRef.current?.click();
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("⚠️ WARNING: This will overwrite ALL data. Proceed?")) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as ArrayBuffer;
        const decompressed = pako.ungzip(new Uint8Array(result), { to: 'string' });
        await restoreFullBackup(JSON.parse(decompressed));
        alert("Restore Successful! Reloading...");
        window.location.reload();
      } catch (err) {
        alert("Restore failed.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- CALCULATIONS ---

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

  const alerts = useMemo(() => {
    if (!inventory) return { lowStock: 0, expiring: 0 };
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return {
      lowStock: inventory.filter(i => i.stock <= (i.minStock || 5)).length,
      expiring: inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= nextWeek).length
    };
  }, [inventory]);

  const recentSales = useMemo(() => {
    if (!allSales) return [];
    return [...allSales].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [allSales]);

  const userName = activeUser?.name || initialUser.name || 'Boss';

  const services = [
    { cat: "Sales & Financials", items: [
      { label: "POS Terminal", icon: <ArrowDownLeft size={24}/>, color: "bg-blue-50 text-blue-600", onClick: () => setPage(Page.POS) },
      { label: "Sales History", icon: <History size={24}/>, color: "bg-emerald-50 text-emerald-600", onClick: () => setPage(Page.SALES) },
      { label: "Debt Book", icon: <BookOpen size={24}/>, color: "bg-amber-50 text-amber-600", onClick: () => setPage(Page.DEBTS) },
      { label: "Expense Log", icon: <Receipt size={24}/>, color: "bg-red-50 text-red-600", onClick: () => setPage(Page.EXPENSES) },
      { label: "Customer Wallet", icon: <Wallet size={24}/>, color: "bg-purple-50 text-purple-600", onClick: () => setPage(Page.CUSTOMERS) },
    ]},
    { cat: "Inventory & Tools", items: [
      { label: "Stock Manager", icon: <Package size={24}/>, color: "bg-emerald-50 text-emerald-600", onClick: () => setPage(Page.INVENTORY) },
      { label: "Category Lab", icon: <LayoutGrid size={24}/>, color: "bg-indigo-50 text-indigo-600", onClick: () => setPage(Page.CATEGORY_MANAGER) },
      { label: "Stock Logs", icon: <History size={24}/>, color: "bg-slate-50 text-slate-600", onClick: () => setPage(Page.STOCK_LOGS) },
      { label: "AI Scanner", icon: <Scan size={24}/>, color: "bg-teal-50 text-teal-600", onClick: () => setPage(Page.AI_ASSISTANT) },
    ]},
    { cat: "Staff & Sync", items: [
      { label: "Merge Sales", icon: <Download size={24}/>, color: "bg-amber-50 text-amber-600", onClick: handleMergeSales },
      { label: "Push Update", icon: <Send size={24}/>, color: "bg-blue-50 text-blue-600", onClick: handlePushUpdate },
      { label: "Clone Phone", icon: <Smartphone size={24}/>, color: "bg-purple-50 text-purple-600", onClick: handleClonePhone },
    ]},
    { cat: "Support & System", items: [
      { label: "Check Update", icon: <RefreshCw size={24}/>, color: "bg-orange-50 text-orange-600", onClick: handleManualUpdate },
      { label: "Backup App", icon: <CloudUpload size={24}/>, color: "bg-emerald-50 text-emerald-600", onClick: handleBackup },
      { label: "Restore App", icon: <Database size={24}/>, color: "bg-red-50 text-red-600", onClick: handleRestore },
      { label: "Help Center", icon: <HelpCircle size={24}/>, color: "bg-blue-50 text-blue-600", onClick: () => setPage(Page.HELP_CENTER) },
      { label: "Affiliates", icon: <Coins size={24}/>, color: "bg-amber-50 text-amber-600", onClick: () => setPage(Page.AFFILIATES) },
      { label: "About Us", icon: <Info size={24}/>, color: "bg-slate-50 text-slate-500", onClick: () => setPage(Page.ABOUT_US) },
    ]}
  ];

  return (
    <div className="bg-emerald-950 min-h-screen pb-32 font-sans selection:bg-emerald-500/20 text-white">
      {/* Hidden inputs for file actions */}
      <input type="file" ref={reconcileInputRef} className="hidden" accept=".json.gz,.gz" onChange={handleImportStaffSales} />
      <input type="file" ref={restoreInputRef} className="hidden" accept=".json.gz,.gz" onChange={handleRestoreFile} />

      {/* 1. THE "BOSS" HEADER */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-emerald-950 sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProfileModal(true)}
            className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center border border-emerald-700/50 overflow-hidden active:scale-90 transition-all"
          >
             {activeUser?.avatar ? (
                <img src={activeUser.avatar} className="w-full h-full object-cover" alt="Profile" />
             ) : (
                <span className="font-black text-emerald-400 text-lg uppercase">{userName.charAt(0)}</span>
             )}
          </button>
          <div>
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{role}</span>
               <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            </div>
            <h2 className="text-white text-sm font-bold opacity-90 leading-none mt-1">Hello, {userName.split(' ')[0]}!</h2>
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
               <Clock size={10} className="text-emerald-500/40" />
               <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">
                 Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
            </div>
          </div>

          <div className="flex gap-2 relative z-10">
            <button onClick={() => setPage(Page.INVENTORY)} className="flex-1 bg-white text-emerald-950 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl">
              <Plus size={14} strokeWidth={3} /> Add Stock
            </button>
            <button onClick={() => setPage(Page.SALES)} className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              <History size={14} /> History
            </button>
            <button onClick={() => setPage(Page.STOCK_LOGS)} className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
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
          <ServiceItem icon={<LayoutGrid size={22}/>} label="More" onClick={() => setShowAllServices(true)} color="bg-slate-100 text-slate-500" />
        </div>

        {/* 4. THE "INSIGHTS" CARDS */}
        <div className="mt-14">
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => onInventoryFilter('low-stock')} className="bg-red-50 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden active:scale-95 transition-all cursor-pointer border border-red-100/50">
              <div className="bg-white p-2.5 rounded-2xl w-fit shadow-sm text-red-500">
                <AlertTriangle size={20} className="fill-red-500/10" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Critical Alerts</p>
                <h4 className="text-xl font-black text-red-600 tracking-tight">{alerts.lowStock + alerts.expiring} Issues</h4>
              </div>
              <ChevronRight size={16} className="absolute bottom-6 right-6 text-red-300" />
            </div>

            <div onClick={() => setPage(Page.AFFILIATES)} className="bg-emerald-50 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden active:scale-95 transition-transform cursor-pointer border border-emerald-100/50">
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

      {/* ALL SERVICES MODAL */}
      {showAllServices && (
        <div className="fixed inset-0 bg-white dark:bg-emerald-950 z-[1000] flex flex-col animate-in fade-in duration-300">
           <header className="p-6 flex items-center justify-between sticky top-0 bg-white dark:bg-emerald-950 z-10 border-b border-slate-50 dark:border-white/5">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-emerald-100 dark:bg-emerald-800 rounded-2xl text-emerald-600">
                    <LayoutGrid size={24} />
                 </div>
                 <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">All Services</h1>
              </div>
              <button onClick={() => setShowAllServices(false)} className="p-3 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={24} /></button>
           </header>

           <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
              <div className="px-6 py-4">
                 <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                       type="text" 
                       placeholder="Search for a service..." 
                       className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-emerald-900/50 border border-slate-100 dark:border-white/5 rounded-3xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                       value={serviceSearch}
                       onChange={e => setServiceSearch(e.target.value)}
                    />
                 </div>

                 <div className="space-y-12">
                    {services.map((group, gIdx) => {
                       const filteredItems = group.items.filter(i => i.label.toLowerCase().includes(serviceSearch.toLowerCase()));
                       if (filteredItems.length === 0) return null;

                       return (
                          <div key={gIdx} className="space-y-6">
                             <div className="flex items-center gap-2 px-1">
                                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{group.cat}</h3>
                             </div>
                             <div className="grid grid-cols-4 gap-y-10 gap-x-2">
                                {filteredItems.map((item, iIdx) => (
                                   <button 
                                      key={iIdx} 
                                      onClick={() => { item.onClick(); if (!item.label.includes('Backup') && !item.label.includes('Push') && !item.label.includes('Merge') && !item.label.includes('Update') && !item.label.includes('Restore') && !item.label.includes('Clone')) setShowAllServices(false); }}
                                      className="flex flex-col items-center gap-3 active:scale-90 transition-all group"
                                   >
                                      <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all ${item.color}`}>
                                         {item.icon}
                                      </div>
                                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 transition-colors uppercase tracking-tighter text-center leading-tight">
                                         {item.label}
                                      </span>
                                   </button>
                                ))}
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>

              {/* Version Info Footer */}
              <div className="mt-12 px-6 pt-12 border-t border-slate-50 dark:border-white/5 text-center space-y-4">
                 <div className="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-[3rem] border border-emerald-100 dark:border-emerald-800">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">NaijaShop Professional</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">v1.1.5 Stable</p>
                    <button 
                       onClick={handleManualUpdate}
                       disabled={isCheckingUpdates}
                       className="mt-4 text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2 mx-auto bg-white dark:bg-emerald-800 px-6 py-2.5 rounded-full shadow-sm active:scale-95"
                    >
                       {isCheckingUpdates ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} Check for updates
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PROFILE SETTINGS MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[3rem] p-8 text-center shadow-2xl border dark:border-emerald-800 animate-in zoom-in duration-300 relative overflow-hidden text-slate-900 dark:text-white">
             <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
             
             <div className="space-y-8 flex flex-col items-center">
                <div className="space-y-2">
                   <h2 className="text-2xl font-black uppercase tracking-tight italic">My Profile</h2>
                   <p className="text-[10px] font-bold text-slate-400 dark:text-emerald-500/60 uppercase tracking-widest">Active Terminal: {role}</p>
                </div>

                <div className="relative group">
                   <div className="w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-4 border-white dark:border-emerald-800 shadow-xl relative">
                      {activeUser?.avatar ? (
                         <img src={activeUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400 uppercase">{userName.charAt(0)}</span>
                      )}
                      {isUpdatingAvatar && (
                        <div className="absolute inset-0 bg-emerald-900/60 flex items-center justify-center backdrop-blur-sm">
                           <Loader2 size={32} className="animate-spin text-emerald-400" />
                        </div>
                      )}
                   </div>
                   <label htmlFor="profile-upload" className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg border-4 border-white dark:border-emerald-900 active:scale-90 transition-all cursor-pointer">
                      <Camera size={18} />
                   </label>
                   <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUpdatingAvatar} />
                </div>

                <div className="space-y-1">
                   <h3 className="text-xl font-black tracking-tight">{userName}</h3>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{requestCode}</p>
                </div>

                <div className="w-full space-y-3 pt-4">
                   <button 
                      onClick={() => document.getElementById('profile-upload')?.click()}
                      disabled={isUpdatingAvatar}
                      className="w-full bg-emerald-600 text-white font-black py-4 rounded-[2rem] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                   >
                      <Camera size={16} /> Change Profile Photo
                   </button>
                   <button 
                      onClick={() => setShowProfileModal(false)}
                      className="w-full bg-slate-50 dark:bg-emerald-800/40 text-slate-400 dark:text-emerald-300 font-black py-4 rounded-[2rem] uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                   >
                      Done
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ServiceItem = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-3 active:scale-90 transition-all group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all ${color}`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500 group-hover:text-emerald-600 transition-colors uppercase tracking-[0.1em] text-center leading-tight">{label}</span>
  </button>
);
