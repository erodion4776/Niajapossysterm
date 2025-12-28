
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale, InventoryItem, User as DBUser } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, MessageCircle, ChevronUp, Scan, Package, Image as ImageIcon, Printer, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { connectToPrinter, isPrinterConnected, sendToPrinter } from '../utils/bluetoothManager.ts';
import { generateReceiptBytes } from '../utils/receiptGenerator.ts';

interface POSProps {
  user: DBUser;
}

export const POS: React.FC<POSProps> = ({ user }) => {
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<(SaleItem & { image?: string })[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  
  // Printing States
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('connected_printer_name'));

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "reader";

  const filteredItems = inventory?.filter(item => 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (item.barcode && item.barcode.includes(searchTerm))) && 
    item.stock > 0
  ) || [];

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: item.id!, 
        name: item.name, 
        price: item.sellingPrice, 
        costPrice: item.costPrice, 
        quantity: 1,
        image: item.image
      }];
    });
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

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const sale: Sale = {
      uuid: generateUUID(),
      items: cart.map(({image, ...rest}) => rest), 
      total,
      totalCost,
      timestamp: Date.now(),
      staff_id: String(user.id || user.role),
      staff_name: user.name || user.role
    };

    try {
      await db.transaction('rw', [db.inventory, db.sales], async () => {
        for (const item of cart) {
          if (!item.id) continue;
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
      setPrintSuccess(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('Checkout failed: ' + (error.message || 'Unknown database error'));
    }
  };

  const handlePrint = async () => {
    if (!lastSale) return;

    setIsPrinting(true);
    try {
      // 1. Connect if not connected
      if (!isPrinterConnected()) {
        const name = await connectToPrinter();
        setPrinterName(name);
      }

      // 2. Generate Bytes
      const bytes = generateReceiptBytes(lastSale);

      // 3. Send to Printer
      await sendToPrinter(bytes);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert("Printing failed: " + e.message);
      setPrinterName(localStorage.getItem('connected_printer_name')); // Reset status
    } finally {
      setIsPrinting(false);
    }
  };

  // Scanner Logic
  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          async (decodedText) => {
            const item = await db.inventory.where('barcode').equals(decodedText).first();
            if (item) {
              addToCart(item);
              if (navigator.vibrate) navigator.vibrate(50);
            }
          },
          () => {}
        );
      } catch (err) {
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (e) {
        console.error("Error stopping scanner", e);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-emerald-950 relative transition-colors duration-300">
      <div className={`p-4 space-y-4 flex-1 overflow-auto transition-all ${cart.length > 0 ? 'pb-40' : 'pb-24'}`}>
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Quick POS</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={startScanner}
              className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 active:scale-90 transition-all"
            >
              <Scan size={20} />
            </button>
            <div className="bg-slate-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${user.role === 'Admin' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-emerald-400 uppercase truncate max-w-[80px]">{user.name || user.role}</span>
            </div>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search catalog or barcode..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-medium text-slate-900 dark:text-emerald-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Visual Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.map(item => (
            <button 
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 text-left shadow-sm active:scale-95 transition-all group flex flex-col overflow-hidden"
            >
              <div className="h-24 w-full bg-slate-100 dark:bg-emerald-950/40 relative flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase">
                    {item.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-xs line-clamp-1 leading-snug group-active:text-emerald-700 dark:group-active:text-emerald-400">
                    {item.name}
                  </h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm mt-0.5">{formatNaira(item.sellingPrice)}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 dark:border-emerald-800/20 flex justify-between items-center">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${item.stock <= (item.minStock || 5) ? 'bg-orange-100 text-orange-600' : 'text-slate-400 dark:text-emerald-500/40 bg-slate-50 dark:bg-emerald-950/40'}`}>
                    {item.stock} left
                  </span>
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1 rounded-lg">
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-20">
              <div className="bg-slate-100 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-emerald-800">
                <Search size={32} />
              </div>
              <p className="text-slate-400 dark:text-emerald-700 font-bold uppercase text-xs">No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <button onClick={stopScanner} className="absolute top-8 right-8 bg-white/10 p-4 rounded-full text-white backdrop-blur-md z-[210] active:scale-95"><X size={24} /></button>
          <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Scanning...</h2>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Place product barcode inside frame</p>
            </div>
            <div className="w-full aspect-square relative rounded-[48px] overflow-hidden border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(5,150,105,0.2)]">
              <div id={scannerContainerId} className="w-full h-full"></div>
              <div className="absolute inset-0 border-2 border-white/20 rounded-[44px] pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 border-2 border-emerald-400 rounded-2xl pointer-events-none animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Bottom Sheet */}
      {cart.length > 0 && (
        <>
          {isCartExpanded && <div className="fixed inset-0 bg-black/20 dark:bg-black/60 z-40 transition-opacity" onClick={() => setIsCartExpanded(false)} />}
          <div className={`fixed bottom-16 inset-x-0 bg-white dark:bg-emerald-900 border-t-2 border-emerald-500 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.1)] z-[45] flex flex-col rounded-t-[40px] transition-all duration-300 ease-out ${isCartExpanded ? 'max-h-[85vh] h-auto p-6' : 'max-h-24 p-4'}`}>
            <button onClick={() => setIsCartExpanded(!isCartExpanded)} className={`w-full flex flex-col items-center justify-center transition-all ${isCartExpanded ? 'mb-4' : ''}`}>
              <div className="w-12 h-1 bg-slate-200 dark:bg-emerald-800 rounded-full mb-3" />
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 relative">
                    <ShoppingCart size={20} />
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">{cart.length}</span>
                  </div>
                  {!isCartExpanded && (
                    <div className="text-left">
                      <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-black uppercase tracking-widest">In Cart</p>
                      <p className="text-lg font-black text-slate-800 dark:text-emerald-50 leading-none">{formatNaira(total)}</p>
                    </div>
                  )}
                </div>
                {!isCartExpanded ? (
                  <div className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">View Cart <ChevronUp size={14} /></div>
                ) : (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase tracking-widest">Grand Total</p>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatNaira(total)}</span>
                  </div>
                )}
              </div>
            </button>

            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${isCartExpanded ? 'flex-1 opacity-100' : 'h-0 opacity-0 pointer-events-none'}`}>
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-emerald-900 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs font-black text-emerald-600 uppercase">{item.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-slate-800 dark:text-emerald-50 text-sm leading-tight truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-emerald-500/40 font-bold mt-0.5">{formatNaira(item.price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800/20 rounded-xl overflow-hidden shadow-sm">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-800 text-slate-400 transition-colors"><Minus size={16}/></button>
                        <span className="font-black px-2 text-center text-sm min-w-[24px] dark:text-emerald-50">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-800 text-slate-400 transition-colors"><Plus size={16}/></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsCartExpanded(false)} className="bg-slate-100 dark:bg-emerald-800 text-slate-500 dark:text-emerald-300 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Back</button>
                <button onClick={handleCheckout} className="bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">Confirm Pay <CheckCircle size={16} /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-6 text-center animate-in zoom-in duration-300 shadow-2xl my-auto border dark:border-emerald-800">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black mb-1 text-slate-800 dark:text-emerald-50 tracking-tight">Sale Successful!</h2>
            <div className="bg-slate-50 dark:bg-emerald-950/40 rounded-2xl p-4 text-left border border-slate-200 dark:border-emerald-800/40 mb-6 font-mono text-xs relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-[10px] uppercase">{localStorage.getItem('shop_name') || 'NaijaShop'}</h3>
                <span className="text-[8px] opacity-60">#{ (lastSale?.id || 0).toString().padStart(5, '0') }</span>
              </div>
              <div className="border-t border-dashed border-slate-300 dark:border-emerald-800/40 my-2"></div>
              {lastSale?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-slate-800 dark:text-emerald-50">
                  <span className="truncate">{item.name} x{item.quantity}</span>
                  <span>{formatNaira(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-slate-300 dark:border-emerald-800/40 my-2"></div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-emerald-50 text-sm">
                <span>TOTAL</span>
                <span>{formatNaira(lastSale?.total || 0)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => lastSale && shareReceiptToWhatsApp(lastSale)} 
                  className="w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-sm border border-emerald-100 text-[10px] uppercase tracking-widest"
                >
                  <MessageCircle size={18} /> WhatsApp
                </button>
                <button 
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className={`w-full ${printSuccess ? 'bg-blue-600' : 'bg-blue-500'} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-200 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50`}
                >
                  {isPrinting ? <Loader2 size={18} className="animate-spin" /> : printSuccess ? <CheckCircle size={18} /> : <Printer size={18} />}
                  {isPrinting ? 'Printing...' : !printerName ? 'Setup Printer' : printSuccess ? 'Printed!' : 'Print Receipt'}
                </button>
              </div>
              <button onClick={() => setShowSuccessModal(false)} className="w-full py-3 text-slate-400 dark:text-emerald-500/40 font-bold uppercase text-[10px] tracking-widest">Close Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
