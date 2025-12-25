
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Debt } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Users, Plus, Search, MessageCircle, CheckCircle2, 
  Trash2, X, Wallet, Calendar, AlertCircle, Phone
} from 'lucide-react';
import { Role } from '../types.ts';

interface DebtsProps {
  role: Role;
}

export const Debts: React.FC<DebtsProps> = ({ role }) => {
  const isAdmin = role === 'Admin';
  const debts = useLiveQuery(() => db.debts.orderBy('timestamp').reverse().toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    amount: 0,
    note: ''
  });

  const unpaidDebts = debts?.filter(d => d.status === 'Unpaid') || [];
  const paidDebts = debts?.filter(d => d.status === 'Paid') || [];
  
  const filteredDebts = unpaidDebts.filter(d => 
    d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.customerPhone.includes(searchTerm)
  );

  const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.debts.add({
        ...formData,
        timestamp: Date.now(),
        status: 'Unpaid'
      });
      setFormData({ customerName: '', customerPhone: '', amount: 0, note: '' });
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to record debt: " + (err as Error).message);
    }
  };

  const handleMarkAsPaid = async (debt: Debt) => {
    if (!confirm(`Mark ₦${debt.amount} from ${debt.customerName} as paid?`)) return;
    try {
      await db.debts.update(debt.id!, { status: 'Paid' });
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteDebt = async (id: string | number) => {
    if (!isAdmin) return;
    if (!confirm("Delete this debt record forever?")) return;
    await db.debts.delete(id);
  };

  const sendReminder = (debt: Debt) => {
    const shopName = localStorage.getItem('shop_name') || 'our shop';
    const message = `Hello ${debt.customerName}, this is a friendly reminder of your outstanding balance of ${formatNaira(debt.amount)} at ${shopName}. Please kindly clear your debt when you can. Thank you!`;
    const encoded = encodeURIComponent(message);
    const phone = debt.customerPhone.startsWith('0') ? '234' + debt.customerPhone.substring(1) : debt.customerPhone;
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Debt Book</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Customer Credit Tracker</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-200 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Debt Summary Card */}
      <section className="bg-emerald-950 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Total Unpaid Credit</p>
          <h2 className="text-4xl font-black tracking-tighter">{formatNaira(totalUnpaid)}</h2>
          <div className="flex items-center gap-2 mt-4">
             <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
               <Users size={10}/> {unpaidDebts.length} Customers
             </span>
          </div>
        </div>
        <Wallet className="absolute -right-4 -bottom-4 opacity-10" size={140} />
      </section>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input 
          type="text" 
          placeholder="Search customer name..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
           <AlertCircle className="text-amber-500" size={16} />
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Debts</h3>
        </div>

        {filteredDebts.length > 0 ? (
          filteredDebts.map(debt => (
            <div key={debt.id} className="bg-white p-5 rounded-[32px] border border-gray-50 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-lg leading-tight">{debt.customerName}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mt-1">
                      <Calendar size={10}/> {new Date(debt.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-600 tracking-tighter">{formatNaira(debt.amount)}</p>
                </div>
              </div>

              {debt.note && (
                <p className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl italic">"{debt.note}"</p>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => sendReminder(debt)}
                  className="flex-1 bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-emerald-100 active:scale-95 transition-all"
                >
                  <MessageCircle size={16} /> Remind via WhatsApp
                </button>
                <button 
                  onClick={() => handleMarkAsPaid(debt)}
                  className="flex-shrink-0 bg-emerald-600 text-white p-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-100"
                >
                  <CheckCircle2 size={20} />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteDebt(debt.id!)}
                    className="flex-shrink-0 bg-red-50 text-red-400 p-4 rounded-2xl active:scale-95 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
             <CheckCircle2 className="mx-auto text-emerald-300" size={48} />
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No outstanding debts found</p>
          </div>
        )}
      </div>

      {/* Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800">New Credit Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddDebt} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Customer Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                <div className="relative">
                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                   <input required type="tel" placeholder="080..." className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (₦)</label>
                <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-lg" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Note (Optional)</label>
                <input type="text" placeholder="Items taken or partial payment info" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs">
                Save Credit Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
