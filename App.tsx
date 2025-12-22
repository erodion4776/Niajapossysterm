import React, { useState, useEffect } from 'react';
import { Page, Role } from './types.ts';
import { initTrialDate, User } from './db.ts';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { POS } from './pages/POS.tsx';
import { Settings } from './pages/Settings.tsx';
import { LockScreen } from './components/LockScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { LayoutGrid, ShoppingBag, Package, Settings as SettingsIcon } from 'lucide-react';

const TRIAL_PERIOD_DAYS = 3;

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isLocked, setIsLocked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    initTrialDate();
    checkTrialStatus();
  }, []);

  const checkTrialStatus = () => {
    const isPaid = localStorage.getItem('is_paid') === 'true';
    if (isPaid) return;

    const installDate = parseInt(localStorage.getItem('install_date') || '0');
    if (!installDate) return;

    const daysUsed = (Date.now() - installDate) / (1000 * 60 * 60 * 24);
    if (daysUsed > TRIAL_PERIOD_DAYS) {
      setIsLocked(true);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_name', user.name);
  };

  const renderPage = () => {
    if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
      case Page.INVENTORY:
        return <Inventory role={currentUser.role} />;
      case Page.POS:
        return <POS role={currentUser.role} />;
      case Page.SETTINGS:
        return <Settings role={currentUser.role} setRole={(role) => setCurrentUser({...currentUser, role})} />;
      default:
        return <Dashboard setPage={setCurrentPage} role={currentUser.role} />;
    }
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-xl relative">
      {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
      
      <main className="flex-1 overflow-auto bg-[#f9fafb]">
        {renderPage()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex justify-around items-center py-2 safe-bottom z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setCurrentPage(Page.DASHBOARD)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.DASHBOARD ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <LayoutGrid size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase">Home</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.POS)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.POS ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <ShoppingBag size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase">POS</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.INVENTORY)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.INVENTORY ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <Package size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase">Stock</span>
        </button>
        <button 
          onClick={() => setCurrentPage(Page.SETTINGS)}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentPage === Page.SETTINGS ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}
        >
          <SettingsIcon size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase">Admin</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
