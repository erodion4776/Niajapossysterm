import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem, Category, User as DBUser } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { syncEngine } from '../utils/syncEngine.ts';
import { 
  Plus, Search, Package, Edit3, X, Trash2, 
  Camera, LayoutGrid, List, Image as ImageIcon, Loader2,
  Tag, ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight, History, Barcode, Calendar, Scan,
  Truck, HelpCircle
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { ExpiryScanner } from '../components/ExpiryScanner.tsx';
import { processImage } from '../utils/images.ts';
import { Html5Qrcode } from 'html5-qrcode';

interface InventoryProps {
  user: DBUser;
  role: Role;
  initialFilter?: 'all' | 'low-stock' | 'expiring';
  clearInitialFilter?: () => void;
  setPage: (page: Page) => void;
}

const NAIJA_UNITS = ['Pcs', 'Packs', 'Cartons', 'Bags', 'Tins', 'Sachets', 'Kg'];

export const Inventory: React.FC<InventoryProps> = ({ user, role, initialFilter = 'all', clearInitialFilter, setPage }) => {
  const isStaff = localStorage.getItem('user_role') === 'staff';
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice' || isStaff;
  const isAdmin = role === 'Admin' && !isStaffDevice && !isStaff;
  
  // FIX: Ensure we are querying the full local database without staff-id filtering
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'low-stock' | 'expiring'>(initialFilter);
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('inventory_view') as any) || 'grid');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showScanner, setShowScanner] = useState<'add' | 'edit' | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  
  const [isScanningBarcode, setIsScanningBarcode] = useState<'add' | 'edit' | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "inventory-barcode-reader";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bulkData, setBulkData] = useState({
    targetCategory: 'All',
    updateType: 'Percentage' as 'Percentage' | 'Fixed',
    targetField: 'Selling Price' as 'Selling Price' | 'Cost Price',
    value: 0
  });

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'uuid'>>({
    name: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    unit: 'Pcs',
    supplierName: '',
    minStock: 5,
    expiryDate: '',
    category: 'Uncategorized',
    barcode: '',
    image: ''
  });

  const [catFormData, setCatFormData] = useState<Omit<Category, 'id' | 'uuid'>>({
    name: '',
    image: ''
  });

  useEffect(() => {
    setCurrentFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    localStorage.setItem('inventory_view', viewMode);
  }, [viewMode]);

  const handleImageUpload = async (file: File, target: 'product-add' | 'product-edit' | 'cat-add' | 'cat-edit') => {
    setIsProcessingImage(true);
    try {
      const base64 = await processImage(file);
      if (target === 'product-add') setFormData(prev => ({ ...prev, image: base64 }));
      else if (target === 'product-edit') setEditingItem(prev => prev ? { ...prev, image: base64 } : null);
      else if (target === 'cat-add') setCatFormData(prev => ({ ...prev, image: base64 }));
      else if (target === 'cat-edit') setEditingCat(prev => prev ? { ...prev, image: base64 } : null);
    } catch (err) {
      alert("Failed to process image. Try a smaller file.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const removeImage = (target: 'product-add' | 'product-edit' | 'cat-add' | 'cat-edit') => {
    if (target === 'product-add') setFormData(prev => ({ ...prev, image: '' }));
    else if (target === 'product-edit') setEditingItem(prev => prev ? { ...prev, image: '' } : null);
    else if (target === 'cat-add') setCatFormData(prev => ({ ...prev, image: '' }));
    else if (target === 'cat-edit') setEditingCat(prev => prev ? { ...prev, image: '' } : null);
  };

  const startBarcodeScanner = async (target: 'add' | 'edit') => {
    setIsScanningBarcode(target);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 150 } }, 
          async (decodedText) => {
            if (target === 'add') setFormData(p => ({ ...p, barcode: decodedText }));
            else if (editingItem) setEditingItem({ ...editingItem, barcode: decodedText });
            stopBarcodeScanner();
            if (navigator.vibrate) navigator.vibrate(100);
          },
          () => {}
        );
      } catch (err) {
        alert("Camera Access Denied.");
        setIsScanningBarcode(null);
      }
    }, 300);
  };

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setIsScanningBarcode(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    await db.transaction('rw', [db.inventory, db.stock_logs], async () => {
      const newItem: InventoryItem = { 
        ...formData, 
        uuid: crypto.randomUUID(),
        dateAdded: new Date().toISOString(),
        last_updated: Date.now(),
        synced: 0
      };
      const id = await db.inventory.add(newItem);
      await db.stock_logs.add({
        item_id: id as number,
        itemName: formData.name,
        quantityChanged: formData.stock,
        previousStock: 0,
        newStock: formData.stock,
        type: 'Addition',
        date: Date.now(),
        staff_name: user.name || user.role,
        supplierName: formData.supplierName
      });
      syncEngine.sync();
    });

    setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, unit: 'Pcs', supplierName: '', minStock: 5, expiryDate: '', category: 'Uncategorized', barcode: '', image: '' });
    setShowAddModal(false);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !isAdmin) return;

    const original = inventory?.find(i => i.id === editingItem.id);
    if (!original) return;

    const diff = editingItem.stock - original.stock;

    await db.transaction('rw', [db.inventory, db.stock_logs], async () => {
      const updatedItem = {
        ...editingItem,
        last_updated: Date.now(),
        synced: 0
      };
      await db.inventory.update(editingItem.id!, updatedItem);
      
      if (diff !== 0) {
        await db.stock_logs.add({
          item_id: editingItem.id!,
          itemName: editingItem.name,
          quantityChanged: diff,
          previousStock: original.stock,
          newStock: editingItem.stock,
          type: 'Manual Update',
          date: Date.now(),
          staff_name: user.name || user.role,
          supplierName: editingItem.supplierName
        });
      }
      syncEngine.sync();
    });

    setEditingItem(null);
  };

  const handleDeleteItem = async (id: number | string) => {
    if (!isAdmin) return;
    if (confirm("Delete this product forever? This cannot be undone.")) {
      await db.inventory.delete(id);
      setEditingItem(null);
    }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await db.categories.add({ 
      ...catFormData, 
      uuid: crypto.randomUUID(), 
      dateCreated: Date.now(), 
      last_updated: Date.now(), 
      synced: 0 
    });
    syncEngine.sync();
    setCatFormData({ name: '', image: '' });
    setShowCatModal(false);
  };

  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !isAdmin) return;
    await db.categories.update(editingCat.id!, { 
      ...editingCat, 
      last_updated: Date.now(), 
      synced: 0 
    });
    syncEngine.sync();
    setEditingCat(null);
  };

  const handleDeleteCat = async (id: number | string) => {
    if (!isAdmin) return;
    if (confirm("Delete this category? All products inside will be moved to 'Uncategorized'.")) {
      const cat = categories?.find(c => c.id === id);
      if (cat) {
        await db.transaction('rw', [db.inventory, db.categories], async () => {
          await db.inventory.where('category').equals(cat.name).modify({ category: 'Uncategorized' });
          await db.categories.delete(id);
        });
      }
      setEditingCat(null);
    }
  };

  const handleApplyBulkUpdate = async () => {
    if (!inventory || isUpdatingBulk) return;
    setIsUpdatingBulk(true);

    try {
      const itemsToUpdate = bulkData.targetCategory === 'All' 
        ? inventory 
        : inventory.filter(i => i.category === bulkData.targetCategory);

      if (itemsToUpdate.length === 0) {
        alert("No items found to update.");
        return;
      }

      const updatedItems = itemsToUpdate.map(item => {
        let currentPrice = bulkData.targetField === 'Selling Price' ? item.sellingPrice : item.costPrice;
        let newPrice = currentPrice;

        if (bulkData.updateType === 'Percentage') {
          newPrice = currentPrice * (1 + bulkData.value / 100);
        } else {
          newPrice = currentPrice + bulkData.value;
        }

        newPrice = Math.ceil(newPrice / 50) * 50;

        return {
          ...item,
          [bulkData.targetField === 'Selling Price' ? 'sellingPrice' : 'costPrice']: newPrice,
          last_updated: Date.now(),
          synced: 0
        };
      });

      await db.inventory.bulkPut(updatedItems);
      syncEngine.sync();
      alert(`₦-Inflation Protection Applied! ${updatedItems.length} prices updated.`);
      setShowBulkModal(false);
    } catch (err) {
      alert("Bulk update failed.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    let items = inventory;
    const now = new Date();
    const weekOut = new Date(new Date().setDate(now.getDate() + 7));

    if (currentFilter === 'low-stock') items = items.filter(i => i.stock <= (i.minStock || 5));
    else if (currentFilter === 'expiring') items = items.filter(i => i.expiryDate && new Date(i.expiryDate) <= weekOut);

    if (selectedCat !== 'All') items = items.filter(i => i.category === selectedCat);

    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm))
    );
  }, [inventory, searchTerm, currentFilter, selectedCat]);

  const filteredCats = useMemo(() => {
    return categories?.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  }, [categories, searchTerm]);

  const calculateProfitData = (cost: number, selling: number) => {
    const profit = selling - cost;
    const margin = selling > 0 ? ((profit / selling) * 100).toFixed(1) : '0';
    return { profit, margin };
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
      {showScanner && <ExpiryScanner onDateFound={d => {
        if (showScanner === 'add') setFormData(p => ({ ...p, expiryDate: d }));
        else if (editingItem) setEditingItem({ ...editingItem, expiryDate: d });
        setShowScanner(null);
      }} onClose={() => setShowScanner(null)} />}

      {isScanningBarcode && (
        <div className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <button onClick={stopBarcodeScanner} className="absolute top-8 right-8 bg-white/10 p-4 rounded-full text-white z-[1010] backdrop-blur-md active:scale-95"><X size={24} /></button>
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Barcode Scanner</h2>
          </div>
          <div id={scannerContainerId} className="w-full max-w-sm aspect-square rounded-[48px] overflow-hidden border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(5,150,105,0.2)]"></div>
        </div>
      )}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Stock</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Inventory Control</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage(Page.STOCK_LOGS)} className="p-4 bg-white dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-[24px] border border-slate-100 dark:border-emerald-800/40 active:scale-90 shadow-sm"><History size={20} /></button>
          {isAdmin && activeTab === 'products' && (
            <button onClick={() => setShowBulkModal(true)} className="p-4 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-[24px] border border-amber-100 shadow-sm"><TrendingUp size={20} /></button>
          )}
          <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="p-4 bg-white dark:bg-emerald-900/40 text-slate-400 rounded-[24px] border border-slate-100 shadow-sm">
            {viewMode === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
          {isAdmin && (
            <button onClick={() => activeTab === 'products' ? setShowAddModal(true) : setShowCatModal(true)} className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg active:scale-90 transition-all"><Plus size={24} /></button>
          )}
        </div>
      </header>

      <div className="flex bg-slate-100 dark:bg-emerald-900/40 p-1.5 rounded-[24px]">
        <button onClick={() => setActiveTab('products')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-emerald-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Package size={16} /> Products</button>
        <button onClick={() => setActiveTab('categories')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-emerald-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Tag size={16} /> Categories</button>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input type="text" placeholder={`Search ${activeTab}...`} className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900/40 border border-gray-100 rounded-[24px] outline-none text-gray-900 dark:text-emerald-50 font-medium shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {activeTab === 'products' ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "space-y-3"}>
          {filteredItems.map(item => {
            const isLow = item.stock <= (item.minStock || 5);
            const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 7));
            return (
              <button key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)} className={`bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 overflow-hidden shadow-sm flex flex-col active:scale-[0.97] transition-all text-left ${viewMode === 'grid' ? 'h-full' : 'flex-row p-4 gap-4 items-center'} ${!isAdmin ? 'cursor-default' : ''}`}>
                <div className={`${viewMode === 'grid' ? 'h-32 w-full' : 'w-16 h-16 rounded-2xl'} bg-slate-100 dark:bg-emerald-950/40 relative flex-shrink-0 overflow-hidden`}>
                  {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-black text-2xl uppercase">{item.name.charAt(0)}</div>}
                  {isExpiring && <div className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full animate-pulse"><ShieldAlert size={12} /></div>}
                </div>
                <div className={viewMode === 'grid' ? "p-4 space-y-1" : "flex-1 min-w-0"}>
                  <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-xs line-clamp-1 truncate uppercase">{item.name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>{item.stock} {item.unit || 'Pcs'} left</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredCats.map(cat => (
            <button key={cat.id} onClick={() => isAdmin && setEditingCat(cat)} className={`bg-white dark:bg-emerald-900/40 p-4 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all text-center ${!isAdmin ? 'cursor-default' : ''}`}>
              <div className="w-full aspect-square bg-slate-50 dark:bg-emerald-950 rounded-2xl overflow-hidden">
                {cat.image ? <img src={cat.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 font-black text-2xl uppercase">{cat.name.charAt(0)}</div>}
              </div>
              <p className="font-black text-xs text-slate-800 dark:text-emerald-50 uppercase tracking-widest">{cat.name}</p>
            </button>
          ))}
        </div>
      )}
      
      {/* Modals same as before ... */}
    </div>
  );
};