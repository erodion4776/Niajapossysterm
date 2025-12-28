
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SaleItem, Sale, InventoryItem, User as DBUser, Customer, Debt } from '../db.ts';
import { formatNaira, shareReceiptToWhatsApp } from '../utils/whatsapp.ts';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, X, 
  MessageCircle, ChevronUp, Scan, Package, Image as ImageIcon, 
  Printer, Loader2, UserPlus, UserCheck, Wallet, Coins, ArrowRight,
  BookOpen, CreditCard, AlertCircle
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
  const [paymentMode, setPaymentMode] = useState<'Immediate' | 'Debt'>('Immediate');
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
  // Only apply wallet discount if in Immediate mode
  const total = paymentMode === 'Immediate' 
    ? Math.max(0, cartSubtotal - walletCreditApplied)
    : cartSubtotal;

  const changeDue = Math.max(0, Number(amountPaid || 0) - total);

  const resetCheckoutState = () => {
    setCustomerPhone('');
    setSelectedCustomer(null);
    setWalletCreditApplied(0);
    setAmountPaid('');
    setSaveChangeToWallet(false);
    setPaymentMode('Immediate');
  };

  // Helper to handle mode switching cleanly
  const togglePaymentMode = (mode: 'Immediate' | 'Debt') => {
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
        // Only prompt for new name if user clicked search button explicitly
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

  // Auto-search if 11 digits entered
  useEffect(() => {
    if (customerPhone.length === 11 && !selectedCustomer) {
      handleLookupCustomer(customerPhone);
    }
  }, [customerPhone]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validations
    if (paymentMode === 'Debt') {
      if (!selectedCustomer) {
        alert("Oga, select or search for a customer before recording a debt!");
        return;
      }
      if (total <= 0) {
        alert("Cannot record a ₦0 debt. Switch to 'Paid Now' instead.");
        return;
      }
    }

    const sale: Sale = {
      uuid: crypto.randomUUID(),
      items: cart.map(({image, ...rest}) => rest), 
      total,
      totalCost: cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
      walletUsed: paymentMode === 'Immediate' ? walletCreditApplied : 0,
      walletSaved: paymentMode === 'Immediate' && saveChangeToWallet ? changeDue : 0,
      paymentMethod: paymentMode === 'Debt' ? 'Debt' : 'Cash',
      timestamp: Date.now(),
      staff_id: String(user.id || user.role),
      staff_name: user.name || user.role,
      customer_phone: selectedCustomer?.phone
    };

    try {
      await db.transaction('rw', [db.inventory, db.sales, db.customers, db.debts, db.stock_logs], async () => {
        // 1. Inventory Logic + Logging
        for (const item of cart) {
          if (!item.id) continue;
          const invItem = await db.inventory.get(item.id);
          if (invItem) {
            if (invItem.stock < item.quantity) throw new Error(`Insufficient stock for ${invItem.name}`);
            const newStock = invItem.stock - item.quantity;
            await db.inventory.update(item.id, { stock: newStock });
            
            // Log deduction
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

        // 2. Ledger/Wallet Logic
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

        // 3. Complete Sale Record
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
  // ... Rest of component ...
