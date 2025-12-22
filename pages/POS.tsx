import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, MessageCircle, FileText } from 'lucide-react';
import { Role } from '../types.ts';

interface POSProps {
  role: Role;
}

export const POS: React.FC<POSProps> = ({ role }) => {
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const filteredItems = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) && item.stock > 0
  ) || [];

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.sellingPrice, 
        costPrice: item.costPrice, 
        quantity: 1 
      }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCost = cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const sale: Sale = {
      items: [...cart],
      total,
      totalCost,
      timestamp: Date.now(),
      staff_id: role,
      staff_name: role // Audit trail
    };

    try {
      await db.transaction('rw', [db.inventory, db.sales], async () => {
        for (const item of cart) {
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            if (invItem.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${invItem.name}`);
            }
            await db.inventory.update(item.id, { stock: invItem.stock - item.quantity });
          }
        }
        const saleId = await db.sales.add(sale);
        setLastSale({ ...sale, id: saleId as number });
      });

      setCart([]);
      setShowSuccessModal(true);
    } catch (error: any) {
      alert('Checkout failed: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc]">
      <div className="p-4 space-y-4 flex-1 overflow-auto pb-64">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Quick POS</h1>
          <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${role === 'Admin' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
            <span className="text-[10px] font-bold text-gray-500 uppercase">{role}</span>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search catalog..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <button 
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white p-4 rounded-3xl border border-gray-50 text-left shadow-sm active:scale-95 active:bg-emerald-50 transition-all group"
            >
              <h3 className="font-bold text-gray-800 line-clamp-2 leading-snug group-active:text-emerald-700">{item.name}</h3>
              <p className="text-emerald-600 font-black mt-2 text-lg">{formatNaira(item.sellingPrice)}</p>
              <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Qty: {item.stock}</span>
                <div className="bg-emerald-100 text-emerald-600 p-1 rounded-lg">
                  <Plus size={14} />
                </div>
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-2 text-center py-20">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <Search size={32} />
              </div>
              <p className="text-gray-400 font-bold uppercase text-xs">No items found</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-16 inset-x-0 bg-white border-t-2 border-emerald-500 p-5 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.1)] z-40 max-h-[60vh] flex flex-col rounded-t-[40px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black flex items-center gap-2 text-gray-800">
            <ShoppingCart className="text-emerald-600" /> 
            Checkout
          </h2>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Pay</p>
            <span className="text-2xl font-black text-emerald-600 tracking-tighter">{formatNaira(total)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-3">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm leading-tight">{item.name}</h4>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">{formatNaira(item.price)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-emerald-50 text-gray-400 transition-colors"><Minus size={16}/></button>
                    <span className="font-black px-2 text-center text-sm min-w-[24px]">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-emerald-50 text-gray-400 transition-colors"><Plus size={16}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={20}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:shadow-none uppercase tracking-widest flex items-center justify-center gap-2"
        >
          Confirm Payment <CheckCircle size={20} />
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-6 text-center animate-bounce-in shadow-2xl my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black mb-1 text-gray-800 tracking-tight">Sale Successful!</h2>
            <p className="text-gray-400 text-sm font-medium mb-6">Stock updated and recorded.</p>
            
            {/* Receipt Visual Preview */}
            <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-200 mb-6 font-mono text-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-20"></div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-[10px] uppercase">
                    {localStorage.getItem('shop_name') || 'NaijaShop'}
                  </h3>
                  <p className="text-gray-400 text-[8px]">{localStorage.getItem('shop_info') || 'Nigeria'}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-[8px]">{new Date(lastSale?.timestamp || 0).toLocaleDateString()}</p>
                  <p className="text-gray-400 text-[8px]">#{(lastSale?.id || 0).toString().padStart(5, '0')}</p>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="space-y-1">
                {lastSale?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate">{item.name} x{item.quantity}</span>
                    <span className="flex-shrink-0">{formatNaira(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between font-bold text-gray-800 text-sm">
                <span>TOTAL</span>
                <span>{formatNaira(lastSale?.total || 0)}</span>
              </div>
              <div className="mt-2 text-center text-gray-400 text-[8px] uppercase tracking-widest">
                Patronage Received!
              </div>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => lastSale && shareReceiptToWhatsApp(lastSale)}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-emerald-100"
              >
                <MessageCircle size={20} /> Share via WhatsApp
              </button>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
