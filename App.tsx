
import React, { useState, useEffect } from 'react';
import { Page, Role } from './types.ts';
import { initTrialDate, User, db } from './db.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { POS } from './pages/POS.tsx';
import { Sales } from './pages/Sales.tsx';
import { Settings } from './pages/Settings.tsx';
import { FAQ } from './pages/FAQ.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { SetupWizard } from './components/SetupWizard.tsx';
import { LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, History, ShieldAlert } from 'lucide-react';

const ALLOWED_DOMAIN = 'niajapos.netlify.app';
const TRIAL_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 Days in MS

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPirated, setIsPirated] = useState(false);
  
  // 1. The 4 States of Truth (Switchboard)
  const [isAtLanding, setIsAtLanding] = useState(() => window.location.pathname === '/' || window.location.pathname === '');
  const [isActivated, setIsActivated] = useState(() => localStorage.getItem('is_activated') === 'true');
  const [isTrialing, setIsTrialing] = useState(() => localStorage.getItem('is_trialing') === 'true');
  const [isSetupPending, setIsSetupPending] = useState(() => localStorage.getItem('is_setup_pending') === 'true');

  // Derived Truth: Trial Validity
  const trialStartDate = localStorage.getItem('trial_start_date');
  const isTrialValid = trialStartDate ? (Date.now() - parseInt(trialStartDate)) < TRIAL_DURATION : false;

  useEffect(() => {
    const startup = async () => {
      // Domain Check (Piracy Guard)
      const hostname = window.location.hostname;
      if (
        hostname !== 'localhost' && 
        hostname !== '127.0.0.1' && 
        hostname !== ALLOWED_DOMAIN && 
        !hostname.endsWith('.webcontainer.io')
      ) {
        setIsPirated(true);
      }

      await initTrialDate();
      
      // Sync DB activation state to localStorage if missing
      const dbActivated = await db.settings.get('is_activated');
      if (dbActivated?.value === true && !isActivated) {
        localStorage.setItem('is_activated', 'true');
        setIsActivated(true);
      }

      setIsInitialized(true);
    };
    startup();

    const handleUrlChange = () => {
      setIsAtLanding(window.location.pathname === '/' || window.location.pathname === '');
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [isActivated]);

  const handleStartTrial = () => {
    // 1. Setup Trial Keys
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());
    localStorage.setItem('is_setup_pending', 'true');
    localStorage.setItem('temp_otp', '123456'); // Default Trial OTP
    
    // 2. Redirect to /app path
    window.history.pushState({}, '', '/app');
    
    // 3. Force state update
    setIsAtLanding(false);
    setIsTrialing(true);
    setIsSetupPending(true);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  if (isPirated) {
    return (
      <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]">
        <ShieldAlert size={80} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black mb-4 uppercase leading-none">Security Alert</h1>
        <p className="text-red-200/60 max-w-sm font-medium">Unauthorized distribution detected.</p>
      </div>
    );
  }

  if (!isInitialized) return null;

  // 2. The Navigation Logic (The Switchboard Hierarchy)
  
  // Level 1: Marketing / Landing (Only if not in app and not active/trialing)
  if (isAtLanding && !isActivated && !isTrialing) {
    return <LandingPage onStartTrial={handleStartTrial} />;
  }

  // Level 2: License Check (If not activated AND either no trial or trial expired)
  if (!isActivated && (!isTrialing || !isTrialValid)) {
    return <LockScreen onUnlock={() => window.location.reload()} />;
  }

  // Level 3: First Login OTP Setup (Bridge to daily use)
  if (isSetupPending) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  // Level 4: Standard Authentication (PIN Login)
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Level 5: Daily Use (The POS App)
  const isAdmin = currentUser.role === 'Admin';
  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
      case Page.INVENTORY: return <Inventory role={currentUser.role} />;
      case Page.POS: return <POS role={currentUser.role} />;
      case Page.SALES: return <Sales role={currentUser.role} />;
      case Page.SETTINGS: return <Settings role={currentUser.role} setRole={(role) => setCurrentUser({...currentUser, role})} setPage={setCurrentPage} />;
      case Page.FAQ: return <FAQ setPage={setCurrentPage} />;
      default: return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24 animate-in fade-in duration-500">
      <main className="flex-1 overflow-auto bg-[#f9fafb]">
        {renderPage()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex justify-around items-center py-2 safe-bottom z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setCurrentPage(Page.DASHBOARD)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
          <LayoutGrid size={22} /><span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => setCurrentPage(Page.POS)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
          <ShoppingBag size={22} /><span className="text-[9px] font-bold mt-1 uppercase tracking-wider">POS</span>
        </button>
        <button onClick={() => setCurrentPage(Page.SALES)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.SALES ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
          <History size={22} /><span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Sales</span>
        </button>
        <button onClick={() => setCurrentPage(Page.INVENTORY)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.INVENTORY ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
          <Package size={22} /><span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Stock</span>
        </button>
        {isAdmin && (
          <button onClick={() => setCurrentPage(Page.SETTINGS)} className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.SETTINGS || currentPage === Page.FAQ ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
            <SettingsIcon size={22} /><span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default App;
