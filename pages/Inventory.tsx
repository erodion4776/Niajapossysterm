
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem, Category, User as DBUser } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
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
  
  // Barcode Scanner State
  const [isScanningBarcode, setIsScanningBarcode] = useState<'add' | 'edit' | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "inventory-barcode-reader";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Updater State
  const [bulkData, setBulkData] = useState({
    targetCategory: 'All',
    updateType: 'Percentage' as 'Percentage' | 'Fixed',
    targetField: 'Selling Price' as 'Selling Price' | 'Cost Price',
    value: 0
  });

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
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

  const [catFormData, setCatFormData] = useState<Omit<Category, 'id'>>({
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
        alert("Camera Access Denied. Please enable camera permissions in your browser settings to use the scanner.");
        setIsScanningBarcode(null);
      }
    }, 300);
  };

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setIsScanningBarcode(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    await db.transaction('rw', [db.inventory, db.stock_logs], async () => {
      const id = await db.inventory.add({ ...formData, dateAdded: new Date().toISOString() });
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
      await db.inventory.update(editingItem.id!, { ...editingItem });
      
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
    await db.categories.add({ ...catFormData, dateCreated: Date.now() });
    setCatFormData({ name: '', image: '' });
    setShowCatModal(false);
  };

  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !isAdmin) return;
    await db.categories.update(editingCat.id!, { ...editingCat });
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
          [bulkData.targetField === 'Selling Price' ? 'sellingPrice' : 'costPrice']: newPrice
        };
      });

      await db.inventory.bulkPut(updatedItems);
      alert(`₦-Inflation Protection Applied! ${updatedItems.length} prices updated and rounded to nearest ₦50.`);
      setShowBulkModal(false);
    } catch (err) {
      alert("Bulk update failed. " + (err as Error).message);
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

  // Real-time Profit Calculation for Add/Edit
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
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Position product barcode in the frame</p>
          </div>
          <div id={scannerContainerId} className="w-full max-w-sm aspect-square rounded-[48px] overflow-hidden border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(5,150,105,0.2)]"></div>
          <div className="mt-12 flex items-center gap-3 text-emerald-400 opacity-60">
             <Scan size={20} className="animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Active</span>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Stock</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Inventory Control</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(Page.STOCK_LOGS)}
            className="p-4 bg-white dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-[24px] border border-slate-100 dark:border-emerald-800/40 active:scale-90 transition-all shadow-sm"
            title="Stock History"
          >
            <History size={20} />
          </button>
          {isAdmin && activeTab === 'products' && (
            <button 
              onClick={() => setShowBulkModal(true)}
              className="p-4 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-[24px] border border-amber-100 dark:border-amber-800/40 active:scale-90 transition-all shadow-sm"
              title="Inflation Protector"
            >
              <TrendingUp size={20} />
            </button>
          )}
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-4 bg-white dark:bg-emerald-900/40 text-slate-400 dark:text-emerald-400 rounded-[24px] border border-slate-100 dark:border-emerald-800/40 active:scale-90 transition-all shadow-sm"
          >
            {viewMode === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
          {isAdmin && (
            <button onClick={() => activeTab === 'products' ? setShowAddModal(true) : setShowCatModal(true)} className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg active:scale-90 transition-all">
              <Plus size={24} />
            </button>
          )}
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 dark:bg-emerald-900/40 p-1.5 rounded-[24px] border border-slate-200 dark:border-emerald-800/40">
        <button onClick={() => setActiveTab('products')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-emerald-800 text-emerald-600 dark:text-emerald-50 shadow-sm' : 'text-slate-400'}`}>
          <Package size={16} /> Products
        </button>
        <button onClick={() => setActiveTab('categories')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-emerald-800 text-emerald-600 dark:text-emerald-50 shadow-sm' : 'text-slate-400'}`}>
          <Tag size={16} /> Categories
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar scroll-smooth no-scrollbar">
          <button onClick={() => setSelectedCat('All')} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCat === 'All' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-emerald-900 border-slate-100 dark:border-emerald-800 text-slate-400'}`}>All</button>
          {categories?.map(c => (
            <button key={c.id} onClick={() => setSelectedCat(c.name)} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCat === c.name ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-emerald-900 border-slate-100 dark:border-emerald-800 text-slate-400'}`}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-emerald-800" size={18} />
        <input 
          type="text" placeholder={`Search ${activeTab}...`}
          className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900/40 border border-gray-100 dark:border-emerald-800/40 rounded-[24px] focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-emerald-50 font-medium shadow-sm"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {activeTab === 'products' ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "space-y-3"}>
          {filteredItems.map(item => {
            const isLow = item.stock <= (item.minStock || 5);
            const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 7));
            
            if (viewMode === 'grid') {
              return (
                <button key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)} className={`bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 overflow-hidden shadow-sm flex flex-col active:scale-[0.97] transition-all text-left group ${!isAdmin ? 'cursor-default' : ''}`}>
                  <div className="h-32 w-full bg-slate-100 dark:bg-emerald-950/40 relative">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    {isExpiring && <div className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full animate-pulse"><ShieldAlert size={12} /></div>}
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-xs line-clamp-1">{item.name}</h3>
                    <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>{item.stock} {item.unit || 'Pcs'} left</span>
                  </div>
                </button>
              );
            }
            return (
              <button key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)} className={`bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-gray-50 dark:border-emerald-800/20 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left ${!isAdmin ? 'cursor-default' : ''}`}>
                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-emerald-950 overflow-hidden border dark:border-emerald-800/40">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-lg uppercase">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-sm truncate">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5"><p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p><span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-emerald-950 text-gray-500'}`}>{item.stock} {item.unit || 'Pcs'} in stock</span></div>
                </div>
                {isAdmin && <Edit3 size={16} className="text-gray-200" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredCats.map(cat => (
            <button key={cat.id} onClick={() => isAdmin && setEditingCat(cat)} className={`bg-white dark:bg-emerald-900/40 p-4 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all text-center ${!isAdmin ? 'cursor-default' : ''}`}>
              <div className="w-full aspect-square bg-slate-50 dark:bg-emerald-950 rounded-2xl overflow-hidden">
                {cat.image ? (
                  <img src={cat.image} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase">
                    {cat.name.charAt(0)}
                  </div>
                )}
              </div>
              <p className="font-black text-xs text-slate-800 dark:text-emerald-50 uppercase tracking-widest">{cat.name}</p>
            </button>
          ))}
        </div>
      )}

      {/* MODALS START HERE */}

      {/* Add Product Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] px-8 pt-6 pb-4 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[92vh]">
            <div className="sticky top-0 bg-white dark:bg-emerald-900 z-[210] flex justify-between items-center pb-4 -mx-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic">Stock New Item</h2>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-1 pb-24">
              {/* Image Upload Area */}
              <div className="flex justify-center mt-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[32px] bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-4 border-white dark:border-emerald-800 shadow-xl">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <ImageIcon size={40} />
                        <span className="text-[8px] font-black uppercase">No Photo</span>
                      </div>
                    )}
                    {isProcessingImage && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="add-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'product-add')} />
                  <label htmlFor="add-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all cursor-pointer"><Camera size={18} /></label>
                  {formData.image && <button type="button" onClick={() => removeImage('product-add')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all"><X size={14}/></button>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Product Name</label>
                  <div className="relative">
                    <input 
                      required 
                      className="w-full p-4 pr-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Peak Milk Tin" 
                    />
                    {formData.name && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, name: ''})} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cost Price (₦)</label>
                    <input 
                      required 
                      type="number" 
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={formData.costPrice || ''} 
                      onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Selling Price (₦)</label>
                    <input 
                      required 
                      type="number" 
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={formData.sellingPrice || ''} 
                      onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} 
                    />
                    {formData.costPrice > 0 && formData.sellingPrice > 0 && (() => {
                      const { profit, margin } = calculateProfitData(formData.costPrice, formData.sellingPrice);
                      const isLoss = profit < 0;
                      return (
                        <p className={`text-[10px] font-black uppercase tracking-tight ml-2 mt-1 ${isLoss ? 'text-red-500' : 'text-emerald-600'}`}>
                          {isLoss ? '⚠️ Warning: Selling at a loss!' : `💰 Expected Profit: ${formatNaira(profit)} (${margin}%)`}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Stock & Unit</label>
                  <div className="grid grid-cols-3 sm:flex gap-3">
                    <input 
                      required 
                      type="number" 
                      inputMode="numeric"
                      className="col-span-1 sm:w-24 p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500 text-center" 
                      value={formData.stock || ''} 
                      onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
                      placeholder="Qty"
                    />
                    <select 
                      className="col-span-2 flex-1 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none px-4 text-xs uppercase tracking-widest focus:ring-2 focus:ring-emerald-500"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    >
                      {NAIJA_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                    <select className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none text-sm focus:ring-2 focus:ring-emerald-500 min-w-[150px]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Expiry Date</label>
                    <div className="flex gap-2">
                      <input type="date" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none text-xs focus:ring-2 focus:ring-emerald-500" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                      <button type="button" onClick={() => setShowScanner('add')} className="p-4 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl active:scale-90"><Scan size={20}/></button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Supplier Name (Optional)</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      className="w-full p-4 pl-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={formData.supplierName} 
                      onChange={e => setFormData({...formData, supplierName: e.target.value})} 
                      placeholder="e.g. Alh. Ganiyu Supplies" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Barcode (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full p-4 pl-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Scan or type barcode" />
                    </div>
                    <button type="button" onClick={() => startBarcodeScanner('add')} className="w-14 shrink-0 bg-emerald-600 text-white rounded-2xl active:scale-90 shadow-lg flex items-center justify-center"><Camera size={20}/></button>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-6 rounded-[28px] shadow-xl uppercase tracking-widest text-sm active:scale-[0.98] transition-all">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] px-8 pt-6 pb-4 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[92vh]">
            <div className="sticky top-0 bg-white dark:bg-emerald-900 z-[210] flex justify-between items-center pb-4 -mx-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic">Update Item</h2>
              <button onClick={() => setEditingItem(null)} className="p-3 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateItem} className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-1 pb-24">
              <div className="flex justify-center mt-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-[32px] bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-4 border-white dark:border-emerald-800 shadow-xl">
                    {editingItem.image ? (
                      <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={40} className="text-slate-200" />
                    )}
                    {isProcessingImage && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="edit-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'product-edit')} />
                  <label htmlFor="edit-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 cursor-pointer"><Camera size={18} /></label>
                  {editingItem.image && <button type="button" onClick={() => removeImage('product-edit')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all"><X size={14}/></button>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Product Name</label>
                  <div className="relative">
                    <input 
                      required 
                      className="w-full p-4 pr-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={editingItem.name} 
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setEditingItem({...editingItem, name: ''})} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cost Price (₦)</label>
                    <input 
                      required 
                      type="number" 
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={editingItem.costPrice || ''} 
                      onChange={e => setEditingItem({...editingItem, costPrice: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Selling Price (₦)</label>
                    <input 
                      required 
                      type="number" 
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={editingItem.sellingPrice || ''} 
                      onChange={e => setEditingItem({...editingItem, sellingPrice: Number(e.target.value)})} 
                    />
                    {editingItem.costPrice > 0 && editingItem.sellingPrice > 0 && (() => {
                      const { profit, margin } = calculateProfitData(editingItem.costPrice, editingItem.sellingPrice);
                      const isLoss = profit < 0;
                      return (
                        <p className={`text-[10px] font-black uppercase tracking-tight ml-2 mt-1 ${isLoss ? 'text-red-500' : 'text-emerald-600'}`}>
                          {isLoss ? '⚠️ Warning: Selling at a loss!' : `💰 Expected Profit: ${formatNaira(profit)} (${margin}%)`}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Stock & Unit</label>
                  <div className="grid grid-cols-3 sm:flex gap-3">
                    <input 
                      required 
                      type="number" 
                      inputMode="numeric"
                      className="col-span-1 sm:w-24 p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500 text-center" 
                      value={editingItem.stock || ''} 
                      onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})} 
                      placeholder="Qty"
                    />
                    <select 
                      className="col-span-2 flex-1 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none px-4 text-xs uppercase tracking-widest focus:ring-2 focus:ring-emerald-500"
                      value={editingItem.unit || 'Pcs'}
                      onChange={e => setEditingItem({...editingItem, unit: e.target.value})}
                    >
                      {NAIJA_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                    <select className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none text-sm focus:ring-2 focus:ring-emerald-500 min-w-[150px]" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})}>
                      {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Expiry Date</label>
                    <div className="flex gap-2">
                      <input type="date" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none text-xs focus:ring-2 focus:ring-emerald-500" value={editingItem.expiryDate} onChange={e => setEditingItem({...editingItem, expiryDate: e.target.value})} />
                      <button type="button" onClick={() => setShowScanner('edit')} className="p-4 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl active:scale-90"><Scan size={20}/></button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Supplier Name (Optional)</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      className="w-full p-4 pl-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={editingItem.supplierName || ''} 
                      onChange={e => setEditingItem({...editingItem, supplierName: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Barcode</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full p-4 pl-12 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" value={editingItem.barcode} onChange={e => setEditingItem({...editingItem, barcode: e.target.value})} />
                    </div>
                    <button type="button" onClick={() => startBarcodeScanner('edit')} className="w-14 shrink-0 bg-emerald-600 text-white rounded-2xl active:scale-90 shadow-lg flex items-center justify-center"><Camera size={20}/></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-6 rounded-[28px] shadow-xl uppercase tracking-widest text-sm active:scale-[0.98] transition-all">
                  Update Product
                </button>
                <button type="button" onClick={() => editingItem.id && handleDeleteItem(editingItem.id)} className="w-full py-4 text-red-300 font-black uppercase text-[8px] tracking-widest hover:text-red-500 transition-colors">
                  Remove from Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">New Category</h2>
              <button onClick={() => setShowCatModal(false)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddCat} className="space-y-6">
               <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-2 dark:border-emerald-800">
                    {catFormData.image ? (
                      <img src={catFormData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-slate-200" />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="cat-add-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cat-add')} />
                  <label htmlFor="cat-add-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer"><Camera size={16} /></label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label>
                <input required className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" value={catFormData.name} onChange={e => setCatFormData({...catFormData, name: e.target.value})} placeholder="e.g. Drinks" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all">Create Category</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCat && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Edit Category</h2>
              <button onClick={() => setEditingCat(null)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateCat} className="space-y-6">
               <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-2 dark:border-emerald-800">
                    {editingCat.image ? (
                      <img src={editingCat.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-slate-200" />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="cat-edit-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cat-edit')} />
                  <label htmlFor="cat-edit-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer"><Camera size={16} /></label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label>
                <input required className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all">Update Name</button>
                {editingCat.name !== 'Uncategorized' && editingCat.name !== 'General' && (
                  <button type="button" onClick={() => editingCat.id && handleDeleteCat(editingCat.id)} className="w-full py-3 text-red-300 font-bold uppercase text-[8px] tracking-widest hover:text-red-500">Delete Category</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inflation Protector (Bulk Update) Modal */}
      {showBulkModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-50 dark:bg-amber-900 rounded-xl text-amber-600"><TrendingUp size={20}/></div>
                   <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 italic">Inflation Protector</h2>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
             </div>
             
             <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-start gap-3">
                   <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                   <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-relaxed">Increase prices for your whole shop in one second. All new prices round to the nearest ₦50.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                      <select 
                        className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none"
                        value={bulkData.targetCategory}
                        onChange={e => setBulkData({...bulkData, targetCategory: e.target.value})}
                      >
                        <option value="All">All Items</option>
                        {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Price</label>
                      <select 
                        className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none"
                        value={bulkData.targetField}
                        onChange={e => setBulkData({...bulkData, targetField: e.target.value as any})}
                      >
                        <option value="Selling Price">Selling Price</option>
                        <option value="Cost Price">Cost Price</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Increase Type</label>
                      <select 
                        className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none"
                        value={bulkData.updateType}
                        onChange={e => setBulkData({...bulkData, updateType: e.target.value as any})}
                      >
                        <option value="Percentage">% Percentage</option>
                        <option value="Fixed">+ Fixed Amount (₦)</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Amount</label>
                      <div className="relative">
                        <input 
                          type="number"
                          className="w-full p-4 pl-10 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-black text-amber-600 outline-none"
                          value={bulkData.value || ''}
                          onChange={(e) => setBulkData({...bulkData, value: Number(e.target.value)})}
                          placeholder="0"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-600/50">{bulkData.updateType === 'Percentage' ? '%' : '₦'}</span>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleApplyBulkUpdate}
                  disabled={isUpdatingBulk}
                  className="w-full bg-amber-600 text-white font-black py-6 rounded-[28px] shadow-xl shadow-amber-100 dark:shadow-none uppercase tracking-widest text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUpdatingBulk ? <Loader2 className="animate-spin" /> : <TrendingUp size={20} />} 
                  {isUpdatingBulk ? 'Updating...' : 'Update Entire Stock'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
