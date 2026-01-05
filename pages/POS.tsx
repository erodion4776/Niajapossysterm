import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale, InventoryItem, User as DBUser, Customer, Debt, Category, ParkedOrder } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { syncEngine, SyncStatus } from '../utils/syncEngine.ts';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, 
  MessageCircle, ChevronUp, Scan, Package, Image as ImageIcon, 
  Printer, Loader2, UserPlus, UserCheck, Wallet, Coins, ArrowRight,
  BookOpen, CreditCard, AlertCircle, Banknote, Landmark, CreditCard as CardIcon,
  ShieldCheck, HelpCircle, ChevronLeft, Tag, Phone, Info, Pause, Play, Clock, RefreshCw,
  Cloud, CloudOff
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
  // 1. Database Queries
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const parkedOrders = useLiveQuery(() => db.parked_orders.where('staff_id').equals(String(user.id || user.role)).reverse().toArray());
  
  // 2. Primary UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<(SaleItem & { image?: string })[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncTs, setLastSyncTs] = useState(() => localStorage.getItem('last_inventory_sync'));

  // 3. Checkout & Customer State
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Transfer' | 'Card' | 'Debt'>('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [saveChangeToWallet, setSaveChangeToWallet] = useState(false);
  const [showSoftPOSTerminal, setShowSoftPOSTerminal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('last_printer_name'));
  const [isScanning, setIsScanning] = useState(false);

  // 4. Scanning & Parking State
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [parkNote, setParkNote] = useState('');
  const [showParkModal, setShowParkModal] = useState(false);
  const [showParkedList, setShowParkedList] = useState(false);
  const [showParkedToast, setShowParkedToast] = useState(false);
  
  const scannerContainerId = "reader";

  // 5. Lifecycle Effects
  useEffect(() => {
    syncEngine.subscribeStatus(setSyncStatus);
    const checkSync = () => {
      const ts = localStorage.getItem('last_inventory_sync');
      if (ts !== lastSyncTs) setLastSyncTs(ts);
    };
    const interval = setInterval(checkSync, 1000);
    return () => clearInterval(interval);
  }, [lastSyncTs]);

  // 6. Memoized Calculations
  const lastSyncText = useMemo(() => {
    if (!lastSyncTs) return 'Never';
    return new Date(parseInt(lastSyncTs)).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
  }, [lastSyncTs]);

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

  // 7. Cart Operations
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
  const walletCreditAvailable = selectedCustomer?.walletBalance || 0;
  const walletCreditApplied = Math.min(saleTotal, walletCreditAvailable);
  const netTotalAfterWallet = saleTotal - walletCreditApplied;
  const numericAmountPaid = Number(amountPaid) || 0;
  const isUnderpaid = (paymentMode !== 'Debt') && numericAmountPaid > 0 && numericAmountPaid < netTotalAfterWallet;
  const balanceOwed = isUnderpaid ? (netTotalAfterWallet - numericAmountPaid) : 0;
  const changeDue = Math.max(0, numericAmountPaid - netTotalAfterWallet);

  const isCheckoutDisabled = useMemo(() => {
    if (cart.length === 0 || isProcessing) return true;
    if (paymentMode === 'Debt' && (!customerName.trim() || !customerPhone.trim())) return true;
    if (isUnderpaid && (!customerName.trim() || !customerPhone.trim())) return true;
    if (saveChangeToWallet && changeDue > 0 && (!customerName.trim() || !customerPhone.trim())) return true;
    return false;
  }, [cart.length, paymentMode, customerName, customerPhone, isUnderpaid, saveChangeToWallet, changeDue, isProcessing]);

  const resetCheckoutState = () => {
    setCustomerPhone('');
    setCustomerName('');
    setSelectedCustomer(null);
    setAmountPaid('');
    setSaveChangeToWallet(false);
    setPaymentMode('Cash');
    setShowSoftPOSTerminal(false);
    setIsProcessing(false);
    if (setNavHidden) setNavHidden(false);
  };

  /**
   * "Instant-Save" Logic (Local-First)
   * The UI never waits for Supabase.
   */
  const handleCheckout = async (explicitMode?: string) => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true); // Only prevents double clicks

    const modeToSave = explicitMode || paymentMode;

    try {
      // 1. PERFORM ALL OPERATIONS LOCALLY (DEXIE)
      await db.transaction('rw', [db.inventory, db.sales, db.customers, db.debts, db.stock_logs], async () => {
        let finalCustomer = selectedCustomer;
        if (customerPhone && customerName && !finalCustomer) {
          const existing = await db.customers.where('phone').equals(customerPhone).first();
          if (existing) {
            finalCustomer = existing;
            await db.customers.update(existing.id!, { 
              name: customerName,
              lastTransaction: Date.now(),
              last_updated: Date.now(),
              synced: 0 // Mark for background sync
            }); 
          } else {
            const id = await db.customers.add({
              uuid: crypto.randomUUID(),
              name: customerName,
              phone: customerPhone,
              walletBalance: 0,
              lastTransaction: Date.now(),
              last_updated: Date.now(),
              synced: 0
            });
            finalCustomer = await db.customers.get(id as number);
          }
        }

        // Subtract stock locally
        for (const item of cart) {
          if (!item.id) continue;
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            const newStock = invItem.stock - item.quantity;
            await db.inventory.update(item.id, { 
              stock: newStock,
              last_updated: Date.now(),
              synced: 0
            });
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

        // Financial calc
        let appliedFromWallet = 0;
        let finalCashPaid = 0;
        let finalPaymentMethod = modeToSave;
        let netDebtToRecord = 0;
        let newWalletBalance = 0;

        if (finalCustomer) {
          const currentWalletBalance = finalCustomer.walletBalance;
          if (paymentMode === 'Debt') {
            appliedFromWallet = Math.min(saleTotal, currentWalletBalance);
            const remaining = saleTotal - appliedFromWallet;
            finalCashPaid = Math.min(remaining, numericAmountPaid);
            netDebtToRecord = Math.max(0, remaining - finalCashPaid);
            const calcChange = Math.max(0, numericAmountPaid - remaining);
            newWalletBalance = currentWalletBalance - appliedFromWallet;
            if (saveChangeToWallet && calcChange > 0) newWalletBalance += calcChange;
            finalPaymentMethod = netDebtToRecord > 0 ? 'Debt' : 'Wallet';
          } 
          else if (isUnderpaid) {
            appliedFromWallet = Math.min(saleTotal, currentWalletBalance);
            finalCashPaid = numericAmountPaid;
            netDebtToRecord = balanceOwed;
            newWalletBalance = currentWalletBalance - appliedFromWallet;
            finalPaymentMethod = 'Partial';
          } 
          else {
            appliedFromWallet = Math.min(saleTotal, currentWalletBalance);
            finalCashPaid = (modeToSave === 'Cash') ? Math.min(netTotalAfterWallet, numericAmountPaid) : netTotalAfterWallet;
            newWalletBalance = currentWalletBalance - appliedFromWallet;
            if (saveChangeToWallet && changeDue > 0) newWalletBalance += changeDue;
            finalPaymentMethod = modeToSave;
          }
          
          await db.customers.update(finalCustomer.id!, { 
            walletBalance: newWalletBalance,
            lastTransaction: Date.now(),
            last_updated: Date.now(),
            synced: 0
          });

          if (netDebtToRecord > 0) {
            const itemsSummary = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
            await db.debts.add({
              uuid: crypto.randomUUID(),
              customerName: finalCustomer.name,
              customerPhone: finalCustomer.phone,
              totalAmount: saleTotal,
              remainingBalance: netDebtToRecord,
              items: `POS Transaction: ${itemsSummary}`,
              date: Date.now(),
              status: 'Unpaid',
              last_updated: Date.now(),
              synced: 0
            });
          }
        } else {
          finalCashPaid = (modeToSave === 'Cash') ? Math.min(saleTotal, numericAmountPaid) : saleTotal;
          finalPaymentMethod = modeToSave;
        }

        const sale: Sale = {
          uuid: crypto.randomUUID(),
          items: cart.map(({image, ...rest}) => rest), 
          total: saleTotal, 
          totalCost: cart.reduce((sum, item) => sum + (Number(item.costPrice || 0) * item.quantity), 0),
          walletUsed: appliedFromWallet,
          walletSaved: (saveChangeToWallet ? changeDue : 0),
          cashPaid: finalCashPaid, 
          paymentMethod: (finalPaymentMethod === 'Soft POS' ? 'Transfer' : finalPaymentMethod) as any,
          timestamp: Date.now(),
          staff_id: String(user.id || user.role),
          staff_name: user.name || user.role,
          customer_phone: finalCustomer?.phone,
          last_updated: Date.now(),
          synced: 0 // Background sync flag
        };

        const saleId = await db.sales.add(sale);
        setLastSale({ ...sale, id: saleId as number });
      });

      // 2. SHOW SUCCESS SCREEN IMMEDIATELY
      setCart([]);
      setIsCartExpanded(false);
      setShowSuccessModal(true);
      resetCheckoutState();
      
      // 3. BACKGROUND SYNC (No Await)
      syncEngine.sync();
      
    } catch (error: any) {
      alert('Local Save Failed: ' + error.message);
      setIsProcessing(false);
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
            if (item) addToCart(item);
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
          amount={netTotalAfterWallet} 
          onConfirm={() => handleCheckout('Soft POS')} 
          onCancel={() => { setShowSoftPOSTerminal(false); if(setNavHidden) setNavHidden(false); }} 
        />
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <button onClick={stopScanner} className="absolute top-8 right-8 bg-white/10 p-4 rounded-full text-white z-[1010] backdrop-blur-md active:scale-95"><X size={24} /></button>
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Barcode Scanner</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Position product barcode in the frame</p>
          </div>
          <div id={scannerContainerId} className="w-full max-w-sm aspect-square rounded-[48px] overflow-hidden border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(5,150,105,0.2)]"></div>
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
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-emerald-900/40 px-3 py-1.5 rounded-full border border-slate-100 dark:border-emerald-800/40">
                {syncStatus === 'synced' || syncStatus === 'pending' || syncStatus === 'pulling' ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]"></div>
                    <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      {syncStatus === 'pulling' ? 'Syncing...' : 'Active Sync'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full shadow-[0_0_5px_#cbd5e1]"></div>
                    <span className="text-[8px] font-black uppercase text-slate-400">Offline</span>
                  </>
                )}
              </div>
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
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-1 mt-1">
             <RefreshCw size={8} className="text-slate-400 dark:text-emerald-700 animate-spin-slow" />
             <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-emerald-700">
               Stock Freshness: <span className="text-emerald-600 dark:text-emerald-50">{lastSyncText}</span>
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
          </div>
        )}
      </div>
      
      {cart.length > 0 && (
        <>
          {isCartExpanded && <div className="fixed inset-0 bg-black/20 dark:bg-black/60 z-40" onClick={() => setIsCartExpanded(false)} />}
          <div className={`fixed bottom-16 inset-x-0 bg-white dark:bg-emerald-900 border-t-2 border-emerald-500 z-[45] flex flex-col rounded-t-[40px] transition-all duration-300 ${isCartExpanded ? 'max-h-[95vh] h-auto p-6' : 'max-h-24 p-4'}`}>
            <button onClick={() => setIsCartExpanded(!isCartExpanded)} className={`w-full flex flex-col items-center mb-2`}>
              <div className="w-12 h-1 bg-slate-200 dark:bg-emerald-800 rounded-full mb-3" />
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="text-emerald-600" />
                  {!isCartExpanded && <p className="text-lg font-black text-slate-800 dark:text-emerald-50">{formatNaira(saleTotal)}</p>}
                </div>
                {!isCartExpanded && (
                   <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setShowParkModal(true); }} className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-200"><Pause size={14}/> Hold</button>
                      <div onClick={() => setIsCartExpanded(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase">Checkout <ChevronUp size={14} className="inline ml-1" /></div>
                   </div>
                )}
              </div>
            </button>
            
            {isCartExpanded && (
               <div className="flex-1 overflow-auto space-y-6 pt-4 custom-scrollbar">
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-3xl border border-slate-100 dark:border-emerald-800/40">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center text-emerald-600 font-black">
                              {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-2xl" /> : item.name.charAt(0)}
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 dark:text-emerald-50 text-sm">{item.name}</p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-black text-xs">{formatNaira(item.price * item.quantity)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-2 bg-white dark:bg-emerald-800 rounded-xl shadow-sm text-slate-400 active:scale-90"><Minus size={16} /></button>
                          <span className="font-black w-6 text-center dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm active:scale-90"><Plus size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/50 p-6 rounded-[32px] space-y-4">
                     <div className="flex justify-between items-center"><span className="text-slate-400 font-bold text-xs">Total Bill</span><span className="text-2xl font-black text-emerald-600">{formatNaira(saleTotal)}</span></div>
                  </div>

                  <button 
                    onClick={() => handleCheckout()}
                    disabled={isCheckoutDisabled}
                    className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} Finish Sale
                  </button>
               </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default POS;