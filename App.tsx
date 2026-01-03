
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactGA from 'react-ga4';
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
import { StockLogs } from './pages/StockLogs.tsx';
import { CategoryManager } from './pages/CategoryManager.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { RegisterShop } from './pages/RegisterShop.tsx';
import { SetupPIN } from './pages/SetupPIN.tsx';
import { InstallApp } from './pages/InstallApp.tsx';
import { JoinShop } from './pages/JoinShop.tsx';
import { AIAssistant } from './pages/AIAssistant.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { InstallBanner } from './components/InstallBanner.tsx'; 
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { getRequestCode, validateLicenseIntegrity } from './utils/security.ts';
import { 
  LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, 
  ShieldAlert, BookOpen, Menu, Wallet, History
} from 'lucide-react';

const ALLOWED_DOMAINS = ['naijashop.com.ng', 'niajapos.netlify.app'];
const TRIAL_DURATION = 3 * 24 * 60 * 60 * 1000; 

ReactGA.initialize("G-7Q4E8586BF");

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPirated, setIsPirated] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low-stock' | 'expiring'>('all');

  const [path, setPath] = useState(() => window.location.pathname);
  const [isActivated, setIsActivated] = useState(() => localStorage.getItem('is_activated') === 'true');
  const [isTrialing, setIsTrialing] = useState(() => localStorage.getItem('is_trialing') === 'true');
  const [isSetupPending, setIsSetupPending] = useState(() => localStorage.getItem('is_setup_pending') === 'true');
  const [installSkipped, setInstallSkipped] = useState(() => localStorage.getItem('install_skipped') === 'true');
  const [deviceRole, setDeviceRole] = useState<DeviceRole | null>(() => localStorage.getItem('device_role') as DeviceRole);
  
  // New Onboarding States
  const [shopName, setShopName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>('Boss');
  const [adminUser, setAdminUser] = useState<User | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);

  const isStaff = localStorage.getItem('user_role') === 'staff';
  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;

  const syncState = useCallback(() => {
    setPath(window.location.pathname);
    setIsActivated(localStorage.getItem('is_activated') === 'true');
    setIsTrialing(localStorage.getItem('is_trialing') === 'true');
    setIsSetupPending(localStorage.getItem('is_setup_pending') === 'true');
    setInstallSkipped(localStorage.getItem('install_skipped') === 'true');
    
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page')?.toUpperCase();
    if (pageParam && Object.values(Page).includes(pageParam as Page)) {
      setCurrentPage(pageParam as Page);
    }
  }, []);

  const startup = async () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDevEnv = hostname.endsWith('.webcontainer.io');
    const isAuthorized = ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));

    if (!isLocal && !isDevEnv && !isAuthorized) setIsPirated(true);

    await initTrialDate();
    
    // Check onboarding status
    const sn = await db.settings.get('shop_name');
    const on = await db.settings.get('owner_name');
    const admin = await db.users.where('role').equals('Admin').first();
    setShopName(sn?.value || null);
    setOwnerName(on?.value?.split(' ')[0] || 'Boss');
    setAdminUser(admin || null);

    const requestCode = await getRequestCode();
    const dbExp = await db.security.get('license_expiry');
    const dbSig = await db.security.get('license_signature');
    const lsExp = localStorage.getItem('license_expiry');
    const lsSig = localStorage.getItem('license_signature');
    
    let validExp = '';
    if (dbExp?.value && dbSig?.value && await validateLicenseIntegrity(requestCode, dbSig.value, dbExp.value)) {
      validExp = dbExp.value;
    } else if (lsExp && lsSig && await validateLicenseIntegrity(requestCode, lsSig, lsExp)) {
      validExp = lsExp;
    }

    if (validExp) {
      const year = parseInt(validExp.substring(0, 4));
      const month = parseInt(validExp.substring(4, 6)) - 1;
      const day = parseInt(validExp.substring(6, 8));
      const expired = Date.now() > new Date(year, month, day, 23, 59, 59).getTime();
      setIsExpired(expired);
      setIsActivated(true);
      localStorage.setItem('is_activated', 'true');
    }

    setIsInitialized(true);
  };

  useEffect(() => {
    startup();
    window.addEventListener('popstate', syncState);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ PWA: Install prompt captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('popstate', syncState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [syncState]);

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
    setPath('/app');
  }, []);

  const handleStartTrial = () => {
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());
    localStorage.setItem('device_role', 'Owner');
    localStorage.setItem('is_setup_pending', 'true');
    
    window.history.pushState({}, '', '/register');
    setPath('/register');
  };

  const refreshOnboarding = async () => {
    const sn = await db.settings.get('shop_name');
    const on = await db.settings.get('owner_name');
    const admin = await db.users.where('role').equals('Admin').first();
    setShopName(sn?.value || null);
    setOwnerName(on?.value?.split(' ')[0] || 'Boss');
    setAdminUser(admin || null);
    syncState();
  };

  if (isPirated) return <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]"><ShieldAlert size={80} className="text-red-500 mb-6" /><h1 className="text-4xl font-black uppercase">Access Denied</h1></div>;
  if (!isInitialized) return <LoadingScreen />;

  // --- THE HIERARCHY OF TRUTH ---

  // 1. Join Link Route (Exceptions)
  if (path.startsWith('/join')) {
    return <JoinShop />;
  }

  // 2. Landing Page
  if (path === '/' && !isActivated && (!isTrialing || !isTrialValid) && !isStaff) {
    return <LandingPage onStartTrial={handleStartTrial} onNavigate={navigateTo} />;
  }

  // 3. Lock Screen (License/Activation)
  if (!isStaff && ((!isActivated && !(isTrialing && isTrialValid)) || isExpired)) {
    return <LockScreen onUnlock={() => window.location.reload()} isExpired={isExpired} />;
  }

  // 4. Setup Hierarchy (Identity & PIN)
  if (isSetupPending) {
    if (!shopName) {
      return <RegisterShop onComplete={() => { refreshOnboarding(); window.history.pushState({}, '', '/setup-pin'); setPath('/setup-pin'); }} />;
    }
    return <SetupPIN onBack={() => { window.history.pushState({}, '', '/register'); setPath('/register'); }} onComplete={() => { refreshOnboarding(); }} />;
  }

  // 5. Final Install Gate
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  if (!isStandalone && !installSkipped && !isStaff) {
    return <InstallApp ownerName={ownerName} deferredPrompt={deferredPrompt} onNext={() => { localStorage.setItem('install_skipped', 'true'); syncState(); }} />;
  }

  // 6. Login/Dashboard (Main App Logic)
  if (!currentUser) {
    return <LoginScreen onLogin={(u) => setCurrentUser(u)} deviceRole={deviceRole || (isStaff ? 'StaffDevice' : 'Owner')} />;
  }

  const isStaffDevice = deviceRole === 'StaffDevice' || isStaff;
  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
      case Page.INVENTORY: return <Inventory user={currentUser} role={isStaffDevice ? 'Staff' : currentUser.role} initialFilter={inventoryFilter} clearInitialFilter={() => navigateTo(Page.INVENTORY, 'all')} setPage={navigateTo} />;
      case Page.POS: return <POS user={currentUser} setNavHidden={setIsNavHidden} />;
      case Page.SALES: return <Sales role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.DEBTS: return <Debts role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.CUSTOMERS: return <Customers setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.STOCK_LOGS: return <StockLogs setPage={navigateTo} />;
      case Page.EXPENSES: return <Expenses setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.SETTINGS: return <Settings user={currentUser} role={isStaffDevice ? 'Staff' : currentUser.role} setRole={(r) => setCurrentUser({...currentUser, role: r})} setPage={navigateTo} deferredPrompt={deferredPrompt} />;
      case Page.CATEGORY_MANAGER: return <CategoryManager setPage={navigateTo} />;
      case Page.AI_ASSISTANT: return <AIAssistant setPage={navigateTo} />;
      default: return <Dashboard setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
    }
  };

  const isDashboardActive = currentPage === Page.DASHBOARD;
  const isPosActive = currentPage === Page.POS;
  const isInventoryActive = currentPage === Page.INVENTORY;
  const isDebtsActive = currentPage === Page.DEBTS;
  const isWalletActive = currentPage === Page.CUSTOMERS;
  const isLogsActive = currentPage === Page.STOCK_LOGS;
  const isAdminActive = [Page.SETTINGS, Page.SALES, Page.EXPENSES, Page.CATEGORY_MANAGER].includes(currentPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 transition-colors duration-300">
      <main className="flex-1 overflow-auto">{renderPage()}</main>
      {!isStaffDevice && !isNavHidden && <BackupReminder />}
      {!isNavHidden && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 dark:bg-emerald-900/95 backdrop-blur-md border-t border-slate-100 dark:border-emerald-800 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] safe-bottom overflow-hidden">
          <div className="flex overflow-x-auto no-scrollbar items-center px-2 py-2 scroll-smooth">
            <button onClick={() => navigateTo(Page.DASHBOARD)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isDashboardActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <LayoutGrid size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Home</span>
            </button>
            <button onClick={() => navigateTo(Page.POS)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isPosActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <ShoppingBag size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">POS</span>
            </button>
            <button onClick={() => navigateTo(Page.INVENTORY, 'all')} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isInventoryActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <Package size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Stock</span>
            </button>
            <button onClick={() => navigateTo(Page.DEBTS)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isDebtsActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <BookOpen size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Debts</span>
            </button>
            <button onClick={() => navigateTo(Page.CUSTOMERS)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isWalletActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <Wallet size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Wallet</span>
            </button>
            <button onClick={() => navigateTo(Page.STOCK_LOGS)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isLogsActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <History size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Logs</span>
            </button>
            <button onClick={() => navigateTo(Page.SETTINGS)} className={`flex flex-col items-center flex-none min-w-[72px] p-2 rounded-xl transition-all ${isAdminActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <Menu size={24} /><span className="text-[10px] font-black mt-1 uppercase whitespace-nowrap">Admin</span>
            </button>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white/90 dark:from-emerald-900/90 to-transparent pointer-events-none z-10" />
        </nav>
      )}
      <InstallBanner />
      <UpdatePrompt />
    </div>
  );
};

const App: React.FC = () => (<ThemeProvider><AppContent /></ThemeProvider>);
export default App;
