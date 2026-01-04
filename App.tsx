
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactGA from 'react-ga4';
import { Page, Role, DeviceRole } from './types.ts';
import { initTrialDate, User, db } from './db.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { StaffDashboard } from './pages/StaffDashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { POS } from './pages/POS.tsx';
import { Sales } from './pages/Sales.tsx';
import { Debts } from './pages/Debts.tsx';
import { Expenses } from './pages/Expenses.tsx';
import { Settings } from './pages/Settings.tsx';
import { FAQ } from './pages/FAQ.tsx';
import { Customers } from './pages/Customers.tsx';
import { StockLogs } from './pages/StockLogs.tsx';
import { CategoryLab } from './pages/CategoryLab.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { Onboarding } from './components/Onboarding.tsx';
import { InstallApp } from './pages/InstallApp.tsx';
import { JoinShop } from './pages/JoinShop.tsx';
import { AIAssistant } from './pages/AIAssistant.tsx';
import { PublicHelp } from './pages/PublicHelp.tsx';
import { AboutUs } from './pages/AboutUs.tsx';
import { Affiliates } from './pages/Affiliates.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { InstallBanner } from './components/InstallBanner.tsx'; 
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { getRequestCode, validateLicenseIntegrity } from './utils/security.ts';
import { 
  Home, Smartphone, Package, UserCircle, Menu, 
  Wallet, ShieldAlert, CreditCard, LayoutGrid, Zap
} from 'lucide-react';

