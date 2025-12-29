
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale, InventoryItem, User as DBUser, Customer, Debt } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, 
  MessageCircle, ChevronUp, Scan, Package, Image as ImageIcon, 
  Printer, Loader2, UserPlus, UserCheck, Wallet, Coins, ArrowRight,
  BookOpen, CreditCard, AlertCircle, Banknote, Landmark, CreditCard as CardIcon
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { connectBluetoothPrinter, isPrinterReady, sendRawToPrinter } from '../utils/bluetoothPrinter.ts';
import { formatReceipt } from '../utils/receiptFormatter.ts';

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
  
  // Checkout Configuration
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Transfer' | 'Card' | 'Debt'>('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [walletCreditApplied, setWalletCreditApplied] = useState(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [saveChangeToWallet, setSaveChangeToWallet] = useState(false);

  // Printing States
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('last_printer_name'));

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
    if (newCart.length === 0) {
      setIsCartExpanded(false);
      resetCheckoutState();
    }
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

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = paymentMode !== 'Debt' 
    ? Math.max(0, cartSubtotal - walletCreditApplied)
    : cartSubtotal;

  const changeDue = Math.max(0, Number(amountPaid || 0) - total);

  const resetCheckoutState = () => {
    setCustomerPhone('');
    setSelectedCustomer(null);
    setWalletCreditApplied(0);
    setAmountPaid('');
    setSaveChangeToWallet(false);
    setPaymentMode('Cash');
  };

  const togglePaymentMode = (mode: 'Cash' | 'Transfer' | 'Card' | 'Debt') => {
    setPaymentMode(mode);
    if (mode === 'Debt') {
      setWalletCreditApplied(0);
      setAmountPaid('');
      setSaveChangeToWallet(false);
    }
  };

  const handleLookupCustomer = async (explicitPhone?: string) => {
    const phoneToSearch = explicitPhone || customerPhone;
    if (!phoneToSearch) return;
    setIsSearchingCustomer(true);
    try {
      const customer = await db.customers.where('phone').equals(phoneToSearch).first();
      if (customer) {
        setSelectedCustomer(customer);
      } else if (!explicitPhone) {
        const name = prompt("New Customer! Enter their name:", "Walk-in Customer");
        if (name) {
          const id = await db.customers.add({
            name,
            phone: phoneToSearch,
            walletBalance: 0,
            lastTransaction: Date.now()
          });
          const newCust = await db.customers.get(id as number);
          if (newCust) setSelectedCustomer(newCust);
        }
      }
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  useEffect(() => {
    if (customerPhone.length === 11 && !selectedCustomer) {
      handleLookupCustomer(customerPhone);
    }
  }, [customerPhone]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    if (paymentMode === 'Debt') {
      if (!selectedCustomer) {
        alert("Select or search for a customer before recording a debt!");
        return;
      }
    }

    const sale: Sale = {
      uuid: crypto.randomUUID(),
      items: cart.map(({image, ...rest}) => rest), 
      total,
      totalCost: cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
      walletUsed: paymentMode !== 'Debt' ? walletCreditApplied : 0,
      walletSaved: paymentMode !== 'Debt' && saveChangeToWallet ? changeDue : 0,
      paymentMethod: paymentMode,
      timestamp: Date.now(),
      staff_id: String(user.id || user.role),
      staff_name: user.name || user.role,
      customer_phone: selectedCustomer?.phone
    };

    try {
      await db.transaction('rw', [db.inventory, db.sales, db.customers, db.debts, db.stock_logs], async () => {
        // 1. Inventory Logic
        for (const item of cart) {
          if (!item.id) continue;
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            const newStock = invItem.stock - item.quantity;
            await db.inventory.update(item.id, { stock: newStock });
            
            await db.stock_logs.add({
              item_id: item.id,
              itemName: invItem.name,
              quantityChanged: -item.quantity,
              previousStock: invItem.stock,
              newStock: newStock,
              type: 'Sales Deduction',
              date: Date.now(),
              staff_name: user.name || user.role
            });
          }
        }

        // 2. Customer Ledger
        if (selectedCustomer) {
          if (paymentMode === 'Debt') {
            const itemsSummary = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
            await db.debts.add({
              customerName: selectedCustomer.name,
              customerPhone: selectedCustomer.phone,
              totalAmount: total,
              remainingBalance: total,
              items: `POS Sale: ${itemsSummary}`,
              date: Date.now(),
              status: 'Unpaid'
            });
          } else {
            let newBalance = selectedCustomer.walletBalance - walletCreditApplied;
            if (saveChangeToWallet) newBalance += changeDue;
            await db.customers.update(selectedCustomer.id!, { 
              walletBalance: newBalance,
              lastTransaction: Date.now()
            });
          }
        }

        const saleId = await db.sales.add(sale);
        setLastSale({ ...sale, id: saleId as number });
      });

      setCart([]);
      setIsCartExpanded(false);
      setShowSuccessModal(true);
      resetCheckoutState();
    } catch (error: any) {
      alert('Checkout failed: ' + error.message);
    }
  };

  const handlePrint = async () => {
    if (!lastSale) return;
    setIsPrinting(true);
    try {
      if (!isPrinterReady()) {
        const name = await connectBluetoothPrinter();
        setPrinterName(name);
      }
      const bytes = formatReceipt(lastSale);
      await sendRawToPrinter(bytes);
    } catch (e: any) {
      alert("Printing failed: " + e.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 150 } }, 
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
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-emerald-950 relative transition-colors duration-300">
      <div className={`p-4 space-y-4 flex-1 overflow-auto transition-all ${cart.length > 0 ? 'pb-40' : 'pb-24'}`}>
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Quick POS</h1>
          <div className="flex items-center gap-3">
            <button onClick={startScanner} className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all">
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
            type="text" placeholder="Search catalog or barcode..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-900 dark:text-emerald-50"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} className="bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 text-left shadow-sm active:scale-95 transition-all flex flex-col overflow-hidden">
              <div className="h-24 w-full bg-slate-100 dark:bg-emerald-950/40 relative flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase">
                    {item.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-xs line-clamp-1">{item.name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm mt-0.5">{formatNaira(item.sellingPrice)}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 dark:border-emerald-800/20 flex justify-between items-center">
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-slate-50 dark:bg-emerald-950 text-slate-400">
                    {item.stock} left
                  </span>
                  <Plus size={12} className="text-emerald-600" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <button onClick={stopScanner} className="absolute top-8 right-8 bg-white/10 p-4 rounded-full text-white z-[210]"><X size={24} /></button>
          <div id={scannerContainerId} className="w-full max-w-sm aspect-square rounded-[48px] overflow-hidden border-4 border-emerald-500/30"></div>
        </div>
      )}

      {cart.length > 0 && (
        <>
          {isCartExpanded && <div className="fixed inset-0 bg-black/20 dark:bg-black/60 z-40" onClick={() => setIsCartExpanded(false)} />}
          <div className={`fixed bottom-16 inset-x-0 bg-white dark:bg-emerald-900 border-t-2 border-emerald-500 z-[45] flex flex-col rounded-t-[40px] transition-all duration-300 ${isCartExpanded ? 'max-h-[95vh] h-auto p-6' : 'max-h-24 p-4'}`}>
            <button onClick={() => setIsCartExpanded(!isCartExpanded)} className={`w-full flex flex-col items-center mb-2`}>
              <div className="w-12 h-1 bg-slate-200 dark:bg-emerald-800 rounded-full mb-3" />
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="text-emerald-600" />
                  {!isCartExpanded && <p className="text-lg font-black text-slate-800 dark:text-emerald-50">{formatNaira(total)}</p>}
                </div>
                {!isCartExpanded && <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase">Checkout <ChevronUp size={14} className="inline ml-1" /></div>}
              </div>
            </button>

            {isCartExpanded && (
              <div className="flex-1 overflow-y-auto space-y-6 pt-2 custom-scrollbar">
                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-emerald-950 p-1 rounded-2xl">
                  <button onClick={() => togglePaymentMode('Cash')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Cash' ? 'bg-white dark:bg-emerald-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                    <Banknote size={16} className="mb-1" /> Cash
                  </button>
                  <button onClick={() => togglePaymentMode('Transfer')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Transfer' ? 'bg-white dark:bg-emerald-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <Landmark size={16} className="mb-1" /> Transfer
                  </button>
                  <button onClick={() => togglePaymentMode('Card')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Card' ? 'bg-white dark:bg-emerald-800 text-purple-600 shadow-sm' : 'text-slate-400'}`}>
                    <CardIcon size={16} className="mb-1" /> POS Card
                  </button>
                  <button onClick={() => togglePaymentMode('Debt')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Debt' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>
                    <BookOpen size={16} className="mb-1" /> Debt
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="tel" placeholder="Customer Phone..." className="flex-1 px-4 py-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    <button onClick={() => handleLookupCustomer()} className="px-4 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 rounded-2xl active:scale-90 transition-all">{isSearchingCustomer ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}</button>
                  </div>
                  {selectedCustomer && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center animate-in zoom-in duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-black">{selectedCustomer.name.charAt(0)}</div>
                        <span className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase">{selectedCustomer.name}</span>
                      </div>
                      {paymentMode !== 'Debt' && selectedCustomer.walletBalance > 0 && walletCreditApplied === 0 && <button onClick={() => setWalletCreditApplied(Math.min(selectedCustomer.walletBalance, cartSubtotal))} className="text-[9px] font-black text-white bg-emerald-600 px-3 py-1.5 rounded-lg uppercase shadow-lg shadow-emerald-200">Use Wallet Credit (₦{selectedCustomer.walletBalance})</button>}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-bold text-slate-800 dark:text-emerald-50 text-sm truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{formatNaira(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white dark:bg-emerald-900 border rounded-xl overflow-hidden shadow-sm">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-2 text-slate-400 active:bg-slate-50"><Minus size={16}/></button>
                          <span className="font-black px-2 text-sm dark:text-emerald-50">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-2 text-slate-400 active:bg-slate-50"><Plus size={16}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                {paymentMode !== 'Debt' ? (
                  <div className="bg-slate-50 dark:bg-emerald-950/40 p-5 rounded-[32px] border border-slate-100 dark:border-emerald-800/20 space-y-4 shadow-inner">
                    <div className="flex justify-between text-xs font-black uppercase text-slate-400"><span>Grand Total</span><span className="text-slate-800 dark:text-emerald-50">{formatNaira(total)}</span></div>
                    {walletCreditApplied > 0 && <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-600"><span>Wallet Credit Applied</span><span>-{formatNaira(walletCreditApplied)}</span></div>}
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-600 uppercase ml-2 flex items-center gap-1"><Banknote size={10}/> Cash Received (₦)</label>
                      <input type="number" inputMode="decimal" placeholder="0.00" className="w-full p-4 bg-white dark:bg-emerald-900 border-2 border-emerald-100 rounded-2xl font-black text-2xl text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                    </div>
                    {changeDue > 0 && (
                      <div className="flex flex-col gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 rounded-2xl animate-in slide-in-from-top duration-300">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Change Due</span><span className="text-2xl font-black text-amber-700">{formatNaira(changeDue)}</span></div>
                        {selectedCustomer && <button onClick={() => setSaveChangeToWallet(!saveChangeToWallet)} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${saveChangeToWallet ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white text-emerald-600 border border-emerald-200'}`}>{saveChangeToWallet ? '✓ Saving Change to Wallet' : 'Save Change to Wallet'}</button>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[32px] border-2 border-dashed border-amber-300 text-center space-y-2 animate-in pulse duration-1000">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Credit Sales Amount</p>
                    <p className="text-4xl font-black text-amber-800 dark:text-emerald-50 tracking-tighter">{formatNaira(total)}</p>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Record this sale in Customer Ledger</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setIsCartExpanded(false)} className="bg-slate-100 dark:bg-emerald-800 text-slate-500 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Cancel</button>
                  <button onClick={handleCheckout} className={`font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all ${paymentMode === 'Debt' ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-600 text-white shadow-emerald-200'}`}>
                    {paymentMode === 'Debt' ? 'Record Debt' : 'Finish Sale'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-6 text-center shadow-2xl border dark:border-emerald-800 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${lastSale?.paymentMethod === 'Debt' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {lastSale?.paymentMethod === 'Debt' ? <BookOpen size={40} /> : <CheckCircle size={40} />}
            </div>
            <h2 className="text-2xl font-black mb-1 text-slate-800 dark:text-emerald-50 tracking-tight">{lastSale?.paymentMethod === 'Debt' ? 'Debt Recorded!' : 'Sale Successful!'}</h2>
            <div className="bg-slate-50 dark:bg-emerald-950/40 rounded-2xl p-5 text-left border border-slate-200 mb-6 space-y-2">
              <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase"><span>Total Amount</span><span>{formatNaira(lastSale?.total || 0)}</span></div>
              <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase"><span>Method</span><span className="font-black text-slate-800 dark:text-emerald-50 uppercase tracking-widest">{lastSale?.paymentMethod || 'CASH'}</span></div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={handlePrint} disabled={isPrinting} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-xl text-xs uppercase tracking-widest">
                {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />} {isPrinting ? 'Printing...' : '🖨️ Print Receipt'}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => lastSale && shareReceiptToWhatsApp(lastSale)} className="w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100 text-[10px] uppercase tracking-widest active:scale-95 transition-all"><MessageCircle size={18} /> WhatsApp</button>
                <button onClick={() => setShowSuccessModal(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-slate-50 dark:bg-emerald-800 rounded-2xl active:scale-95 transition-all">Next Sale</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
