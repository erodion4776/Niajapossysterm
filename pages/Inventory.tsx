import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem, Category } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Plus, Search, Package, Edit3, X, Trash2, 
  Camera, LayoutGrid, List, Image as ImageIcon, Loader2,
  Tag, ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { Role } from '../types.ts';
import { ExpiryScanner } from '../components/ExpiryScanner.tsx';
import { processImage } from '../utils/images.ts';

interface InventoryProps {
  role: Role;
  initialFilter?: 'all' | 'low-stock' | 'expiring';
  clearInitialFilter?: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ role, initialFilter = 'all', clearInitialFilter }) => {
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice';
  const isAdmin = role === 'Admin' && !isStaffDevice;
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'low-stock' | 'expiring'>(initialFilter);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('inventory_view') as any) || 'grid');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showScanner, setShowScanner] = useState<'add' | 'edit' | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  
  // Bulk Updater State
  const [bulkStep, setBulkStep] = useState<1 | 2>(1);
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
    minStock: 5,
    expiryDate: '',
    category: 'General',
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await db.inventory.add({ ...formData, dateAdded: new Date().toISOString() });
    setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, minStock: 5, expiryDate: '', category: 'General', barcode: '', image: '' });
    setShowAddModal(false);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !isAdmin) return;
    await db.inventory.update(editingItem.id!, { ...editingItem });
    setEditingItem(null);
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await db.categories.add(catFormData);
    setCatFormData({ name: '', image: '' });
    setShowCatModal(false);
  };

  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !isAdmin) return;
    await db.categories.update(editingCat.id!, { ...editingCat });
    setEditingCat(null);
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

        // Smart Rounding to nearest ₦50 for Nigerian context
        newPrice = Math.ceil(newPrice / 50) * 50;

        return {
          ...item,
          [bulkData.targetField === 'Selling Price' ? 'sellingPrice' : 'costPrice']: newPrice
        };
      });

      await db.inventory.bulkPut(updatedItems);
      alert(`₦-Inflation Protection Applied! ${updatedItems.length} prices updated and rounded to nearest ₦50.`);
      setShowBulkModal(false);
      setBulkStep(1);
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

    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm))
    );
  }, [inventory, searchTerm, currentFilter]);

  const filteredCats = useMemo(() => {
    return categories?.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  }, [categories, searchTerm]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
      {showScanner && <ExpiryScanner onDateFound={d => {
        if (showScanner === 'add') setFormData(p => ({ ...p, expiryDate: d }));
        else if (editingItem) setEditingItem({ ...editingItem, expiryDate: d });
        setShowScanner(null);
      }} onClose={() => setShowScanner(null)} />}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Stock</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Inventory Control</p>
        </div>
        <div className="flex gap-2">
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
                <button key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)} className="bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 overflow-hidden shadow-sm flex flex-col active:scale-[0.97] transition-all text-left group">
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
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>{item.stock} left</span>
                  </div>
                </button>
              );
            }
            return (
              <button key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-gray-50 dark:border-emerald-800/20 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left">
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
                  <div className="flex items-center gap-2 mt-0.5"><p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p><span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-emerald-950 text-gray-500'}`}>{item.stock} in stock</span></div>
                </div>
                {isAdmin && <Edit3 size={16} className="text-gray-200" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredCats.map(cat => (
            <button key={cat.id} onClick={() => isAdmin && setEditingCat(cat)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all text-center">
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

      {/* Inflation Protector (Bulk Update) Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-2 rounded-xl text-amber-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">Inflation Protector</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bulk Price Updater</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkStep(1); }} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            {bulkStep === 1 ? (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/40 flex items-start gap-4">
                  <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                    Protect your profit margin from inflation. Increase prices across categories or your entire shop instantly.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Target Category</label>
                    <select 
                      className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50"
                      value={bulkData.targetCategory}
                      onChange={e => setBulkData({...bulkData, targetCategory: e.target.value})}
                    >
                      <option value="All">All Items</option>
                      {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Target Field</label>
                    <div className="flex bg-slate-100 dark:bg-emerald-950/40 p-1 rounded-2xl gap-1">
                      {['Selling Price', 'Cost Price'].map(field => (
                        <button 
                          key={field}
                          onClick={() => setBulkData({...bulkData, targetField: field as any})}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bulkData.targetField === field ? 'bg-white dark:bg-emerald-800 text-emerald-600 dark:text-emerald-50 shadow-sm' : 'text-slate-400'}`}
                        >
                          {field}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Increase Type</label>
                    <div className="flex bg-slate-100 dark:bg-emerald-950/40 p-1 rounded-2xl gap-1">
                      {['Percentage', 'Fixed'].map(type => (
                        <button 
                          key={type}
                          onClick={() => setBulkData({...bulkData, updateType: type as any})}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bulkData.updateType === type ? 'bg-white dark:bg-emerald-800 text-emerald-600 dark:text-emerald-50 shadow-sm' : 'text-slate-400'}`}
                        >
                          {type === 'Percentage' ? 'By %' : 'By Fixed ₦'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                      {bulkData.updateType === 'Percentage' ? 'Increase Percentage (%)' : 'Increase Amount (₦)' }
                    </label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50 text-xl"
                      value={bulkData.value || ''}
                      onChange={e => setBulkData({...bulkData, value: Number(e.target.value)})}
                      placeholder={bulkData.updateType === 'Percentage' ? "e.g. 10" : "e.g. 500"}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setBulkStep(2)}
                  disabled={!bulkData.value}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-[28px] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Review Changes <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Summary</p>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-emerald-50 tracking-tighter">
                    {bulkData.updateType === 'Percentage' ? `+${bulkData.value}%` : `+₦${bulkData.value.toLocaleString()}`}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Increase on <span className="text-emerald-600">{bulkData.targetField}</span>
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-emerald-950/40 p-6 rounded-[32px] border dark:border-emerald-800/20 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Affected Category</span>
                    <span className="text-slate-800 dark:text-emerald-50 font-black">{bulkData.targetCategory}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Estimated Items</span>
                    <span className="text-slate-800 dark:text-emerald-50 font-black">
                      {bulkData.targetCategory === 'All' ? inventory?.length : inventory?.filter(i => i.category === bulkData.targetCategory).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Rounding Rule</span>
                    <span className="text-emerald-600 font-black">Nearest ₦50</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleApplyBulkUpdate}
                    disabled={isUpdatingBulk}
                    className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                  >
                    {isUpdatingBulk ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {isUpdatingBulk ? "Updating..." : "Apply Protection Now"}
                  </button>
                  <button 
                    onClick={() => setBulkStep(1)}
                    className="w-full py-4 text-slate-400 dark:text-emerald-500/40 font-bold uppercase text-[10px] tracking-widest"
                  >
                    Go Back & Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">New Product</h2><button onClick={() => setShowAddModal(false)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button></div>
            <form onSubmit={handleAddItem} className="space-y-6 pb-4">
              <div className="flex flex-col items-center">
                <div className={`relative group w-full max-w-[200px] aspect-square bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-dashed ${formData.image ? 'border-emerald-500' : 'border-slate-200 dark:border-emerald-800'} shadow-xl overflow-hidden flex flex-col items-center justify-center transition-all`}>
                  {formData.image ? (
                    <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera size={32} className="mx-auto text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-widest">Add Product Photo</span>
                    </div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'product-add')} />
                  {formData.image && (
                    <button type="button" onClick={() => removeImage('product-add')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-20 active:scale-90"><X size={16} /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label><input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label><select className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div><div className="space-y-1"><label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-2 flex justify-between items-center">Expiry <button type="button" onClick={() => setShowScanner('add')} className="text-emerald-500"><Camera size={12} /></button></label><input type="date" className="w-full p-4 bg-red-50/30 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl font-bold dark:text-emerald-50" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cost Price (₦)</label><input required type="number" step="0.01" inputMode="decimal" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2">Selling Price (₦)</label><input required type="number" step="0.01" inputMode="decimal" className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Stock Level</label><input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Min. Stock</label><input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} /></div></div>
              <button type="submit" disabled={isProcessingImage} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Save Product</button>
            </form>
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">Edit Item</h2><button onClick={() => setEditingItem(null)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button></div>
            <form onSubmit={handleUpdateItem} className="space-y-6 pb-4">
              <div className="flex flex-col items-center">
                <div className={`relative group w-full max-w-[200px] aspect-square bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-dashed ${editingItem.image ? 'border-emerald-500' : 'border-slate-200 dark:border-emerald-800'} shadow-xl overflow-hidden flex flex-col items-center justify-center transition-all`}>
                  {editingItem.image ? (
                    <img src={editingItem.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera size={32} className="mx-auto text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-widest">Update Photo</span>
                    </div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'product-edit')} />
                  {editingItem.image && (
                    <button type="button" onClick={() => removeImage('product-edit')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-20 active:scale-90"><X size={16} /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Product Name</label><input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cost Price (₦)</label><input required type="number" step="0.01" inputMode="decimal" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.costPrice} onChange={e => setEditingItem({...editingItem, costPrice: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-emerald-600 uppercase ml-2">Selling Price (₦)</label><input required type="number" step="0.01" inputMode="decimal" className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.sellingPrice} onChange={e => setEditingItem({...editingItem, sellingPrice: Number(e.target.value)})} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Stock Level</label><input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.stock} onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 text-orange-400">Min. Stock</label><input type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.minStock || ''} onChange={e => setEditingItem({...editingItem, minStock: Number(e.target.value)})} /></div></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => {if(confirm("Delete item?")) db.inventory.delete(editingItem.id!); setEditingItem(null);}} className="bg-red-50 dark:bg-red-950/20 text-red-500 p-5 rounded-2xl"><Trash2 size={24} /></button><button type="submit" disabled={isProcessingImage} className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Update Product</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">New Category</h2><button onClick={() => setShowCatModal(false)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button></div>
            <form onSubmit={handleAddCat} className="space-y-6 pb-4">
              <div className="flex flex-col items-center">
                <div className={`relative group w-full max-w-[200px] aspect-square bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-dashed ${catFormData.image ? 'border-emerald-500' : 'border-slate-200 dark:border-emerald-800'} shadow-xl overflow-hidden flex flex-col items-center justify-center transition-all`}>
                  {catFormData.image ? (
                    <img src={catFormData.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera size={32} className="mx-auto text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-widest">Category Photo</span>
                    </div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cat-add')} />
                  {catFormData.image && (
                    <button type="button" onClick={() => removeImage('cat-add')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-20 active:scale-90"><X size={16} /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category Name</label><input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={catFormData.name} onChange={e => setCatFormData({...catFormData, name: e.target.value})} /></div>
              <button type="submit" disabled={isProcessingImage} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Save Category</button>
            </form>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">Edit Category</h2><button onClick={() => setEditingCat(null)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button></div>
            <form onSubmit={handleUpdateCat} className="space-y-6 pb-4">
              <div className="flex flex-col items-center">
                <div className={`relative group w-full max-w-[200px] aspect-square bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-dashed ${editingCat.image ? 'border-emerald-500' : 'border-slate-200 dark:border-emerald-800'} shadow-xl overflow-hidden flex flex-col items-center justify-center transition-all`}>
                  {editingCat.image ? (
                    <img src={editingCat.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera size={32} className="mx-auto text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-widest">Update Photo</span>
                    </div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cat-edit')} />
                  {editingCat.image && (
                    <button type="button" onClick={() => removeImage('cat-edit')} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-20 active:scale-90"><X size={16} /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category Name</label><input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => {if(confirm("Delete category?")) db.categories.delete(editingCat.id!); setEditingCat(null);}} className="bg-red-50 dark:bg-red-950/20 text-red-500 p-5 rounded-2xl"><Trash2 size={24} /></button><button type="submit" disabled={isProcessingImage} className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Update Category</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