const ALLOWED_DOMAINS = ['naijashop.com.ng', 'niajapos.netlify.app'];
// Trial Period: 14 Days
const TRIAL_DURATION = 14 * 24 * 60 * 60 * 1000; 

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
  
  const [shopName, setShopName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>('Boss');

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
    
    const sn = await db.settings.get('shop_name');
    const on = await db.settings.get('owner_name');
    setShopName(sn?.value || null);
    setOwnerName(on?.value?.split(' ')[0] || 'Boss');

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

    setTimeout(() => {
      setIsInitialized(true);
    }, 500);
  };

  useEffect(() => {
    startup();
    window.addEventListener('popstate', syncState);
    const handleBeforeInstallPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('popstate', syncState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [syncState]);

  const navigateTo = useCallback((page: Page, filter?: string) => {
    setCurrentPage(page);
    const url = new URL(window.location.href);
    
    // Check if it's a "Top Level" public page that should have its own clean URL
    if (page === Page.AFFILIATES) {
      url.pathname = '/affiliates';
      url.searchParams.delete('page');
    } else if (page === Page.HELP_CENTER) {
      url.pathname = '/help';
      url.searchParams.delete('page');
    } else if (page === Page.ABOUT_US) {
      url.pathname = '/about';
      url.searchParams.delete('page');
    } else {
      url.pathname = '/app';
      url.searchParams.set('page', page.toLowerCase());
    }

    if (filter && filter !== 'all') {
      url.searchParams.set('filter', filter);
      setInventoryFilter(filter as any);
    } else {
      url.searchParams.delete('filter');
      setInventoryFilter('all');
    }
    
    window.history.pushState({}, '', url.toString());
    setPath(url.pathname);
  }, []);

  const handleStartTrial = () => {
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());
    localStorage.setItem('device_role', 'Owner');
    localStorage.setItem('is_setup_pending', 'true');
    window.location.href = '/app';
  };

  const refreshOnboarding = async () => {
    const sn = await db.settings.get('shop_name');
    const on = await db.settings.get('owner_name');
    setShopName(sn?.value || null);
    setOwnerName(on?.value?.split(' ')[0] || 'Boss');
    syncState();
  };

  if (isPirated) return <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]"><ShieldAlert size={80} className="text-red-500 mb-6" /><h1 className="text-4xl font-black uppercase">Access Denied</h1></div>;
  if (!isInitialized) return <LoadingScreen />;

  // PUBLIC ROUTES
  if (path.startsWith('/join')) return <JoinShop />;
  if (path === '/help') return <PublicHelp onBack={() => window.history.back()} />;
  if (path === '/about') return <AboutUs onBack={() => window.history.back()} />;
  if (path === '/affiliates') return <Affiliates onBack={() => window.history.back()} />;

  if (path === '/' && !isActivated && (!isTrialing || !isTrialValid) && !isStaff) {
    return <LandingPage onStartTrial={handleStartTrial} onNavigate={navigateTo} />;
  }

  if (isSetupPending) {
    return <Onboarding onComplete={() => { refreshOnboarding(); }} />;
  }

  if (!isStaff && ((!isActivated && !(isTrialing && isTrialValid)) || isExpired)) {
    return <LockScreen onUnlock={() => window.location.reload()} isExpired={isExpired} />;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  if (!isStandalone && !installSkipped && !isStaff) {
    return <InstallApp ownerName={ownerName} deferredPrompt={deferredPrompt} onNext={() => { localStorage.setItem('install_skipped', 'true'); syncState(); }} />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={(u) => setCurrentUser(u)} deviceRole={deviceRole || (isStaff ? 'StaffDevice' : 'Owner')} />;
  }

  const isStaffDevice = deviceRole === 'StaffDevice' || isStaff || currentUser.role === 'Staff';
  
  const renderPage = () => {
    const role = isStaffDevice ? 'Staff' : currentUser.role;
    switch (currentPage) {
      case Page.DASHBOARD: 
        return isStaffDevice ? <StaffDashboard setPage={navigateTo} user={currentUser} /> : <Dashboard setPage={navigateTo} role={role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} user={currentUser} />;
      case Page.INVENTORY: return <Inventory user={currentUser} role={role} initialFilter={inventoryFilter} clearInitialFilter={() => navigateTo(Page.INVENTORY, 'all')} setPage={navigateTo} />;
      case Page.POS: return <POS user={currentUser} setNavHidden={setIsNavHidden} />;
      case Page.SALES: return <Sales role={role} />;
      case Page.DEBTS: return <Debts role={role} />;
      case Page.CUSTOMERS: return <Customers setPage={navigateTo} role={role} />;
      case Page.STOCK_LOGS: return <StockLogs setPage={navigateTo} />;
      case Page.EXPENSES: return <Expenses setPage={navigateTo} role={role} />;
      case Page.SETTINGS: return isStaffDevice ? <StaffDashboard setPage={navigateTo} user={currentUser} /> : <Settings user={currentUser} role={role} setRole={(r) => setCurrentUser({...currentUser, role: r})} setPage={navigateTo} deferredPrompt={deferredPrompt} />;
      case Page.CATEGORY_MANAGER: return <CategoryLab setPage={navigateTo} />;
      case Page.AI_ASSISTANT: return <AIAssistant setPage={navigateTo} />;
      case Page.AFFILIATES: return <Affiliates onBack={() => navigateTo(Page.DASHBOARD)} />;
      case Page.HELP_CENTER: return <PublicHelp onBack={() => navigateTo(Page.DASHBOARD)} />;
      case Page.ABOUT_US: return <AboutUs onBack={() => navigateTo(Page.DASHBOARD)} />;
      default: return isStaffDevice ? <StaffDashboard setPage={navigateTo} user={currentUser} /> : <Dashboard setPage={navigateTo} role={role} onInventoryFilter={(f) => navigateTo(Page.INVENTORY, f)} user={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 transition-colors duration-300">
      <main className="flex-1 overflow-auto">{renderPage()}</main>
      {!isStaffDevice && !isNavHidden && <BackupReminder />}
      {!isNavHidden && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-100 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] safe-bottom overflow-hidden">
          <div className="flex items-center justify-around px-2 py-4">
            <NavBtn onClick={() => navigateTo(Page.DASHBOARD)} active={currentPage === Page.DASHBOARD} icon={<Home size={26}/>} label="Home" />
            <NavBtn onClick={() => navigateTo(Page.POS)} active={currentPage === Page.POS} icon={<CreditCard size={26}/>} label="POS" />
            <NavBtn onClick={() => navigateTo(Page.INVENTORY, 'all')} active={currentPage === Page.INVENTORY} icon={<LayoutGrid size={26}/>} label="Stock" />
            {!isStaffDevice && <NavBtn onClick={() => navigateTo(Page.SETTINGS)} active={currentPage === Page.SETTINGS} icon={<UserCircle size={26}/>} label="Me" />}
          </div>
        </nav>
      )}
      <InstallBanner />
      <UpdatePrompt />
    </div>
  );
};

const NavBtn = ({ onClick, active, icon, label }: { onClick: () => void, active: boolean, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center transition-all duration-300 ${active ? 'text-emerald-600 scale-110 drop-shadow-sm' : 'text-slate-400'}`}>
    <div className={`transition-all duration-300 ${active ? 'text-emerald-500' : 'text-slate-300'}`}>{icon}</div>
    <span className={`text-[10px] font-black mt-1.5 uppercase tracking-tighter transition-all duration-300 ${active ? 'text-emerald-600 opacity-100' : 'text-slate-400 opacity-70'}`}>{label}</span>
    {active && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1 animate-pulse"></div>}
  </button>
);

const App: React.FC = () => (<ThemeProvider><AppContent /></ThemeProvider>);
export default App;
