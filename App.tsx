
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
import { InstallApp } from './pages/InstallApp.tsx';
import { PublicHelp } from './pages/PublicHelp.tsx';
import { AboutUs } from './pages/AboutUs.tsx';
import { Affiliates } from './pages/Affiliates.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { SetupWizard } from './components/SetupWizard.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { InstallBanner } from './components/InstallBanner.tsx'; 
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { getRequestCode, validateLicenseIntegrity } from './utils/security.ts';
import { 
  LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, 
  Receipt, ShieldAlert, Wallet, BookOpen, Clock, History, Menu
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
  const [deviceRole, setDeviceRole] = useState<DeviceRole | null>(() => localStorage.getItem('device_role') as DeviceRole);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGate, setShowInstallGate] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const isStaff = localStorage.getItem('user_role') === 'staff';
  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;

  const syncState = useCallback(() => {
    setPath(window.location.pathname);
    setIsActivated(localStorage.getItem('is_activated') === 'true');
    setIsTrialing(localStorage.getItem('is_trialing') === 'true');
    setIsSetupPending(localStorage.getItem('is_setup_pending') === 'true');
    
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page')?.toUpperCase();
    if (pageParam && Object.values(Page).includes(pageParam as Page)) {
      setCurrentPage(pageParam as Page);
    }
  }, []);

  useEffect(() => {
    const startup = async () => {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const isDevEnv = hostname.endsWith('.webcontainer.io');
      const isAuthorized = ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));

      if (!isLocal && !isDevEnv && !isAuthorized) setIsPirated(true);

      await initTrialDate();
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
    
    startup();
    window.addEventListener('popstate', syncState);
    const installHandler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', installHandler);

    return () => {
      window.removeEventListener('popstate', syncState);
      window.removeEventListener('beforeinstallprompt', installHandler);
    };
  }, [syncState]);

  useEffect(() => {
    if ((isTrialing && isTrialValid) || isActivated) {
      if (window.location.pathname === '/') {
        window.history.pushState({}, '', '/app');
        setPath('/app');
      }
    }
  }, [isTrialing, isTrialValid, isActivated]);

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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const hasSkipped = localStorage.getItem('install_skipped') === 'true';
    if (!isStandalone && !hasSkipped) {
      setShowInstallGate(true);
    } else {
      window.location.href = '/app';
    }
  };

  if (isPirated) return <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]"><ShieldAlert size={80} className="text-red-500 mb-6" /><h1 className="text-4xl font-black uppercase">Access Denied</h1></div>;
  if (!isInitialized) return <LoadingScreen />;

  if (path === '/' && !isActivated && (!isTrialing || !isTrialValid)) {
    return <LandingPage onStartTrial={handleStartTrial} onNavigate={navigateTo} />;
  }

  if (showInstallGate) {
    return <InstallApp deferredPrompt={deferredPrompt} onNext={() => { localStorage.setItem('install_skipped', 'true'); window.location.href = '/app'; }} />;
  }

  const isAppPath = path.startsWith('/app');
  if (isAppPath || isActivated || (isTrialing && isTrialValid)) {
    const trialActive = isTrialing && isTrialValid;
    if ((!isActivated && !trialActive) || isExpired) {
      if (!isStaff) return <LockScreen onUnlock={() => window.location.reload()} isExpired={isExpired} />;
    }

    if (isSetupPending && !isStaff) {
      return <SetupWizard onComplete={() => { localStorage.setItem('is_setup_pending', 'false'); window.location.reload(); }} />;
    }

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
        case Page.SETTINGS: return <Settings user={currentUser} role={isStaffDevice ? 'Staff' : currentUser.role} setRole={(r) => setCurrentUser({...currentUser, role: r})} setPage={navigateTo} />;
        case Page.CATEGORY_MANAGER: return <CategoryManager setPage={navigateTo} />;
        default: return <Dashboard setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
      }
    };

    // Primary Active Indicators
    const isDashboardActive = currentPage === Page.DASHBOARD;
    const isPosActive = currentPage === Page.POS;
    const isInventoryActive = currentPage === Page.INVENTORY;
    const isDebtsActive = currentPage === Page.DEBTS;
    const isAdminActive = [Page.SETTINGS, Page.CUSTOMERS, Page.SALES, Page.STOCK_LOGS, Page.EXPENSES, Page.CATEGORY_MANAGER].includes(currentPage);

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 transition-colors duration-300">
        <main className="flex-1 overflow-auto">{renderPage()}</main>
        {!isStaffDevice && !isNavHidden && <BackupReminder />}
        {!isNavHidden && (
          <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-emerald-900/95 backdrop-blur-md border-t border-slate-100 dark:border-emerald-800 flex justify-between items-center px-2 py-2 safe-bottom z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button onClick={() => navigateTo(Page.DASHBOARD)} className={`flex flex-col items-center flex-1 p-2 rounded-xl transition-all ${isDashboardActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <LayoutGrid size={20} /><span className="text-[7px] font-black mt-1 uppercase">Home</span>
            </button>
            <button onClick={() => navigateTo(Page.POS)} className={`flex flex-col items-center flex-1 p-2 rounded-xl transition-all ${isPosActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <ShoppingBag size={20} /><span className="text-[7px] font-black mt-1 uppercase">POS</span>
            </button>
            <button onClick={() => navigateTo(Page.INVENTORY, 'all')} className={`flex flex-col items-center flex-1 p-2 rounded-xl transition-all ${isInventoryActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <Package size={20} /><span className="text-[7px] font-black mt-1 uppercase">Stock</span>
            </button>
            <button onClick={() => navigateTo(Page.DEBTS)} className={`flex flex-col items-center flex-1 p-2 rounded-xl transition-all ${isDebtsActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <BookOpen size={20} /><span className="text-[7px] font-black mt-1 uppercase">Debts</span>
            </button>
            <button onClick={() => navigateTo(Page.SETTINGS)} className={`flex flex-col items-center flex-1 p-2 rounded-xl transition-all ${isAdminActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
              <SettingsIcon size={20} /><span className="text-[7px] font-black mt-1 uppercase">Admin</span>
            </button>
          </nav>
        )}
        <InstallBanner />
        <UpdatePrompt />
      </div>
    );
  }

  return <LandingPage onStartTrial={handleStartTrial} onNavigate={navigateTo} />;
};

const App: React.FC = () => (<ThemeProvider><AppContent /></ThemeProvider>);
export default App;
