
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Users, Search, Wallet, ArrowLeft, History, 
  Trash2, UserPlus, Phone, CreditCard, ChevronRight, TrendingDown 
} from 'lucide-react';
import { Page, Role } from '../types.ts';

interface CustomersProps {
  setPage: (page: Page) => void;
  role: Role;
}

export const Customers: React.FC<CustomersProps> = ({ setPage, role }) => {
  const isAdmin = role === 'Admin';
  const customers = useLiveQuery(() => db.customers.toArray());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers?.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    ) || [];
  }, [customers, searchTerm]);

  const totalLiability = useMemo(() => {
    return customers?.reduce((sum, c) => sum + (c.walletBalance || 0), 0) || 0;
  }, [customers]);

  const handleDeleteCustomer = async (id: number) => {
    if (!isAdmin) return;
    if (confirm("Delete customer and their wallet balance? This cannot be undone.")) {
      await db.customers.delete(id);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => setPage(Page.SETTINGS)}
          className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-slate-400 shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Customer Wallets</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Digital Store Credit</p>
        </div>
      </header>

      {/* Summary Widget */}
      <section className="bg-amber-600 text-white p-7 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-amber-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total "Change" Liability</p>
          <h2 className="text-4xl font-black tracking-tighter">{formatNaira(totalLiability)}</h2>
          <p className="text-[10px] font-bold mt-2 opacity-60 uppercase tracking-widest">Total Credit Owed to {customers?.length || 0} Customers</p>
        </div>
        <TrendingDown className="absolute -right-4 -bottom-4 opacity-10" size={140} />
      </section>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input 
          type="text" 
          placeholder="Search by name or phone..."
          className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-slate-900 dark:text-emerald-50 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white dark:bg-emerald-900 p-5 rounded-[32px] border border-slate-100 dark:border-emerald-800 flex items-center gap-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Wallet size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-800 dark:text-emerald-50 text-sm truncate uppercase tracking-tight">{customer.name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm tracking-tighter">{formatNaira(customer.walletBalance)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Phone size={10} /> {customer.phone}
                    </p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Last: {new Date(customer.lastTransaction).toLocaleDateString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => customer.id && handleDeleteCustomer(customer.id)} className="text-red-200 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-slate-50 dark:bg-emerald-900/20 rounded-[40px] border border-dashed border-slate-200 dark:border-emerald-800">
             <Users className="mx-auto text-slate-200" size={48} />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No customers with balances</p>
          </div>
        )}
      </div>
    </div>
  );
};
