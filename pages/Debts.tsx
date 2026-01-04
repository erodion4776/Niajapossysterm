
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Debt } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Users, Plus, Search, MessageCircle, CheckCircle2, 
  Trash2, X, Wallet, Calendar, AlertCircle, Phone,
  CreditCard, ArrowRight, Loader2, BookOpen, TrendingDown,
  ShoppingCart
} from 'lucide-react';
import { Role } from '../types.ts';

interface DebtsProps {
  role: Role;
}

export const Debts: React.FC<DebtsProps> = ({ role }) => {
  const isAdmin = role === 'Admin';
  const debts = useLiveQuery(() => db.debts.orderBy('date').reverse().toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; debt: Debt | null; amount: string }>({
    isOpen: false,
    debt: null,
    amount: ''
  });
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    amount: 0,
    note: ''
  });

  const unpaidDebts = debts?.filter(d => d.status.toLowerCase() === 'unpaid' && d.remainingBalance > 0) || [];
  
  const filteredDebts = unpaidDebts.filter(d => 
    d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.customerPhone.includes(searchTerm)
  );

  const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + d.remainingBalance, 0);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Fix: Added required 'uuid', 'last_updated', and 'synced' properties to the manually recorded debt object
      await db.debts.add({
        uuid: crypto.randomUUID(),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        totalAmount: formData.amount,
        remainingBalance: formData.amount,
        items: formData.note || 'Direct entry',
        note: formData.note,
        date: Date.now(),
        status: 'Unpaid',
        last_updated: Date.now(),
        synced: 0
      });
      setFormData({ customerName: '', customerPhone: '', amount: 0, note: '' });
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to record debt: " + (err as Error).message);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModal.debt || !paymentModal.amount) return;
    const payAmt = Number(paymentModal.amount);
    if (isNaN(payAmt) || payAmt <= 0) return;

    const debt = paymentModal.debt;
    const newBalance = Math.max(0, debt.remainingBalance - payAmt);
    const newStatus = newBalance <= 0 ? 'Paid' : 'Unpaid';

    try {
      await db.debts.update(debt.id!, { 
        remainingBalance: newBalance,
        status: newStatus as any
      });
      setPaymentModal({ isOpen: false, debt: null, amount: '' });
    } catch (err) {
      alert("Failed to update debt");
    }
  };

  const handleDeleteDebt = async (id: string | number) => {
    if (!isAdmin) return;
    if (!confirm("Delete this debt record forever?")) return;
    await db.debts.delete(id);
  };

  const sendReminder = (debt: Debt) => {
    const shopName = localStorage.getItem('shop_name') || 'our shop';
    const message = `Hello ${debt.customerName}, this is a friendly reminder of your outstanding balance of ${formatNaira(debt.remainingBalance)} at ${shopName}. Please kindly make payment. Thank you!`;
    const encoded = encodeURIComponent(message);
    const phone = debt.customerPhone.replace(/\s+/g, '');
    const formattedPhone = phone.startsWith('0') ? '234' + phone.substring(1) : phone;
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Debt Book</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Money Outside</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Summary Widget */}
      <section className="bg-amber-600 text-white p-7 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-amber-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Money Outside</p>
          <h2 className="text-4xl font-black tracking-tighter">{formatNaira(totalUnpaid)}</h2>
          <div className="flex items-center gap-2 mt-4">
             <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
               <Users size={10}/> {unpaidDebts.length} Customers Owe
             </span>
          </div>
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
        {filteredDebts.length > 0 ? (
          filteredDebts.map(debt => (
            <div key={debt.id} className="bg-white dark:bg-emerald-900 p-5 rounded-[32px] border border-slate-100 dark:border-emerald-800 shadow-sm space-y-4 relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${debt.items.startsWith('POS Sale') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                    {debt.items.startsWith('POS Sale') ? <ShoppingCart size={24} /> : <BookOpen size={24} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 dark:text-emerald-50 text-lg leading-tight truncate uppercase">{debt.customerName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-1">
                      <Phone size={10}/> {debt.customerPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-red-600 dark:text-red-400 tracking-tighter">{formatNaira(debt.remainingBalance)}</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Owes {formatNaira(debt.totalAmount)}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-emerald-950/40 p-4 rounded-2xl space-y-1">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Items / Note</p>
                    {debt.items.startsWith('POS Sale') && <span className="text-[8px] font-black text-blue-500 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">POS Transaction</span>}
                 </div>
                 <p className="text-xs font-bold text-slate-600 dark:text-emerald-100">{debt.items}</p>
                 <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-emerald-800">
                    <Calendar size={10} className="text-slate-300" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(debt.date).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => sendReminder(debt)}
                  className="bg-emerald-50 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 transition-all active:scale-95"
                >
                  <MessageCircle size={16} /> WhatsApp
                </button>
                <button 
                  onClick={() => setPaymentModal({ isOpen: true, debt, amount: '' })}
                  className="bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  <CreditCard size={16} /> Pay Part
                </button>
              </div>
              
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteDebt(debt.id!)}
                  className="absolute top-4 right-4 p-2 text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-slate-50 dark:bg-emerald-900/20 rounded-[40px] border border-dashed border-slate-200 dark:border-emerald-800">
             <CheckCircle2 className="mx-auto text-emerald-300 opacity-50" size={64} />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No outstanding debts found</p>
          </div>
        )}
      </div>

      {/* Payment Entry Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border dark:border-emerald-800">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Record Payment</h2>
                <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20} /></button>
             </div>
             
             <div className="bg-emerald-50 dark:bg-emerald-950 p-4 rounded-2xl mb-6">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Customer Owe</p>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-50">{formatNaira(paymentModal.debt?.remainingBalance || 0)}</p>
             </div>

             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Amount Paid Today (₦)</label>
                   <input 
                      autoFocus
                      type="number" 
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-black text-xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Enter amount..."
                      value={paymentModal.amount}
                      onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                   />
                </div>
                <button 
                  onClick={handleRecordPayment}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  Update Balance <CheckCircle2 size={18} />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Manual Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border dark:border-emerald-800">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic">New Ledger Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddDebt} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Customer Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950 border dark:border-emerald-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold dark:text-emerald-50" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                <div className="relative">
                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                   <input required type="tel" placeholder="080..." className="w-full p-4 pl-12 bg-gray-50 dark:bg-emerald-950 border dark:border-emerald-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold dark:text-emerald-50" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Total Amount (₦)</label>
                <input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold text-lg text-emerald-600" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Note (Items taken)</label>
                <input type="text" placeholder="e.g. 2 bags of Rice, 1 Milo" className="w-full p-4 bg-gray-50 dark:bg-emerald-950 border dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">
                Record Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
