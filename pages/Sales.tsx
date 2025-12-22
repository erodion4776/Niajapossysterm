
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { 
  History, Search, Calendar, Trash2, 
  X, FileText, Smartphone, Receipt, RefreshCw
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
    
    // If filtering by date, we'll process the full array. 
    // For very large datasets, a native Dexie where clause would be better.
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

  const filteredSales = sales?.filter(sale => {
    const matchesSearch = 
      String(sale.id).includes(searchTerm) || 
      sale.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  }) || [];

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin) return;
    if (!confirm(`⚠️ CRITICAL: Deleting this sale will ADD ${sale.items.reduce((sum, i) => sum + i.quantity, 0)} items back to your inventory stock. Proceed?`)) return;

    try {
      await db.transaction('rw', [db.inventory, db.sales], async () => {
        // 1. Restore Stock
        for (const item of sale.items) {
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            await db.inventory.update(item.id, { 
              stock: invItem.stock + item.quantity 
            });
          }
        }
        // 2. Delete Record
        await db.sales.delete(sale.id!);
      });
      setSelectedSale(null);
      alert('Sale deleted and stock restored successfully.');
    } catch (err) {
      alert('Failed to delete sale: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">History</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Transaction Records</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
          <History size={24} />
        </div>
      </header>

      {/* Search & Date Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search ID or Item Name..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <input 
              type="date"
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold uppercase text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className="px-4 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.map(sale => (
          <button 
            key={sale.id}
            onClick={() => setSelectedSale(sale)}
            className="w-full bg-white p-4 rounded-[28px] border border-gray-50 text-left flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <Receipt size={24}/>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-gray-800">#{String(sale.id).slice(-4)}</h3>
                <span className="text-emerald-600 font-black">{formatNaira(sale.total)}</span>
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {sale.items.map((item, idx) => (
                  <span key={idx} className="bg-gray-50 text-gray-400 text-[8px] font-bold px-2 py-0.5 rounded-md border border-gray-100 uppercase">
                    {item.name} x{item.quantity}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}

        {filteredSales.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <FileText size={32} />
            </div>
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
              {filterDate ? `No transactions on ${new Date(filterDate).toLocaleDateString()}` : "No transactions found"}
            </p>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800">Sale Details</h2>
              <button onClick={() => setSelectedSale(null)} className="p-2 bg-gray-50 text-gray-400 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Receipt Visual */}
              <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 font-mono text-xs text-gray-600 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-20"></div>
                <div className="flex justify-between mb-4">
                  <span className="font-bold">TRANS ID: #{selectedSale.id}</span>
                  <span>{new Date(selectedSale.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 my-3"></div>
                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{formatNaira(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-gray-300 my-3"></div>
                <div className="flex justify-between text-lg font-black text-gray-800">
                  <span>TOTAL</span>
                  <span>{formatNaira(selectedSale.total)}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 text-center opacity-50 uppercase text-[8px] font-bold">
                  Sold by: {selectedSale.staff_name}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => shareReceiptToWhatsApp(selectedSale)}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-emerald-50 text-xs uppercase tracking-widest"
                >
                  <Smartphone size={18} /> Share Receipt
                </button>
                
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteSale(selectedSale)}
                    className="w-full bg-red-50 text-red-500 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-red-100"
                  >
                    <Trash2 size={16} /> Delete Transaction
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
