
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
// Added MessageCircle to the imports below
import { 
  History, Search, Calendar, Trash2, 
  X, FileText, Smartphone, Receipt, RefreshCw,
  TrendingUp, CreditCard, User, ArrowRight, MessageCircle
} from 'lucide-react';
import { Role } from '../types.ts';

interface SalesProps {
  role: Role;
}

export const Sales: React.FC<SalesProps> = ({ role }) => {
  const isAdmin = role === 'Admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const sales = useLiveQuery(async () => {
    let query = db.sales.orderBy('timestamp').reverse();
    const results = await query.toArray();
    
    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterDate);
      end.setHours(23, 59, 59, 999);
      return results.filter(s => s.timestamp >= start.getTime() && s.timestamp <= end.getTime());
    }
    
    return results;
  }, [filterDate]);

  const filteredSales = useMemo(() => {
    return sales?.filter(sale => {
      const matchesSearch = 
        String(sale.id).includes(searchTerm) || 
        sale.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sale.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }) || [];
  }, [sales, searchTerm]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  }, [filteredSales]);

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin) return;
    if (!confirm(`⚠️ CRITICAL: Deleting this sale will ADD ${sale.items.reduce((sum, i) => sum + i.quantity, 0)} items back to your inventory stock. Proceed?`)) return;

    try {
      await db.transaction('rw', [db.inventory, db.sales], async () => {
        for (const item of sale.items) {
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            await db.inventory.update(item.id, { 
              stock: invItem.stock + item.quantity 
            });
          }
        }
        await db.sales.delete(sale.id!);
      });
      setSelectedSale(null);
    } catch (err) {
      alert('Failed to delete sale: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Sales History</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Transaction Records</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 border border-emerald-100 shadow-sm">
          <History size={24} />
        </div>
      </header>

      {/* Dynamic Summary Card */}
      <section className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {filterDate ? `Revenue for ${new Date(filterDate).toLocaleDateString()}` : "Total Filtered Revenue"}
          </p>
          <h2 className="text-4xl font-black tracking-tighter">{formatNaira(totalRevenue)}</h2>
          <div className="flex items-center gap-2 mt-4">
             <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
               <Receipt size={10}/> {filteredSales.length} Transactions
             </span>
          </div>
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 opacity-10" size={140} />
      </section>

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Search by ID, item, or staff..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <input 
              type="date"
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold uppercase text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className="px-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 transition-colors active:scale-95"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* List Feed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
           <History className="text-gray-300" size={16} />
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</h3>
        </div>

        {filteredSales.length > 0 ? (
          filteredSales.map(sale => (
            <button 
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="w-full bg-white p-5 rounded-[32px] border border-gray-50 text-left flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all group"
            >
              <div className="p-4 rounded-2xl bg-gray-50 text-gray-400 group-active:bg-emerald-50 group-active:text-emerald-500 transition-colors">
                <Receipt size={24}/>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-gray-800 text-lg">#{String(sale.id).slice(-4)}</h3>
                  <span className="text-emerald-600 font-black text-lg tracking-tighter">{formatNaira(sale.total)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                    {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {sale.items.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="bg-gray-50 text-gray-400 text-[8px] font-black px-2 py-1 rounded-lg border border-gray-100 uppercase">
                      {item.name}
                    </span>
                  ))}
                  {sale.items.length > 3 && (
                    <span className="bg-gray-50 text-gray-400 text-[8px] font-black px-2 py-1 rounded-lg border border-gray-100 uppercase">
                      +{sale.items.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="py-24 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
            <FileText className="mx-auto text-gray-200" size={48} />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">
              No transactions found<br/>Adjust filters or start selling
            </p>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800">Sale Details</h2>
              <button onClick={() => setSelectedSale(null)} className="p-3 bg-gray-100 text-gray-400 rounded-full hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Professional Receipt Mock */}
              <div className="bg-white border-2 border-gray-100 rounded-[32px] p-6 font-mono text-xs text-gray-600 relative shadow-inner">
                <div className="text-center mb-6">
                   <h3 className="font-black text-gray-900 text-sm uppercase mb-1">
                     {localStorage.getItem('shop_name') || 'NaijaShop POS'}
                   </h3>
                   <p className="text-[10px] opacity-60">{localStorage.getItem('shop_info') || 'Nigeria'}</p>
                </div>
                
                <div className="flex justify-between text-[10px] mb-4">
                  <span className="font-bold uppercase tracking-widest">ID: #{selectedSale.id}</span>
                  <span>{new Date(selectedSale.timestamp).toLocaleDateString()}</span>
                </div>
                
                <div className="border-t border-dashed border-gray-200 my-4"></div>
                
                <div className="space-y-3">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <span className="flex-1 leading-tight">{item.name} <br/><span className="opacity-40">{item.quantity} x {formatNaira(item.price)}</span></span>
                      <span className="font-bold text-gray-800">{formatNaira(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t-2 border-dashed border-gray-200 my-4"></div>
                
                <div className="flex justify-between text-xl font-black text-gray-900 tracking-tighter">
                  <span>TOTAL</span>
                  <span>{formatNaira(selectedSale.total)}</span>
                </div>
                
                <div className="mt-8 flex flex-col items-center gap-1 opacity-40">
                  <div className="flex items-center gap-2">
                    <User size={10} />
                    <p className="uppercase text-[8px] font-bold">Served by {selectedSale.staff_name}</p>
                  </div>
                  <p className="uppercase text-[7px] font-bold">Powering local businesses 🇳🇬</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => shareReceiptToWhatsApp(selectedSale)}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-emerald-100 text-[10px] uppercase tracking-widest"
                >
                  <MessageCircle size={20} /> Send Receipt to WhatsApp
                </button>
                
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteSale(selectedSale)}
                    className="w-full bg-red-50 text-red-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-red-100"
                  >
                    <Trash2 size={16} /> Void Transaction
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
