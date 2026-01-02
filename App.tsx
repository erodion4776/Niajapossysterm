
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
import { Onboarding } from './components/Onboarding.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { InstallBanner } from './components/InstallBanner.tsx'; 
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { getRequestCode, validateLicenseIntegrity } from './utils/security.ts';
import { 
  LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, 
  Receipt, ShieldAlert, Wallet, BookOpen, Clock
} from 'lucide-react';

const ALLOWED_DOMAINS = ['naijashop.com.ng', 'niajapos.netlify.app'];
const TRIAL_DURATION = 3 * 24 * 60 * 60 * 1000; 

ReactGA.initialize("G-7Q4E8586BF");

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPirated, setIsPirated] = useState(false);
  const [isClockTampered, setIsClockTampered] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low-stock' | 'expiring'>('all');

  const [isAtLanding, setIsAtLanding] = useState(() => window.location.pathname === '/' || window.location.pathname === '');
  const [isActivated, setIsActivated] = useState(() => localStorage.getItem('is_activated') === 'true');
  const [isTrialing, setIsTrialing] = useState(() => localStorage.getItem('is_trialing') === 'true');
  const [isSetupPending, setIsSetupPending] = useState(() => localStorage.getItem('is_setup_pending') === 'true');
  const [deviceRole, setDeviceRole] = useState<DeviceRole | null>(() => localStorage.getItem('device_role') as DeviceRole);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPage, setShowInstallPage] = useState(false);

  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(() => localStorage.getItem('license_expiry'));
  const [isExpired, setIsExpired] = useState(false);

  const isStaff = localStorage.getItem('user_role') === 'staff';
  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;
  
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const currentPath = window.location.pathname + window.location.search;
    ReactGA.send({ hitType: "pageview", page: currentPath, title: currentPage });
  }, [currentPage]);

  const saveHeartbeat = async () => {
    const now = Date.now();
    const maxTime = parseInt(localStorage.getItem('max_time_reached') || '0');
    if (now < maxTime - 60000) {
      setIsClockTampered(true);
    } else {
      const newMax = Math.max(now, maxTime);
      localStorage.setItem('max_time_reached', newMax.toString());
      await db.security.put({ key: 'max_time_reached', value: newMax });
    }
  };

  const checkExpiry = useCallback((expiryStr: string | null) => {
    if (!expiryStr) return false;
    const year = parseInt(expiryStr.substring(0, 4));
    const month = parseInt(expiryStr.substring(4, 6)) - 1;
    const day = parseInt(expiryStr.substring(6, 8));
    const expiryDate = new Date(year, month, day, 23, 59, 59);
    return Date.now() > expiryDate.getTime();
  }, []);

  const syncStateFromUrl = useCallback(() => {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page')?.toUpperCase();

    if (pathname === '/help') { setCurrentPage(Page.HELP_CENTER); return; }
    if (pathname === '/about') { setCurrentPage(Page.ABOUT_US); return; }
    if (pathname === '/affiliates') { setCurrentPage(Page.AFFILIATES); return; }

    if (pageParam && Object.values(Page).includes(pageParam as Page)) {
      setCurrentPage(pageParam as Page);
    }
    
    setIsAtLanding(window.location.pathname === '/' || window.location.pathname === '');
  }, []);

  const navigateTo = useCallback((page: Page, filter?: string) => {
    setCurrentPage(page);
    const url = new URL(window.location.href);
    
    if (page === Page.HELP_CENTER) { url.pathname = '/help'; url.search = ''; }
    else if (page === Page.ABOUT_US) { url.pathname = '/about'; url.search = ''; }
    else if (page === Page.AFFILIATES) { url.pathname = '/affiliates'; url.search = ''; }
    else {
      url.pathname = '/app';
      url.searchParams.set('page', page.toLowerCase());
      if (filter && filter !== 'all') {
        url.searchParams.set('filter', filter);
        setInventoryFilter(filter as any);
      } else {
        url.searchParams.delete('filter');
        setInventoryFilter('all');
      }
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  useEffect(() => {
    const installHandler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', installHandler);

    const startup = async () => {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const isDevEnv = hostname.endsWith('.webcontainer.io');
      const isAuthorized = ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));

      if (!isLocal && !isDevEnv && !isAuthorized) setIsPirated(true);

      await initTrialDate();
      const dbMaxTime = await db.security.get('max_time_reached');
      const lsMaxTime = parseInt(localStorage.getItem('max_time_reached') || '0');
      const maxTime = Math.max(lsMaxTime, dbMaxTime?.value || 0);
      if (Date.now() < maxTime - 60000) { setIsClockTampered(true); setIsInitialized(true); return; }

      const requestCode = await getRequestCode();
      const dbExp = await db.security.get('license_expiry');
      const dbSig = await db.security.get('license_signature');
      const lsExp = localStorage.getItem('license_expiry');
      const lsSig = localStorage.getItem('license_signature');
      let validExp = ''; let validSig = '';

      if (dbExp?.value && dbSig?.value && await validateLicenseIntegrity(requestCode, dbSig.value, dbExp.value)) {
        validExp = dbExp.value; validSig = dbSig.value;
      } else if (lsExp && lsSig && await validateLicenseIntegrity(requestCode, lsSig, lsExp)) {
        validExp = lsExp; validSig = lsSig;
      }

      if (validExp && validSig) {
        localStorage.setItem('license_expiry', validExp); localStorage.setItem('license_signature', validSig); localStorage.setItem('is_activated', 'true');
        await db.security.put({ key: 'license_expiry', value: validExp }); await db.security.put({ key: 'license_signature', value: validSig });
        setIsExpired(checkExpiry(validExp)); setIsActivated(true); setLicenseExpiry(validExp);
      } else { setIsActivated(false); }

      syncStateFromUrl();
      setTimeout(() => setIsInitialized(true), 800);
      
      heartbeatRef.current = setInterval(saveHeartbeat, 5 * 60 * 1000);
      saveHeartbeat();
    };
    startup();
    window.addEventListener('popstate', syncStateFromUrl);
    return () => {
      window.removeEventListener('popstate', syncStateFromUrl);
      window.removeEventListener('beforeinstallprompt', installHandler);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [syncStateFromUrl, checkExpiry]);

  const handleStartTrial = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const hasAlreadySkipped = localStorage.getItem('install_onboarding_done') === 'true';
    if (!isStandalone && !hasAlreadySkipped) { 
      setShowInstallPage(true); 
    } else { 
      // Straight to activation/trial logic
      setIsAtLanding(false); 
    }
  };

  if (isPirated) return (
    <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]">
      <ShieldAlert size={80} className="text-red-500 mb-6 animate-pulse" />
      <h1 className="text-4xl font-black mb-4 uppercase leading-none">Access Denied</h1>
      <p className="text-red-200 opacity-60 text-xs font-bold uppercase tracking-widest">Unauthorized Domain Detected</p>
    </div>
  );

  if (isClockTampered) return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]">
      <Clock size={80} className="text-amber-500 mb-6 animate-bounce" />
      <h1 className="text-3xl font-black mb-4 uppercase leading-none text-amber-500 italic">Clock Tampered!</h1>
      <button onClick={() => window.location.reload()} className="bg-amber-600 px-10 py-5 rounded-[24px] font-black uppercase text-xs">Check Again</button>
    </div>
  );

  if (!isInitialized) return <LoadingScreen />;

  // 1. PUBLIC ROUTES (Help, About, etc)
  if (currentPage === Page.HELP_CENTER) return <PublicHelp onBack={() => navigateTo(Page.DASHBOARD)} />;
  if (currentPage === Page.ABOUT_US) return <AboutUs onBack={() => navigateTo(Page.DASHBOARD)} />;
  if (currentPage === Page.AFFILIATES) return <Affiliates onBack={() => navigateTo(Page.DASHBOARD)} />;

  // 2. LANDING PAGE
  if (isAtLanding && !isActivated && !isTrialing) {
    return <LandingPage onStartTrial={handleStartTrial} onNavigate={(p) => navigateTo(p)} />;
  }

  // 3. INSTALLATION CHECK (FOR MOBILE)
  if (showInstallPage) return <InstallApp deferredPrompt={deferredPrompt} onNext={() => { localStorage.setItem('install_onboarding_done', 'true'); setShowInstallPage(false); setIsAtLanding(false); }} />;

  // 4. ACTIVATION & TRIAL GUARD (LOCK SCREEN)
  const isTrialValidFinal = isTrialing && isTrialValid;
  if (!isActivated && !isTrialValidFinal || isExpired) {
    // Note: Staff can bypass this via Login screen's "Import" which sets isActivated = true
    if (!isStaff) return <LockScreen onUnlock={() => window.location.reload()} isExpired={isExpired} />;
  }

  // 5. SETUP WIZARD (ONBOARDING)
  if (isSetupPending && !isStaff) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // 6. LOGIN (IDENTIFY ACCOUNT)
  if (!currentUser) {
    return <LoginScreen onLogin={(u) => setCurrentUser(u)} deviceRole={deviceRole || (isStaff ? 'StaffDevice' : 'Owner')} />;
  }

  // 7. MAIN APP INTERFACE
  const isStaffDevice = deviceRole === 'StaffDevice' || isStaff;
  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
      case Page.INVENTORY: return <Inventory user={currentUser} role={isStaffDevice ? 'Staff' : currentUser.role} initialFilter={inventoryFilter} clearInitialFilter={() => navigateTo(Page.INVENTORY, 'all')} setPage={navigateTo} />;
      case Page.POS: return <POS user={currentUser} setNavHidden={setIsNavHidden} />;
      case Page.SALES: return <Sales role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.DEBTS: return isStaff ? <Dashboard setPage={navigateTo} role="Staff" onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} /> : <Debts role={currentUser.role} />;
      case Page.STOCK_LOGS: return <StockLogs setPage={navigateTo} />;
      case Page.EXPENSES: return isStaff ? <Dashboard setPage={navigateTo} role="Staff" onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} /> : <Expenses role={currentUser.role} setPage={navigateTo} />;
      case Page.SETTINGS: return <Settings user={currentUser} role={isStaffDevice ? 'Staff' : currentUser.role} setRole={(r) => setCurrentUser({...currentUser, role: r})} setPage={navigateTo} />;
      case Page.FAQ: return <FAQ setPage={navigateTo} />;
      case Page.CUSTOMERS: return isStaff ? <Dashboard setPage={navigateTo} role="Staff" onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} /> : <Customers setPage={navigateTo} role={currentUser.role} />;
      case Page.CATEGORY_MANAGER: return <CategoryManager setPage={navigateTo} />;
      default: return <Dashboard setPage={navigateTo} role={isStaffDevice ? 'Staff' : currentUser.role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 animate-in fade-in transition-colors duration-300">
      <main className="flex-1 overflow-auto">{renderPage()}</main>
      {!isStaffDevice && !isNavHidden && <BackupReminder />}
      {!isNavHidden && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-emerald-900/95 backdrop-blur-md border-t border-slate-100 dark:border-emerald-800 flex justify-between items-center px-0.5 py-2 safe-bottom z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
          <button onClick={() => navigateTo(Page.DASHBOARD)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <LayoutGrid size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Home</span>
          </button>
          <button onClick={() => navigateTo(Page.POS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <ShoppingBag size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">POS</span>
          </button>
          <button onClick={() => navigateTo(Page.INVENTORY, 'all')} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.INVENTORY || currentPage === Page.STOCK_LOGS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <Package size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Stock</span>
          </button>
          <button onClick={() => navigateTo(Page.SALES)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SALES ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <Receipt size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Sales</span>
          </button>
          {!isStaff && (
            <>
              <button onClick={() => navigateTo(Page.DEBTS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.DEBTS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
                <BookOpen size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Debts</span>
              </button>
              <button onClick={() => navigateTo(Page.CUSTOMERS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.CUSTOMERS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
                <Wallet size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Wallet</span>
              </button>
              <button onClick={() => navigateTo(Page.SETTINGS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SETTINGS || currentPage === Page.FAQ ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
                <SettingsIcon size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Admin</span>
              </button>
            </>
          )}
        </nav>
      )}
      <InstallBanner />
      <UpdatePrompt />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
