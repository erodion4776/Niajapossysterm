
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp, exportStaffSalesReport } from '../utils/whatsapp.ts';
import { 
  History, Search, Calendar, Trash2, X, Receipt, RefreshCw, 
  MessageCircle, Printer, Loader2, ChevronRight
} from 'lucide-react';
import { Role } from '../types.ts';

interface SalesProps {
  role: Role;
}

export const Sales: React.FC<SalesProps> = ({ role }) => {
  const isAdmin = role === 'Admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const sales = useLiveQuery(() => db.sales.orderBy('timestamp').reverse().toArray());

  const filteredSales = useMemo(() => {
    return sales?.filter(sale => 
      String(sale.id).includes(searchTerm) || 
      sale.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];
  }, [sales, searchTerm]);

  const handleVoidSale = async (sale: Sale) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Admin can void transactions.");
      return;
    }

    if (!confirm("Are you sure you want to VOID this sale? Stock will be returned and money removed from reports.")) return;

    try {
      await db.transaction('rw', [db.inventory, db.sales, db.debts, db.stock_logs], async () => {
        for (const item of sale.items) {
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            const newStock = Number(invItem.stock) + Number(item.quantity);
            await db.inventory.update(invItem.id!, { stock: newStock });
            await db.stock_logs.add({
              item_id: Number(invItem.id),
              itemName: invItem.name,
              quantityChanged: item.quantity,
              previousStock: invItem.stock,
              newStock: newStock,
              type: 'Addition',
              date: Date.now(),
              staff_name: "VOID RECOVERY"
            });
          }
        }
        if (sale.uuid) await db.debts.where('sale_uuid').equals(sale.uuid).delete();
        await db.sales.delete(sale.id!);
      });
      setSelectedSale(null);
      alert("Sale Voided!");
    } catch (err) {
      alert("Error voiding sale.");
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Sales history</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Master Ledger</p>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          type="text" placeholder="Search ID or item..."
          className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-[24px] outline-none text-slate-900 dark:text-emerald-50 font-medium"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredSales.map(sale => (
          <button key={sale.id} onClick={() => setSelectedSale(sale)} className="w-full bg-white dark:bg-emerald-900/40 p-5 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 text-left flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-emerald-950/40 text-gray-400"><Receipt size={24}/></div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-slate-800 dark:text-emerald-50 text-lg">#{String(sale.id).slice(-4)}</h3>
                {isAdmin && <span className="text-emerald-600 font-black text-lg">{formatNaira(sale.total)}</span>}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {new Date(sale.timestamp).toLocaleString([], {dateStyle:'short', timeStyle:'short'})}
              </p>
            </div>
          </button>
        ))}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Details</h2>
              <button onClick={() => setSelectedSale(null)} className="p-2 bg-gray-100 dark:bg-emerald-800 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-emerald-950/40 p-6 rounded-[32px] font-mono text-xs space-y-2">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>{isAdmin ? formatNaira(item.price * item.quantity) : '***'}</span></div>
                ))}
                {isAdmin && <div className="border-t border-dashed border-slate-200 mt-2 pt-2 flex justify-between font-black text-sm"><span>TOTAL</span><span>{formatNaira(selectedSale.total)}</span></div>}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => shareReceiptToWhatsApp(selectedSale)} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"><MessageCircle size={18}/> WhatsApp Receipt</button>
                {isAdmin && (
                  <button onClick={() => handleVoidSale(selectedSale)} className="w-full bg-red-50 text-red-500 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"><Trash2 size={16}/> Void Transaction</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
