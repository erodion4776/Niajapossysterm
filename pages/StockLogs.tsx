
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { 
  History, Search, Calendar, ArrowLeft, 
  TrendingUp, TrendingDown, Package, User, 
  ArrowRight, Filter, Clock
} from 'lucide-react';
import { Page } from '../types.ts';

interface StockLogsProps {
  setPage: (page: Page) => void;
}

export const StockLogs: React.FC<StockLogsProps> = ({ setPage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const logs = useLiveQuery(async () => {
    let query = db.stock_logs.orderBy('date').reverse();
    const results = await query.toArray();
    
    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterDate);
      end.setHours(23, 59, 59, 999);
      return results.filter(l => l.date >= start.getTime() && l.date <= end.getTime());
    }
    
    return results;
  }, [filterDate]);

  const filteredLogs = useMemo(() => {
    return logs?.filter(log => 
      log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [logs, searchTerm]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => setPage(Page.INVENTORY)}
          className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Stock History</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Inventory Movements</p>
        </div>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-emerald-800" size={18} />
          <input 
            type="text" 
            placeholder="Search item or staff name..."
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-[24px] focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-emerald-50 font-medium shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative flex-1">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          <input 
            type="date"
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-xs font-bold uppercase text-slate-700 dark:text-emerald-50 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white dark:bg-emerald-900 p-5 rounded-[32px] border border-slate-50 dark:border-emerald-800/40 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${log.quantityChanged > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} dark:bg-emerald-950`}>
                    {log.quantityChanged > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-emerald-50 text-base leading-tight uppercase truncate max-w-[150px]">{log.itemName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <Clock size={10} /> {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.date).toLocaleDateString([], { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black tracking-tighter ${log.quantityChanged > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                  </p>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{log.type}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 dark:border-emerald-800/40">
                <div className="bg-slate-50 dark:bg-emerald-950 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Prev</span>
                  <span className="text-xs font-black text-slate-600 dark:text-emerald-100">{log.previousStock}</span>
                </div>
                <div className="bg-slate-50 dark:bg-emerald-950 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">New</span>
                  <span className="text-xs font-black text-slate-600 dark:text-emerald-100">{log.newStock}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                <div className="bg-emerald-50 dark:bg-emerald-950 p-1.5 rounded-lg">
                  <User size={12} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-emerald-400 uppercase tracking-widest">Recorded by {log.staff_name}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-slate-50 dark:bg-emerald-900/20 rounded-[40px] border border-dashed border-slate-200 dark:border-emerald-800/40">
             <Package className="mx-auto text-slate-200 dark:text-emerald-800 opacity-50" size={64} />
             <p className="text-[10px] font-black text-slate-400 dark:text-emerald-500/60 uppercase tracking-widest leading-relaxed">
               No stock records found.<br/>Start adding inventory to see history.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};
