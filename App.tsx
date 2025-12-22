
import React, { useState, useEffect } from 'react';
import { Page, Role } from './types.ts';
import { initTrialDate, User, db } from './db.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { POS } from './pages/POS.tsx';
import { Sales } from './pages/Sales.tsx';
import { Settings } from './pages/Settings.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon, History, ShieldAlert } from 'lucide-react';

const TRIAL_PERIOD_DAYS = 3;
const ALLOWED_DOMAIN = 'niajapos.netlify.app';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isLocked, setIsLocked] = useState(false);
  const [isPirated, setIsPirated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const startup = async () => {
      // 1. Domain Security Lock
      const hostname = window.location.hostname;
      if (
        hostname !== 'localhost' && 
        hostname !== '127.0.0.1' && 
        hostname !== ALLOWED_DOMAIN && 
        !hostname.endsWith('.webcontainer.io') // Allow development environments
      ) {
        setIsPirated(true);
      }

      // 2. Initialize Database and Trial
      await initTrialDate();
      
      // 3. Verify Activation
      await checkActivationStatus();
      setIsInitialized(true);
    };
    startup();
  }, []);

  const checkActivationStatus = async () => {
    // Check IndexedDB and LocalStorage for cross-persistence
    const dbActivated = await db.settings.get('is_activated');
    const isActivated = localStorage.getItem('is_activated') === 'true' || dbActivated?.value === true;
    
    // Sync activation status
    if (isActivated) {
      if (localStorage.getItem('is_activated') !== 'true') localStorage.setItem('is_activated', 'true');
      if (dbActivated?.value !== true) await db.settings.put({ key: 'is_activated', value: true });
      setIsLocked(false);
      return;
    }

    // Trial Calculation (3 Days)
    const installDateStr = localStorage.getItem('install_date');
    if (!installDateStr) return;
    
    const installDate = parseInt(installDateStr);
    const msUsed = Date.now() - installDate;
    const daysUsed = msUsed / (1000 * 60 * 60 * 24);

    if (daysUsed > TRIAL_PERIOD_DAYS) {
      setIsLocked(true);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_name', user.name);
  };

  // Piracy Warning Screen
  if (isPirated) {
    return (
      <div className="fixed inset-0 bg-red-950 flex flex-col items-center justify-center p-8 text-white text-center z-[1000]">
        <div className="bg-red-500/20 p-6 rounded-full mb-8 border border-red-500/30 animate-pulse">
          <ShieldAlert size={80} className="text-red-500" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">Piracy Warning</h1>
        <p className="text-red-200/60 max-w-sm mb-8 font-medium">
          This application is running on an unauthorized domain. Unauthorized distribution of this software is prohibited.
        </p>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-mono mb-8">
          Domain detected: <span className="text-red-400 font-bold">{window.location.hostname}</span>
        </div>
        <p className="text-xs uppercase font-black tracking-[0.2em] text-red-500 opacity-50">
          Access Denied • Contact Developer
        </p>
      </div>
    );
  }

  // Activation Overlay
  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (!isInitialized) return null;

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const isAdmin = currentUser.role === 'Admin';

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
      case Page.INVENTORY:
        return <Inventory role={currentUser.role} />;
      case Page.POS:
        return <POS role={currentUser.role} />;
      case Page.SALES:
        return <Sales role={currentUser.role} />;
      case Page.SETTINGS:
        return <Settings role={currentUser.role} setRole={(role) => setCurrentUser({...currentUser, role})} />;
      default:
        return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-xl relative pb-24">
      <main className="flex-1 overflow-auto bg-[#f9fafb]">
        {renderPage()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex justify-around items-center py-2 safe-bottom z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setCurrentPage(Page.DASHBOARD)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <LayoutGrid size={22} />
          <span className="text-[9px] font-bold mt-1 uppercase">Home</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.POS)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <ShoppingBag size={22} />
          <span className="text-[9px] font-bold mt-1 uppercase">POS</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.SALES)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.SALES ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <History size={22} />
          <span className="text-[9px] font-bold mt-1 uppercase">Sales</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.INVENTORY)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.INVENTORY ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <Package size={22} />
          <span className="text-[9px] font-bold mt-1 uppercase">Stock</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setCurrentPage(Page.SETTINGS)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.SETTINGS ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
          >
            <SettingsIcon size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default App;
