
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale, InventoryItem, User as DBUser, Customer, Debt, Category, ParkedOrder } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, 
  MessageCircle, ChevronUp, Scan, Package, Image as ImageIcon, 
  Printer, Loader2, UserPlus, UserCheck, Wallet, Coins, ArrowRight,
  BookOpen, CreditCard, AlertCircle, Banknote, Landmark, CreditCard as CardIcon,
  ShieldCheck, HelpCircle, ChevronLeft, Tag, Phone, Info, Pause, Play, Clock, RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { connectBluetoothPrinter, isPrinterReady, sendRawToPrinter } from '../utils/bluetoothPrinter.ts';
import { formatReceipt } from '../utils/receiptFormatter.ts';
import { SoftPOSTerminal } from '../components/SoftPOSTerminal.tsx';

interface POSProps {
  user: DBUser;
  setNavHidden?: (hidden: boolean) => void;
}

export const POS: React.FC<POSProps> = ({ user, setNavHidden }) => {
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const parkedOrders = useLiveQuery(() => db.parked_orders.where('staff_id').equals(String(user.id || user.role)).reverse().toArray());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<(SaleItem & { image?: string })[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  
  // Last Sync Status
  const lastSyncTs = localStorage.getItem('last_inventory_sync');
  const lastSyncText = lastSyncTs 
    ? new Date(parseInt(lastSyncTs)).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })
    : 'Never';

  // Parked Orders States
  const [showParkedList, setShowParkedList] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [parkNote, setParkNote] = useState('');
  const [showParkedToast, setShowParkedToast] = useState(false);

  // Checkout Configuration
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Transfer' | 'Card' | 'Debt'>('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [walletCreditApplied, setWalletCreditApplied] = useState(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [saveChangeToWallet, setSaveChangeToWallet] = useState(false);

  // Soft POS UI State
  const [showSoftPOSTerminal, setShowSoftPOSTerminal] = useState(false);

  // Printing States
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('last_printer_name'));

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "reader";

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    let items = inventory;
    if (searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.barcode && item.barcode.includes(searchTerm))
      );
    } else if (selectedCategory) {
      items = items.filter(item => item.category === selectedCategory);
    }
    return items.filter(item => item.stock > 0);
  }, [inventory, searchTerm, selectedCategory]);

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
    if (navigator.vibrate) navigator.vibrate(50);
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

  const saleTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = paymentMode !== 'Debt' 
    ? Math.max(0, saleTotal - walletCreditApplied)
    : saleTotal;

  // Underpayment Detection Logic
  const isUnderpaid = paymentMode === 'Cash' && Number(amountPaid) > 0 && Number(amountPaid) < total;
  const balanceOwed = isUnderpaid ? (total - Number(amountPaid)) : 0;

  const changeDue = Math.max(0, Number(amountPaid || 0) - (paymentMode === 'Debt' ? (saleTotal - (selectedCustomer?.walletBalance || 0)) : total));

  const resetCheckoutState = () => {
    setCustomerPhone('');
    setCustomerName('');
    setSelectedCustomer(null);
    setWalletCreditApplied(0);
    setAmountPaid('');
    setSaveChangeToWallet(false);
    setPaymentMode('Cash');
    setShowSoftPOSTerminal(false);
    if (setNavHidden) setNavHidden(false);
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
        setCustomerName(customer.name);
      } else {
        setSelectedCustomer(null);
      }
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleParkCart = async () => {
    if (cart.length === 0) return;
    try {
      await db.parked_orders.add({
        cartItems: cart,
        total: saleTotal,
        customerNote: parkNote || 'Unnamed Customer',
        timestamp: Date.now(),
        staff_id: String(user.id || user.role)
      });
      setCart([]);
      setParkNote('');
      setShowParkModal(false);
      setIsCartExpanded(false);
      setShowParkedToast(true);
      setTimeout(() => setShowParkedToast(false), 2500);
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      alert("Failed to park order");
    }
  };

  const handleResumeOrder = (order: ParkedOrder) => {
    if (cart.length > 0 && !confirm("Current cart has items. Replace with saved order?")) return;
    setCart(order.cartItems);
    db.parked_orders.delete(order.id!);
    setShowParkedList(false);
    setIsCartExpanded(false);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  useEffect(() => {
    if (customerPhone.length === 11 && !selectedCustomer) {
      handleLookupCustomer(customerPhone);
    }
  }, [customerPhone]);

  const handleCheckout = async (explicitMode?: string) => {
    if (cart.length === 0) return;
    
    if (paymentMode === 'Debt' || saveChangeToWallet || isUnderpaid) {
      if (!customerPhone || !customerName) {
        alert("Please provide customer Name and Phone Number!");
        return;
      }
    }

    const modeToSave = explicitMode || paymentMode;

    try {
      await db.transaction('rw', [db.inventory, db.sales, db.customers, db.debts, db.stock_logs], async () => {
        let finalCustomer = selectedCustomer;
        
        if ((paymentMode === 'Debt' || saveChangeToWallet || isUnderpaid) && !finalCustomer && customerPhone && customerName) {
          const existing = await db.customers.where('phone').equals(customerPhone).first();
          if (existing) {
            finalCustomer = existing;
            await db.customers.update(existing.id!, { 
              name: customerName,
              lastTransaction: Date.now() 
            }); 
          } else {
            const id = await db.customers.add({
              name: customerName,
              phone: customerPhone,
              walletBalance: 0,
              lastTransaction: Date.now()
            });
            finalCustomer = await db.customers.get(id as number);
          }
        }

        // Inventory deductions
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

        let appliedFromWallet = 0;
        let finalCashPaid = 0;
        let finalPaymentMethod = modeToSave;
        let netDebtToRecord = 0;

        if (finalCustomer) {
          if (paymentMode === 'Debt') {
            const existingWallet = finalCustomer.walletBalance;
            const cashFromUser = Number(amountPaid || 0);
            
            appliedFromWallet = Math.min(saleTotal, existingWallet);
            const remainingAfterWallet = saleTotal - appliedFromWallet;
            
            finalCashPaid = Math.min(remainingAfterWallet, cashFromUser);
            netDebtToRecord = Math.max(0, remainingAfterWallet - finalCashPaid);
            
            const calculatedChange = Math.max(0, cashFromUser - remainingAfterWallet);
            
            let newWalletBalance = Math.max(0, existingWallet - saleTotal);
            if (saveChangeToWallet && calculatedChange > 0) {
              newWalletBalance += calculatedChange;
            }

            await db.customers.update(finalCustomer.id!, { 
              walletBalance: newWalletBalance,
              lastTransaction: Date.now()
            });

            if (netDebtToRecord > 0) {
              const itemsSummary = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
              let itemsDesc = `POS Sale: ${itemsSummary}`;
              if (appliedFromWallet > 0 || finalCashPaid > 0) {
                itemsDesc += ` (Settled via: ${appliedFromWallet > 0 ? formatNaira(appliedFromWallet)+' wallet' : ''}${appliedFromWallet > 0 && finalCashPaid > 0 ? ' + ' : ''}${finalCashPaid > 0 ? formatNaira(finalCashPaid)+' cash' : ''})`;
              }

              await db.debts.add({
                customerName: finalCustomer.name,
                customerPhone: finalCustomer.phone,
                totalAmount: saleTotal,
                remainingBalance: netDebtToRecord,
                items: itemsDesc,
                date: Date.now(),
                status: 'Unpaid'
              });
            } else if (remainingAfterWallet <= cashFromUser) {
              finalPaymentMethod = 'Wallet';
            }
          } else if (paymentMode === 'Cash' && isUnderpaid) {
            appliedFromWallet = walletCreditApplied;
            finalCashPaid = Number(amountPaid || 0);
            netDebtToRecord = balanceOwed;
            finalPaymentMethod = 'Partial';

            const itemsSummary = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
            await db.debts.add({
              customerName: finalCustomer.name,
              customerPhone: finalCustomer.phone,
              totalAmount: saleTotal, 
              remainingBalance: netDebtToRecord,
              items: `POS Partial: ${itemsSummary} (Paid ${formatNaira(finalCashPaid)} cash)`,
              date: Date.now(),
              status: 'Unpaid'
            });

            await db.customers.update(finalCustomer.id!, { 
              lastTransaction: Date.now()
            });
          } else {
            appliedFromWallet = walletCreditApplied;
            finalCashPaid = (modeToSave === 'Cash') ? Math.min(total, Number(amountPaid || 0)) : 0;
            
            let newBalance = finalCustomer.walletBalance - appliedFromWallet;
            if (saveChangeToWallet) {
              const cashFromUser = Number(amountPaid || 0);
              const standardChange = Math.max(0, cashFromUser - (saleTotal - appliedFromWallet));
              newBalance += standardChange;
            }
            await db.customers.update(finalCustomer.id!, { 
              walletBalance: newBalance,
              lastTransaction: Date.now()
            });
          }
        } else {
          finalCashPaid = (modeToSave === 'Cash') ? Math.min(total, Number(amountPaid || 0)) : 0;
        }

        const sale: Sale = {
          uuid: crypto.randomUUID(),
          // Store items including their individual costPrice at this moment
          items: cart.map(({image, ...rest}) => rest), 
          total: saleTotal, 
          // Capture total cost using current item cost prices
          totalCost: cart.reduce((sum, item) => sum + (Number(item.costPrice || 0) * item.quantity), 0),
          walletUsed: appliedFromWallet,
          walletSaved: (paymentMode === 'Debt' ? Math.max(0, Number(amountPaid || 0) - (saleTotal - appliedFromWallet)) : (saveChangeToWallet ? changeDue : 0)),
          cashPaid: finalCashPaid, 
          paymentMethod: (finalPaymentMethod === 'Soft POS (Transfer)' ? 'Transfer' : (finalPaymentMethod === 'Soft POS' ? 'Transfer' : finalPaymentMethod)) as any,
          timestamp: Date.now(),
          staff_id: String(user.id || user.role),
          staff_name: user.name || user.role,
          customer_phone: finalCustomer?.phone
        };

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

  const triggerSoftPOSTerminal = () => {
    setShowSoftPOSTerminal(false); 
    if (saveChangeToWallet && (!customerPhone || !customerName)) {
      alert("Please provide customer details to save change to wallet!");
      return;
    }
    setShowSoftPOSTerminal(true);
    if (setNavHidden) setNavHidden(true);
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
      {showSoftPOSTerminal && (
        <SoftPOSTerminal 
          amount={total} 
          onConfirm={() => handleCheckout('Soft POS (Transfer)')} 
          onCancel={() => { setShowSoftPOSTerminal(false); if(setNavHidden) setNavHidden(false); }} 
        />
      )}

      {/* Success Toast for Parked Order */}
      {showParkedToast && (
        <div className="fixed top-12 inset-x-0 flex justify-center z-[1000] pointer-events-none px-4">
          <div className="bg-amber-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
             <div className="bg-white/20 p-1.5 rounded-full"><CheckCircle size={16} /></div>
             <p className="font-black text-xs uppercase tracking-widest">Order Parked Successfully</p>
          </div>
        </div>
      )}

      <div className={`p-4 space-y-4 flex-1 overflow-auto transition-all ${cart.length > 0 ? 'pb-40' : 'pb-24'}`}>
        <header className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
               {selectedCategory && !searchTerm && (
                  <button onClick={() => setSelectedCategory(null)} className="p-2 bg-emerald-50 dark:bg-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-400">
                     <ChevronLeft size={20} />
                  </button>
               )}
               <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">
                 {selectedCategory && !searchTerm ? selectedCategory : 'Quick POS'}
               </h1>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowParkedList(true)}
                className="relative bg-amber-50 dark:bg-amber-900/40 text-amber-600 p-3 rounded-2xl border border-amber-100 dark:border-amber-800 active:scale-90 transition-all group"
              >
                <Pause size={20} />
                {parkedOrders && parkedOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-emerald-950 px-1 shadow-md animate-in zoom-in duration-300">
                    {parkedOrders.length}
                  </span>
                )}
              </button>
              <button onClick={startScanner} className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all">
                <Scan size={20} />
              </button>
              <div className="bg-slate-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${user.role === 'Admin' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-emerald-400 uppercase truncate max-w-[80px]">{user.name || user.role}</span>
              </div>
            </div>
          </div>
          {/* Last Sync Visual Indicator */}
          <div className="flex items-center gap-1.5 pl-1">
             <RefreshCw size={8} className="text-slate-400 dark:text-emerald-700" />
             <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-emerald-700">
               Prices last updated: <span className="text-emerald-600 dark:text-emerald-50">{lastSyncText}</span>
             </p>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search catalog or barcode..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-900 dark:text-emerald-50 shadow-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          <button onClick={() => { setSelectedCategory(null); setSearchTerm(''); }} className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${!selectedCategory && !searchTerm ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-emerald-900 text-slate-400 border-slate-100 dark:border-emerald-800'}`}>All</button>
          {categories?.map(c => (
            <button key={c.id} onClick={() => { setSelectedCategory(c.name); setSearchTerm(''); }} className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === c.name && !searchTerm ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-emerald-900 text-slate-400 border-slate-100 dark:border-emerald-800'}`}>{c.name}</button>
          ))}
        </div>

        {!searchTerm && !selectedCategory ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
             {categories?.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[40px] border border-slate-50 dark:border-emerald-800/20 shadow-sm flex flex-col items-center gap-4 active:scale-95 transition-all text-center">
                  <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                    {cat.image ? (
                      <img src={cat.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 uppercase">{cat.name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="font-black text-xs text-slate-800 dark:text-emerald-50 uppercase tracking-widest">{cat.name}</p>
                </button>
             ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-300">
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
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-30">
                 <Package size={48} className="mx-auto mb-2" />
                 <p className="text-xs font-black uppercase tracking-widest">No products in this folder</p>
              </div>
            )}
          </div>
        )}
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
                {!isCartExpanded && (
                   <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setShowParkModal(true); }} className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-200"><Pause size={14}/> Hold</button>
                      <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase">Checkout <ChevronUp size={14} className="inline ml-1" /></div>
                   </div>
                )}
              </div>
            </button>

            {isCartExpanded && (
              <div className="flex-1 overflow-y-auto space-y-6 pt-2 custom-scrollbar">
                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-emerald-950 p-1 rounded-2xl">
                  <button onClick={() => togglePaymentMode('Cash')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Cash' ? 'bg-white dark:bg-emerald-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                    <Banknote size={16} className="mb-1" /> Cash
                  </button>
                  <button 
                    onClick={() => togglePaymentMode('Transfer')} 
                    className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all relative ${paymentMode === 'Transfer' ? 'bg-white dark:bg-emerald-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Landmark size={16} className="mb-1" /> Soft POS
                  </button>
                  <button onClick={() => togglePaymentMode('Card')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Card' ? 'bg-white dark:bg-emerald-800 text-purple-600 shadow-sm' : 'text-slate-400'}`}>
                    <CardIcon size={16} className="mb-1" /> POS Card
                  </button>
                  <button onClick={() => togglePaymentMode('Debt')} className={`flex flex-col items-center py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter ${paymentMode === 'Debt' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>
                    <BookOpen size={16} className="mb-1" /> Debt
                  </button>
                </div>

                {/* Conditional Customer Information Form */}
                {(paymentMode === 'Debt' || changeDue > 0 || isUnderpaid) && (
                  <div className="space-y-3 bg-slate-50 dark:bg-emerald-950/40 p-5 rounded-3xl border border-slate-100 dark:border-emerald-800/40 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-2">
                       <UserPlus size={16} className="text-emerald-600" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Information</h4>
                    </div>

                    {isUnderpaid && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-2 animate-in slide-in-from-top duration-300">
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">
                          ⚠️ Underpayment detected. {formatNaira(balanceOwed)} will be recorded as Debt for this customer.
                        </p>
                      </div>
                    )}

                    {selectedCustomer && (
                      <div className={`p-4 rounded-2xl border flex items-start gap-3 mb-2 animate-in slide-in-from-top duration-300 ${selectedCustomer.walletBalance > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-100 border-slate-200'}`}>
                        <div className={`p-2 rounded-xl text-white shadow-lg ${selectedCustomer.walletBalance > 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-400'}`}>
                          {selectedCustomer.walletBalance > 0 ? <Wallet size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div className="flex-1">
                          {selectedCustomer.walletBalance > 0 ? (
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                                 Boss, this customer has {formatNaira(selectedCustomer.walletBalance)}.
                               </p>
                               {paymentMode === 'Debt' && (
                                 <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                                   {selectedCustomer.walletBalance >= saleTotal 
                                     ? `This sale will be fully paid via wallet credit.`
                                     : `This sale will use all their credit${Number(amountPaid) > 0 ? ' and ' + formatNaira(Number(amountPaid)) + ' cash' : ''} and add ${formatNaira(Math.max(0, saleTotal - selectedCustomer.walletBalance - Number(amountPaid)))} to their debt.`}
                                   {" "}Proceed?
                                 </p>
                               )}
                            </div>
                          ) : (
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                              Customer selected: {selectedCustomer.name} (No wallet balance)
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Phone size={10}/> Phone Number</label>
                        <div className="relative">
                          <input 
                            type="tel" 
                            placeholder="080..." 
                            className="w-full px-4 py-3.5 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                            value={customerPhone} 
                            onChange={(e) => setCustomerPhone(e.target.value)} 
                          />
                          {isSearchingCustomer && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" size={14} />}
                          {selectedCustomer && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><UserCheck size={10}/> Customer Name</label>
                        <input 
                          type="text" 
                          placeholder="Enter customer name" 
                          className="w-full px-4 py-3.5 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                          value={customerName} 
                          onChange={(e) => setCustomerName(e.target.value)} 
                        />
                      </div>
                    </div>

                    {changeDue > 0 && (
                      <label className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-[24px] mt-2 cursor-pointer active:scale-[0.98] transition-all">
                        <input 
                          type="checkbox" 
                          checked={saveChangeToWallet} 
                          onChange={e => setSaveChangeToWallet(e.target.checked)} 
                          className="w-6 h-6 rounded-lg border-emerald-300 text-emerald-600 focus:ring-emerald-500" 
                        />
                        <div className="flex-1">
                           <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase leading-tight">💾 Save {formatNaira(changeDue)} to Wallet?</p>
                           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Save change for customer's next visit</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}

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
                    
                    {paymentMode === 'Cash' && (
                       <div className="space-y-1 animate-in slide-in-from-top duration-300">
                        <label className="text-[10px] font-black text-emerald-600 uppercase ml-2 flex items-center gap-1"><Banknote size={10}/> Cash Received (₦)</label>
                        <input type="number" inputMode="decimal" placeholder="0.00" className="w-full p-4 bg-white dark:bg-emerald-900 border-2 border-emerald-100 rounded-2xl font-black text-2xl text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                      </div>
                    )}

                    {paymentMode === 'Transfer' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 space-y-3 animate-in slide-in-from-top duration-300">
                         <div className="flex items-center gap-2">
                           <ShieldCheck size={14} className="text-blue-600" />
                           <p className="text-[9px] font-black text-blue-600 uppercase">Transfer Verification Required</p>
                         </div>
                         <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                           System will show your bank details to customer on next screen.
                         </p>
                      </div>
                    )}

                    {changeDue > 0 && (
                      <div className="flex flex-col gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 rounded-2xl animate-in slide-in-from-top duration-300">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Change Due</span><span className="text-2xl font-black text-amber-700">{formatNaira(changeDue)}</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[32px] border-2 border-dashed border-amber-300 space-y-4 animate-in pulse duration-1000">
                    <div className="text-center">
                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Credit Sales Amount</p>
                       <p className="text-4xl font-black text-amber-800 dark:text-emerald-50 tracking-tighter">{formatNaira(saleTotal)}</p>
                    </div>
                    <div className="space-y-1 animate-in slide-in-from-top duration-300">
                       <label className="text-[10px] font-black text-amber-700 uppercase ml-2 flex items-center gap-1"><Banknote size={10}/> Part Cash Paid Today (₦)</label>
                       <input type="number" inputMode="decimal" placeholder="0.00" className="w-full p-4 bg-white dark:bg-emerald-950 border-2 border-amber-200 rounded-2xl font-black text-xl text-amber-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                    </div>
                    {changeDue > 0 && (
                      <div className="flex justify-between items-center bg-amber-500 text-white p-3 rounded-xl">
                        <span className="text-[10px] font-black uppercase">Change Due (to wallet)</span>
                        <span className="text-lg font-black">{formatNaira(changeDue)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowParkModal(true)} 
                      className="bg-amber-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100 dark:shadow-none"
                    >
                      <Pause size={16}/> Hold Order
                    </button>
                    <button 
                      onClick={() => paymentMode === 'Transfer' ? triggerSoftPOSTerminal() : handleCheckout()} 
                      disabled={((paymentMode === 'Debt' || isUnderpaid) && (!customerPhone || !customerName)) || (saveChangeToWallet && (!customerPhone || !customerName))}
                      className={`font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale ${paymentMode === 'Debt' || isUnderpaid ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-600 text-white shadow-emerald-200'}`}
                    >
                      {paymentMode === 'Debt' || isUnderpaid ? 'Record Debt' : (paymentMode === 'Transfer' ? 'Open Soft POS' : 'Finish Sale')} <ArrowRight size={16} />
                    </button>
                  </div>
                  <button onClick={() => setIsCartExpanded(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Keep Browsing Catalog</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Park Modal */}
      {showParkModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl border dark:border-emerald-800 animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Hold Order</h2>
            <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest mt-2 mb-6">Enter a note to identify this order</p>
            
            <input 
              type="text" 
              placeholder="e.g. Mama Chidi" 
              className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none mb-6 text-center"
              value={parkNote}
              onChange={(e) => setParkNote(e.target.value)}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setShowParkModal(false)} className="py-4 bg-slate-100 dark:bg-emerald-800 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancel</button>
               <button onClick={handleParkCart} className="py-4 bg-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-amber-200">Hold Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Parked Orders Manager */}
      {showParkedList && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-slate-50 dark:bg-emerald-950 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-xl text-amber-600"><Pause size={20}/></div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Parked Orders</h2>
                 </div>
                 <button onClick={() => setShowParkedList(false)} className="p-2 bg-white dark:bg-emerald-800 rounded-full text-slate-400 shadow-sm active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                 {parkedOrders && parkedOrders.length > 0 ? (
                   parkedOrders.map(order => (
                     <div key={order.id} className="bg-white dark:bg-emerald-900/60 p-5 rounded-[32px] border border-white dark:border-emerald-800 shadow-sm group animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Order ID: #{String(order.id).padStart(3, '0')}</p>
                              <h3 className="font-black text-slate-800 dark:text-emerald-50 text-base leading-tight italic truncate uppercase">{order.customerNote}</h3>
                           </div>
                           <p className="text-lg font-black text-slate-900 dark:text-emerald-50 tracking-tighter whitespace-nowrap">{formatNaira(order.total)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-emerald-800/40">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Clock size={12}/>
                              <span className="text-[9px] font-bold uppercase tracking-widest">{getRelativeTime(order.timestamp)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-emerald-800"></span>
                              <span className="text-[9px] font-bold uppercase tracking-widest">{order.cartItems.length} items</span>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => { if(confirm("Delete this parked order?")) db.parked_orders.delete(order.id!); }} 
                                className="p-3 bg-red-50 dark:bg-red-950/20 text-red-400 rounded-xl active:scale-90 transition-all border border-red-100 dark:border-red-900/40"
                                title="Clear Order"
                              >
                                <Trash2 size={16}/>
                              </button>
                              <button 
                                onClick={() => handleResumeOrder(order)} 
                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                              >
                                <Play size={12} fill="currentColor"/> Resume
                              </button>
                           </div>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-20 text-center space-y-4">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-emerald-900 rounded-[40px] flex items-center justify-center mx-auto text-slate-300">
                         <Pause size={48} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-tight">Your Hold list is empty</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Orders you park will show up here</p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-6 text-center shadow-2xl border dark:border-emerald-800 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${lastSale?.paymentMethod === 'Debt' || lastSale?.paymentMethod === 'Partial' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {(lastSale?.paymentMethod === 'Debt' || lastSale?.paymentMethod === 'Partial') ? <BookOpen size={40} /> : <CheckCircle size={40} />}
            </div>
            <h2 className="text-2xl font-black mb-1 text-slate-800 dark:text-emerald-50 tracking-tight">
              {(lastSale?.paymentMethod === 'Debt' || lastSale?.paymentMethod === 'Partial') ? 'Debt Recorded!' : (lastSale?.paymentMethod === 'Wallet' ? 'Fully Paid via Wallet!' : 'Sale Successful!')}
            </h2>
            <div className="bg-slate-50 dark:bg-emerald-950/40 rounded-2xl p-5 text-left border border-slate-200 mb-6 space-y-2">
              <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase">
                <span>Total Bill</span><span>{formatNaira(lastSale?.total || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase">
                <span>Method</span><span className="font-black text-slate-800 dark:text-emerald-50 uppercase tracking-widest">{lastSale?.paymentMethod === 'Partial' ? 'Partial (Cash + Debt)' : (lastSale?.paymentMethod || 'CASH')}</span>
              </div>
              
              {lastSale?.walletUsed && lastSale.walletUsed > 0 ? (
                <div className="flex justify-between font-black text-blue-600 text-[10px] uppercase pt-1 border-t border-blue-50">
                   <span>Paid via Wallet</span>
                   <span>-{formatNaira(lastSale.walletUsed)}</span>
                </div>
              ) : null}

              {lastSale?.cashPaid && lastSale.cashPaid > 0 ? (
                <div className="flex justify-between font-black text-gray-600 dark:text-emerald-400 text-[10px] uppercase pt-1 border-t border-gray-100">
                   <span>Cash Received</span>
                   <span>-{formatNaira(lastSale.cashPaid)}</span>
                </div>
              ) : null}

              {(lastSale?.paymentMethod === 'Debt' || lastSale?.paymentMethod === 'Partial') ? (
                <div className="flex justify-between font-black text-red-600 text-[10px] uppercase pt-1 border-t border-red-50">
                   <span>Balance Owed</span>
                   <span>{formatNaira(Math.max(0, (lastSale?.total || 0) - (lastSale?.walletUsed || 0) - (lastSale?.cashPaid || 0)))}</span>
                </div>
              ) : null}

              {lastSale?.walletSaved && lastSale.walletSaved > 0 ? (
                <div className="flex justify-between font-black text-emerald-600 text-[10px] uppercase pt-1 border-t border-emerald-100">
                   <span>New Credit Saved</span>
                   <span>+{formatNaira(lastSale.walletSaved)}</span>
                </div>
              ) : null}
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
