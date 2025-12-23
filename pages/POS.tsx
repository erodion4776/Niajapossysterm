
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [isCartExpanded, setIsCartExpanded] = useState(false);

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
    // Auto-expand on first item if desired, but here we keep it collapsed to not block view
  };

  const removeFromCart = (id: string | number) => {
    const newCart = cart.filter(i => i.id !== id);
    setCart(newCart);
    if (newCart.length === 0) setIsCartExpanded(false);
  };

  const updateQuantity = (id: string | number, delta: number) => {
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
      staff_name: role 
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
      setIsCartExpanded(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      alert('Checkout failed: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] relative">
      <div className={`p-4 space-y-4 flex-1 overflow-auto transition-all ${cart.length > 0 ? 'pb-40' : 'pb-24'}`}>
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

      {/* Expandable Bottom Sheet */}
      {cart.length > 0 && (
        <>
          {/* Overlay to dim background when expanded */}
          {isCartExpanded && (
            <div 
              className="fixed inset-0 bg-black/20 z-40 transition-opacity" 
              onClick={() => setIsCartExpanded(false)}
            />
          )}
          
          <div 
            className={`fixed bottom-16 inset-x-0 bg-white border-t-2 border-emerald-500 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.1)] z-[45] flex flex-col rounded-t-[40px] transition-all duration-300 ease-out ${isCartExpanded ? 'max-h-[85vh] h-auto p-6' : 'max-h-24 p-4'}`}
          >
            {/* Summary / Handle Bar */}
            <button 
              onClick={() => setIsCartExpanded(!isCartExpanded)}
              className={`w-full flex flex-col items-center justify-center transition-all ${isCartExpanded ? 'mb-4' : ''}`}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mb-3" />
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 relative">
                    <ShoppingCart size={20} />
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">{cart.length}</span>
                  </div>
                  {!isCartExpanded && (
                    <div className="text-left">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">In Cart</p>
                      <p className="text-lg font-black text-gray-800 leading-none">{formatNaira(total)}</p>
                    </div>
                  )}
                </div>
                {!isCartExpanded ? (
                  <div className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100">
                    View Cart <ChevronUp size={14} />
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Grand Total</p>
                    <span className="text-2xl font-black text-emerald-600 tracking-tighter">{formatNaira(total)}</span>
                  </div>
                )}
              </div>
            </button>

            {/* Expanded Content */}
            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${isCartExpanded ? 'flex-1 opacity-100' : 'h-0 opacity-0 pointer-events-none'}`}>
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
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
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsCartExpanded(false)}
                  className="bg-gray-100 text-gray-500 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                >
                  Continue Shopping
                </button>
                <button 
                  onClick={handleCheckout}
                  className="bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  Confirm Pay <CheckCircle size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-6 text-center animate-in zoom-in duration-300 shadow-2xl my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black mb-1 text-gray-800 tracking-tight">Sale Successful!</h2>
            <p className="text-gray-400 text-sm font-medium mb-6">Stock updated and recorded.</p>
            
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
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => lastSale && shareReceiptToWhatsApp(lastSale)}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-lg"
              >
                <MessageCircle size={20} /> Share via WhatsApp
              </button>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 text-gray-400 font-bold uppercase text-[10px] tracking-widest"
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
