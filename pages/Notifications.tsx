
import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { 
  ArrowLeft, Bell, AlertTriangle, ShieldAlert, Zap, 
  ChevronRight, Info, Package, Clock, History
} from 'lucide-react';

interface NotificationsProps {
  onBack: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
  const inventory = useLiveQuery(() => db.inventory.toArray());

  const alerts = useMemo(() => {
    if (!inventory) return { lowStock: [], expiring: [] };
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      lowStock: inventory.filter(i => i.stock <= (i.minStock || 5)),
      expiring: inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= nextWeek)
    };
  }, [inventory]);

  const totalAlerts = alerts.lowStock.length + alerts.expiring.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-100 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-2 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tight text-emerald-950">Notifications</h1>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Business Health Summary */}
        <section className="bg-emerald-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
           <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <ShieldAlert size={20} />
                 </div>
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Business Health Score</h2>
              </div>
              <div className="space-y-1">
                 <p className="text-4xl font-black tracking-tighter">
                   {totalAlerts === 0 ? 'Excellent' : totalAlerts < 5 ? 'Good' : 'Critical'}
                 </p>
                 <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">
                   {totalAlerts} Active Issues Detected
                 </p>
              </div>
           </div>
        </section>

        {/* Alerts Feed */}
        <div className="space-y-8">
           {/* System Updates */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">System Updates</h3>
              <div className="bg-white p-5 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                    <Zap size={24} fill="currentColor" />
                 </div>
                 <div>
                    <h4 className="font-black text-sm text-slate-800">New Version v1.1.5</h4>
                    <p className="text-xs font-medium text-slate-400">Stable release with improved offline sync is available.</p>
                 </div>
              </div>
           </div>

           {/* Critical Alerts (Inventory) */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Stock Alerts</h3>
              
              {alerts.lowStock.length > 0 || alerts.expiring.length > 0 ? (
                <div className="space-y-3">
                  {alerts.lowStock.map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-red-50 shadow-sm flex items-center gap-4">
                       <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                          <AlertTriangle size={24} />
                       </div>
                       <div className="flex-1">
                          <h4 className="font-black text-sm text-slate-800 uppercase">{item.name}</h4>
                          <p className="text-xs font-bold text-red-500">Critical: Only {item.stock} {item.unit || 'Pcs'} left.</p>
                       </div>
                    </div>
                  ))}

                  {alerts.expiring.map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-orange-50 shadow-sm flex items-center gap-4">
                       <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                          <Clock size={24} />
                       </div>
                       <div className="flex-1">
                          <h4 className="font-black text-sm text-slate-800 uppercase">{item.name}</h4>
                          <p className="text-xs font-bold text-orange-500">Expiring Soon: {item.expiryDate}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4 bg-white rounded-[2rem] border border-dashed border-slate-200">
                   <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-300">
                      <Package size={32} />
                   </div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Everything is in stock!</p>
                </div>
              )}
           </div>
        </div>
      </main>

      <footer className="p-6 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">NaijaShop Health Diagnostics 🇳🇬</p>
      </footer>
    </div>
  );
};
