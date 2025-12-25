import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Wallet, Plus, Search, Trash2, X, Calendar, 
  ArrowLeft, Receipt, TrendingDown
} from 'lucide-react';
import { Role, Page } from '../types.ts';

interface ExpensesProps {
  setPage: (page: Page) => void;
  role: Role;
}

export const Expenses: React.FC<ExpensesProps> = ({ setPage, role }) => {
  const isAdmin = role === 'Admin';
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const filteredExpenses = useMemo(() => {
    return expenses?.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [expenses, searchTerm]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await db.expenses.add({
        ...formData,
        date: new Date(formData.date).getTime()
      });
      setFormData({ description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to add expense");
    }
  };

  const handleDeleteExpense = async (id: number | string) => {
    if (!isAdmin) return;
    if (confirm("Delete this expense record?")) {
      await db.expenses.delete(id);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => setPage(Page.DASHBOARD)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Expenses</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Business Overheads</p>
        </div>
      </header>

      {/* Summary Card */}
      <section className="bg-amber-600 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-amber-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Period Expenses</p>
          <h2 className="text-4xl font-black tracking-tighter">{formatNaira(totalExpenses)}</h2>
          <div className="flex items-center gap-2 mt-4">
             <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
               <Receipt size={10}/> {filteredExpenses.length} Records
             </span>
          </div>
        </div>
        <TrendingDown className="absolute -right-4 -bottom-4 opacity-10" size={140} />
      </section>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Search description..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-200 active:scale-90 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(expense => (
            <div key={expense.id} className="bg-white p-5 rounded-[32px] border border-gray-50 flex items-center gap-5 shadow-sm text-left">
              <div className="p-4 rounded-[22px] bg-amber-50 text-amber-600">
                <Wallet size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-gray-800 text-sm leading-tight">{expense.description}</h3>
                  <p className="text-amber-600 font-black text-sm">{formatNaira(expense.amount)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Calendar size={10} /> {new Date(expense.date).toLocaleDateString()}
                  </p>
                  {isAdmin && (
                    <button onClick={() => handleDeleteExpense(expense.id!)} className="text-red-200 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
             <Receipt className="mx-auto text-gray-200" size={48} />
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No expenses recorded</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800">Add Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddExpense} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description</label>
                <input required type="text" placeholder="e.g. Electricity, Rent, Fuel" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (₦)</label>
                <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-lg" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Date</label>
                <input required type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-amber-100 active:scale-95 transition-all uppercase tracking-widest text-xs">
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};