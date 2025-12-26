import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Plus, Search, Package, Edit3, X, Lock, Trash2, ArrowUpCircle, 
  TrendingUp, Wallet, BarChart3, Scan, Calendar, ShieldAlert, 
  Camera, LayoutGrid, List, Image as ImageIcon, Loader2
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'low-stock' | 'expiring'>(initialFilter);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('inventory_view') as any) || 'list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showScanner, setShowScanner] = useState<'add' | 'edit' | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
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

  useEffect(() => {
    setCurrentFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    localStorage.setItem('inventory_view', viewMode);
  }, [viewMode]);

  const stats = useMemo(() => {
    if (!inventory) return { totalCost: 0, totalValue: 0, potentialProfit: 0 };
    return inventory.reduce((acc, item) => {
      const cost = (item.costPrice || 0) * (item.stock || 0);
      const value = (item.sellingPrice || 0) * (item.stock || 0);
      return {
        totalCost: acc.totalCost + cost,
        totalValue: acc.totalValue + value,
        potentialProfit: acc.potentialProfit + (value - cost)
      };
    }, { totalCost: 0, totalValue: 0, potentialProfit: 0 });
  }, [inventory]);

  const handleImageUpload = async (file: File, type: 'add' | 'edit') => {
    setIsProcessingImage(true);
    try {
      const base64 = await processImage(file);
      if (type === 'add') {
        setFormData(prev => ({ ...prev, image: base64 }));
      } else {
        setEditingItem(prev => prev ? { ...prev, image: base64 } : null);
      }
    } catch (err) {
      alert("Failed to process image");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    try {
      await db.inventory.add({
        ...formData,
        dateAdded: new Date().toISOString()
      });
      setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, minStock: 5, expiryDate: '', category: 'General', barcode: '', image: '' });
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to add item: " + (err as Error).message);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !isAdmin) return;

    try {
      await db.inventory.update(editingItem.id!, { ...editingItem });
      setEditingItem(null);
    } catch (err) {
      alert("Failed to update item");
    }
  };

  const handleDeleteItem = async (id: string | number) => {
    if (!confirm("Are you sure?")) return;
    await db.inventory.delete(id);
    setEditingItem(null);
  };

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    let items = inventory;
    const now = new Date();
    const weekOut = new Date(new Date().setDate(now.getDate() + 7));

    if (currentFilter === 'low-stock') {
      items = items.filter(i => i.stock <= (i.minStock || 5));
    } else if (currentFilter === 'expiring') {
      items = items.filter(i => i.expiryDate && new Date(i.expiryDate) <= weekOut);
    }

    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm))
    );
  }, [inventory, searchTerm, currentFilter]);

  const handleOcrResult = (date: string) => {
    if (showScanner === 'add') setFormData(prev => ({ ...prev, expiryDate: date }));
    else if (showScanner === 'edit' && editingItem) setEditingItem({ ...editingItem, expiryDate: date });
    setShowScanner(null);
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
      {showScanner && <ExpiryScanner onDateFound={handleOcrResult} onClose={() => setShowScanner(null)} />}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Stock</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Inventory Control</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-4 bg-white dark:bg-emerald-900/40 text-slate-400 dark:text-emerald-400 rounded-[24px] border border-slate-100 dark:border-emerald-800/40 active:scale-90 transition-all shadow-sm"
          >
            {viewMode === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
          {isAdmin ? (
            <button onClick={() => setShowAddModal(true)} className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg active:scale-90 transition-all">
              <Plus size={24} />
            </button>
          ) : <div className="p-4 bg-gray-100 dark:bg-emerald-900/40 text-gray-400 rounded-[24px]"><Lock size={20} /></div>}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['all', 'low-stock', 'expiring'].map((f) => (
          <button 
            key={f}
            onClick={() => { setCurrentFilter(f as any); clearInitialFilter?.(); }}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentFilter === f ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-emerald-900/40 text-gray-400 dark:text-emerald-500/40 border border-gray-100 dark:border-emerald-800/40'}`}
          >
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-emerald-800" size={18} />
        <input 
          type="text" placeholder="Search..."
          className="w-full pl-14 pr-6 py-4 bg-white dark:bg-emerald-900/40 border border-gray-100 dark:border-emerald-800/40 rounded-[24px] focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-emerald-50 font-medium shadow-sm"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Visual Grid / List Container */}
      <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "space-y-3"}>
        {filteredItems.map(item => {
          const isLow = item.stock <= (item.minStock || 5);
          const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 7));
          
          if (viewMode === 'grid') {
            return (
              <button 
                key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)}
                className="bg-white dark:bg-emerald-900/40 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 overflow-hidden shadow-sm flex flex-col active:scale-[0.97] transition-all text-left group"
              >
                <div className="h-32 w-full bg-slate-100 dark:bg-emerald-950/40 relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-emerald-900">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {isExpiring && <div className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg animate-pulse"><ShieldAlert size={12} /></div>}
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-xs line-clamp-1">{item.name}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>
                      {item.stock} left
                    </span>
                  </div>
                </div>
              </button>
            );
          }

          return (
            <button 
              key={item.id} disabled={!isAdmin} onClick={() => isAdmin && setEditingItem(item)}
              className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-gray-50 dark:border-emerald-800/20 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-emerald-950 overflow-hidden flex-shrink-0 border dark:border-emerald-800/40">
                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-4 text-slate-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-emerald-50 text-sm truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{formatNaira(item.sellingPrice)}</p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-emerald-950 text-gray-500'}`}>
                    {item.stock} in stock
                  </span>
                </div>
              </div>
              {isAdmin && <Edit3 size={16} className="text-gray-200" />}
            </button>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6 pb-4">
              {/* Image Picker */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-white dark:border-emerald-800 shadow-xl overflow-hidden relative group">
                  {formData.image ? (
                    <img src={formData.image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Camera size={32} />
                      <span className="text-[8px] font-black uppercase mt-1">No Photo</span>
                    </div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input 
                    type="file" accept="image/*" capture="environment" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'add')}
                  />
                </div>
                <p className="text-[10px] font-black text-emerald-500 uppercase mt-4 tracking-widest">Snap Product Photo</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-2 flex justify-between items-center">
                    Expiry <button type="button" onClick={() => setShowScanner('add')} className="text-emerald-500"><Camera size={12} /></button>
                  </label>
                  <input type="date" className="w-full p-4 bg-red-50/30 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl font-bold dark:text-emerald-50" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Selling Price (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Stock Level</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
              </div>

              <button type="submit" disabled={isProcessingImage} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 tracking-tight italic">Edit Item</h2>
              <button onClick={() => setEditingItem(null)} className="bg-gray-100 dark:bg-emerald-800 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateItem} className="space-y-6 pb-4">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-slate-50 dark:bg-emerald-950 rounded-[40px] border-4 border-white dark:border-emerald-800 shadow-xl overflow-hidden relative">
                  {editingItem.image ? (
                    <img src={editingItem.image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><Camera size={32} /></div>
                  )}
                  {isProcessingImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={24} className="text-white animate-spin" /></div>}
                  <input 
                    type="file" accept="image/*" capture="environment" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'edit')}
                  />
                </div>
                <p className="text-[10px] font-black text-emerald-500 uppercase mt-4 tracking-widest">Update Photo</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Product Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Selling Price</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.sellingPrice} onChange={e => setEditingItem({...editingItem, sellingPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Stock Level</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 dark:bg-emerald-950/40 border dark:border-emerald-800/20 rounded-2xl font-bold dark:text-emerald-50" value={editingItem.stock} onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => handleDeleteItem(editingItem.id!)} className="bg-red-50 dark:bg-red-950/20 text-red-500 p-5 rounded-2xl active:scale-95 transition-all"><Trash2 size={24} /></button>
                <button type="submit" disabled={isProcessingImage} className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Update Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};