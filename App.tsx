
import React, { useState, useEffect, useCallback } from 'react';
import { Page, Role, DeviceRole } from './types.ts';
import { initTrialDate, User, db } from './db.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { POS } from './pages/POS.tsx';
import { Sales } from './pages/Sales.tsx';
import { Debts } from './pages/Debts.tsx';
import { Expenses } from './pages/Expenses.tsx';
import { Settings } from './pages/Settings.tsx';
import { FAQ } from './pages/FAQ.tsx';
import { Customers } from './pages/Customers.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { RoleSelection } from './components/RoleSelection.tsx';
import { Onboarding } from './components/Onboarding.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, Receipt, ShieldAlert, Users, Wallet, BookOpen } from 'lucide-react';

const ALLOWED_DOMAIN = 'niajapos.netlify.app';
const TRIAL_DURATION = 259200000; 

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPirated, setIsPirated] = useState(false);
  
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low-stock' | 'expiring'>('all');

  const [isAtLanding, setIsAtLanding] = useState(() => window.location.pathname === '/' || window.location.pathname === '');
  const [isActivated, setIsActivated] = useState(() => localStorage.getItem('is_activated') === 'true');
  const [isTrialing, setIsTrialing] = useState(() => localStorage.getItem('is_trialing') === 'true');
  const [isSetupPending, setIsSetupPending] = useState(() => localStorage.getItem('is_setup_pending') === 'true');
  const [deviceRole, setDeviceRole] = useState<DeviceRole | null>(() => localStorage.getItem('device_role') as DeviceRole);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;

  const syncStateFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page')?.toUpperCase();
    const filterParam = params.get('filter');

    if (pageParam && Object.values(Page).includes(pageParam as Page)) {
      setCurrentPage(pageParam as Page);
    }
    
    if (filterParam === 'expiring' || filterParam === 'low-stock') {
      setInventoryFilter(filterParam as any);
    } else {
      setInventoryFilter('all');
    }

    setIsAtLanding(window.location.pathname === '/' || window.location.pathname === '');
  }, []);

  const navigateTo = useCallback((page: Page, filter?: string) => {
    setCurrentPage(page);
    const url = new URL(window.location.href);
    url.pathname = '/app';
    url.searchParams.set('page', page.toLowerCase());
    if (filter && filter !== 'all') {
      url.searchParams.set('filter', filter);
      setInventoryFilter(filter as any);
    } else {
      url.searchParams.delete('filter');
      setInventoryFilter('all');
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  useEffect(() => {
    const startup = async () => {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== ALLOWED_DOMAIN && !hostname.endsWith('.webcontainer.io')) {
        setIsPirated(true);
      }
      
      await initTrialDate();
      syncStateFromUrl();
      
      const dbActivated = await db.settings.get('is_activated');
      if (dbActivated?.value === true && !isActivated) {
        localStorage.setItem('is_activated', 'true');
        setIsActivated(true);
      }
      setIsInitialized(true);
    };
    startup();

    window.addEventListener('popstate', syncStateFromUrl);
    return () => window.removeEventListener('popstate', syncStateFromUrl);
  }, [isActivated, syncStateFromUrl]);

  const handleStartTrial = () => {
    setShowRoleSelection(true);
  };

  const handleRoleSelection = (role: DeviceRole) => {
    localStorage.setItem('device_role', role);
    setDeviceRole(role);
    setShowRoleSelection(false);
    
    if (role === 'Owner') {
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem('is_trialing', 'true');
      localStorage.setItem('trial_start_date', Date.now().toString());
      localStorage.setItem('is_setup_pending', 'true');
      localStorage.setItem('temp_otp', randomOtp);
      
      navigateTo(Page.DASHBOARD);
      setIsAtLanding(false);
      setIsTrialing(true);
      setIsSetupPending(true);
    } else {
      navigateTo(Page.LOGIN);
      setIsAtLanding(false);
      setIsTrialing(false);
      setIsSetupPending(false);
    }
  };

  const handleLogin = (user: User) => setCurrentUser(user);

  if (isPirated) {
    return (
      <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]">
        <ShieldAlert size={80} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black mb-4 uppercase leading-none">Access Denied</h1>
        <p className="text-red-200/60 max-w-sm font-medium">Unauthorized distribution detected.</p>
      </div>
    );
  }

  if (!isInitialized) return null;

  if (isAtLanding && !isActivated && !isTrialing && !showRoleSelection) return <LandingPage onStartTrial={handleStartTrial} />;
  if (showRoleSelection) return <RoleSelection onSelect={handleRoleSelection} />;
  
  if (deviceRole === 'Owner') {
    if (!isActivated && (!isTrialing || !isTrialValid)) return <LockScreen onUnlock={() => window.location.reload()} />;
    if (isSetupPending) return <Onboarding onComplete={() => window.location.reload()} />;
  }
  
  if (!currentUser) return <LoginScreen onLogin={handleLogin} deviceRole={deviceRole || 'StaffDevice'} />;

  const isStaffDevice = deviceRole === 'StaffDevice';
  const isAdminUser = currentUser.role === 'Admin' && !isStaffDevice;

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: 
        return <Dashboard 
          setPage={(p) => navigateTo(p)} 
          role={isStaffDevice ? 'Staff' : currentUser.role} 
          onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)}
        />;
      case Page.INVENTORY: 
        return <Inventory 
          role={isStaffDevice ? 'Staff' : currentUser.role} 
          initialFilter={inventoryFilter} 
          clearInitialFilter={() => navigateTo(Page.INVENTORY, 'all')}
        />;
      case Page.POS: return <POS user={currentUser} />;
      case Page.SALES: return <Sales role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.DEBTS: return <Debts role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.EXPENSES: return <Expenses role={isStaffDevice ? 'Staff' : currentUser.role} setPage={(p) => navigateTo(p)} />;
      case Page.SETTINGS: return <Settings role={isStaffDevice ? 'Staff' : currentUser.role} setRole={(role) => setCurrentUser({...currentUser, role})} setPage={(p) => navigateTo(p)} />;
      case Page.FAQ: return <FAQ setPage={(p) => navigateTo(p)} />;
      case Page.CUSTOMERS: return <Customers setPage={(p) => navigateTo(p)} role={isStaffDevice ? 'Staff' : currentUser.role} />;
      default: return <Dashboard setPage={(p) => navigateTo(p)} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 animate-in fade-in duration-500 transition-colors duration-300">
      <main className="flex-1 overflow-auto">{renderPage()}</main>
      
      {!isStaffDevice && <BackupReminder />}

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-emerald-900/95 backdrop-blur-md border-t border-slate-100 dark:border-emerald-800 flex justify-between items-center px-0.5 py-2 safe-bottom z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300">
        <button onClick={() => navigateTo(Page.DASHBOARD)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <LayoutGrid size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Home</span>
        </button>
        
        <button onClick={() => navigateTo(Page.POS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <ShoppingBag size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">POS</span>
        </button>

        <button onClick={() => navigateTo(Page.INVENTORY, 'all')} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.INVENTORY ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <Package size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Stock</span>
        </button>

        <button onClick={() => navigateTo(Page.SALES)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SALES ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <Receipt size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Sales</span>
        </button>

        <button onClick={() => navigateTo(Page.DEBTS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.DEBTS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <BookOpen size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Debts</span>
        </button>

        <button onClick={() => navigateTo(Page.CUSTOMERS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.CUSTOMERS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <Wallet size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Wallet</span>
        </button>
        
        {isAdminUser && (
          <button onClick={() => navigateTo(Page.SETTINGS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SETTINGS || currentPage === Page.FAQ ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <SettingsIcon size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
