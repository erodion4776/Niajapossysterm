import React, { useState, useEffect } from 'react';
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
import { AIAssistant } from './pages/AIAssistant.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { RoleSelection } from './components/RoleSelection.tsx';
import { SetupWizard } from './components/SetupWizard.tsx';
import { BackupReminder } from './components/BackupReminder.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, Receipt, ShieldAlert, Users, Wallet, Sparkles } from 'lucide-react';

const ALLOWED_DOMAIN = 'niajapos.netlify.app';
const TRIAL_DURATION = 259200000; // 3 days in milliseconds

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPirated, setIsPirated] = useState(false);
  
  const [isAtLanding, setIsAtLanding] = useState(() => window.location.pathname === '/' || window.location.pathname === '');
  const [isActivated, setIsActivated] = useState(() => localStorage.getItem('is_activated') === 'true');
  const [isTrialing, setIsTrialing] = useState(() => localStorage.getItem('is_trialing') === 'true');
  const [isSetupPending, setIsSetupPending] = useState(() => localStorage.getItem('is_setup_pending') === 'true');
  const [deviceRole, setDeviceRole] = useState<DeviceRole | null>(() => localStorage.getItem('device_role') as DeviceRole);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;

  useEffect(() => {
    const startup = async () => {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== ALLOWED_DOMAIN && !hostname.endsWith('.webcontainer.io')) {
        setIsPirated(true);
      }
      await initTrialDate();
      const dbActivated = await db.settings.get('is_activated');
      if (dbActivated?.value === true && !isActivated) {
        localStorage.setItem('is_activated', 'true');
        setIsActivated(true);
      }
      setIsInitialized(true);
    };
    startup();

    const handleUrlChange = () => setIsAtLanding(window.location.pathname === '/' || window.location.pathname === '');
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [isActivated]);

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
      
      window.history.pushState({}, '', '/app');
      setIsAtLanding(false);
      setIsTrialing(true);
      setIsSetupPending(true);
    } else {
      // Staff setup skips trial/otp and goes straight to Login with Invite Import
      window.history.pushState({}, '', '/app');
      setIsAtLanding(false);
      setIsTrialing(false);
      setIsSetupPending(false);
      // We don't mark as activated yet - that happens after importing the key in LoginScreen
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
  
  // Owner Flow Guards
  if (deviceRole === 'Owner') {
    if (!isActivated && (!isTrialing || !isTrialValid)) return <LockScreen onUnlock={() => window.location.reload()} />;
    if (isSetupPending) return <SetupWizard onComplete={() => window.location.reload()} />;
  }
  
  // Login Screen (Both roles reach here, but Staff skips setup)
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const isStaffDevice = deviceRole === 'StaffDevice';
  const isAdminUser = currentUser.role === 'Admin' && !isStaffDevice;

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard setPage={setCurrentPage} role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.INVENTORY: return <Inventory role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.POS: return <POS user={currentUser} />;
      case Page.SALES: return <Sales role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.DEBTS: return <Debts role={isStaffDevice ? 'Staff' : currentUser.role} />;
      case Page.EXPENSES: return <Expenses role={isStaffDevice ? 'Staff' : currentUser.role} setPage={setCurrentPage} />;
      case Page.SETTINGS: return <Settings role={isStaffDevice ? 'Staff' : currentUser.role} setRole={(role) => setCurrentUser({...currentUser, role})} setPage={setCurrentPage} />;
      case Page.FAQ: return <FAQ setPage={setCurrentPage} />;
      case Page.AI_ASSISTANT: return <AIAssistant setPage={setCurrentPage} />;
      default: return <Dashboard setPage={setCurrentPage} role={isStaffDevice ? 'Staff' : currentUser.role} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 animate-in fade-in duration-500 transition-colors duration-300">
      <main className="flex-1 overflow-auto">{renderPage()}</main>
      
      {!isStaffDevice && <BackupReminder />}

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-emerald-900/95 backdrop-blur-md border-t border-slate-100 dark:border-emerald-800 flex justify-between items-center px-0.5 py-2 safe-bottom z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300">
        <button onClick={() => setCurrentPage(Page.DASHBOARD)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <LayoutGrid size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Home</span>
        </button>
        
        <button onClick={() => setCurrentPage(Page.POS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <ShoppingBag size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">POS</span>
        </button>

        <button onClick={() => setCurrentPage(Page.INVENTORY)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.INVENTORY ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <Package size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Stock</span>
        </button>

        <button onClick={() => setCurrentPage(Page.SALES)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SALES ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
          <Receipt size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Sales</span>
        </button>
        
        {/* Profit Assistant only for Owner */}
        {!isStaffDevice && (
          <button onClick={() => setCurrentPage(Page.AI_ASSISTANT)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.AI_ASSISTANT ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
            <Sparkles size={18} /><span className="text-[7px] font-black mt-1 uppercase tracking-tighter">AI GPT</span>
          </button>
        )}

        {/* Hide Admin tab for Staff Devices completely */}
        {isAdminUser && (
          <button onClick={() => setCurrentPage(Page.SETTINGS)} className={`flex flex-col items-center flex-1 p-1 rounded-xl transition-all ${currentPage === Page.SETTINGS || currentPage === Page.FAQ ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800/30' : 'text-slate-400 dark:text-emerald-700'}`}>
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