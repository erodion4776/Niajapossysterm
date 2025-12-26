import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { Plus, Search, Package, Edit3, X, Lock, Trash2, ArrowUpCircle, TrendingUp, Wallet, BarChart3, Scan, Calendar, ShieldAlert } from 'lucide-react';
import { Role } from '../types.ts';

interface InventoryProps {
  role: Role;
  initialFilter?: 'all' | 'low-stock' | 'expiring';
  clearInitialFilter?: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ role, initialFilter = 'all', clearInitialFilter }) => {
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice';
  const isAdmin = role === 'Admin' && !isStaffDevice;
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'low-stock' | 'expiring'>(initialFilter);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minStock: 5,
    expiryDate: '',
    category: 'General',
    barcode: ''
  });

  // Sync internal filter state with prop from Dashboard
  useEffect(() => {
    setCurrentFilter(initialFilter);
  }, [initialFilter]);

  // Financial Calculations
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    try {
      await db.inventory.add({
        ...formData,
        dateAdded: new Date().toISOString()
      });
      setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, minStock: 5, expiryDate: '', category: 'General', barcode: '' });
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to add item: " + (err as Error).message);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !isAdmin) return;

    try {
      await db.inventory.update(editingItem.id!, {
        name: editingItem.name,
        costPrice: editingItem.costPrice,
        sellingPrice: editingItem.sellingPrice,
        stock: editingItem.stock,
        minStock: editingItem.minStock,
        expiryDate: editingItem.expiryDate,
        category: editingItem.category,
        barcode: editingItem.barcode
      });
      setEditingItem(null);
    } catch (err) {
      alert("Failed to update item: " + (err as Error).message);
    }
  };

  const handleDeleteItem = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this item? This cannot be undone.")) return;
    try {
      await db.inventory.delete(id);
      setEditingItem(null);
    } catch (err) {
      alert("Failed to delete item: " + (err as Error).message);
    }
  };

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    
    let items = inventory;
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Apply Alerts filtering
    if (currentFilter === 'low-stock') {
      items = items.filter(i => i.stock <= (i.minStock || 5));
    } else if (currentFilter === 'expiring') {
      items = items.filter(i => {
        if (!i.expiryDate) return false;
        const exp = new Date(i.expiryDate);
        return exp >= now && exp <= sevenDaysFromNow;
      });
    }

    // Apply Search
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm))
    );
  }, [inventory, searchTerm, currentFilter]);

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Inventory</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Store Management</p>
        </div>
        {isAdmin ? (
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-200 active:scale-90 transition-all"
          >
            <Plus size={24} />
          </button>
        ) : (
          <div className="p-4 bg-gray-100 text-gray-400 rounded-[24px]">
            <Lock size={20} />
          </div>
        )}
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button 
          onClick={() => { setCurrentFilter('all'); clearInitialFilter?.(); }}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentFilter === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-gray-400 border border-gray-100'}`}
        >
          All Stock
        </button>
        <button 
          onClick={() => { setCurrentFilter('low-stock'); clearInitialFilter?.(); }}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentFilter === 'low-stock' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white text-gray-400 border border-gray-100'}`}
        >
          Low Stock
        </button>
        <button 
          onClick={() => { setCurrentFilter('expiring'); clearInitialFilter?.(); }}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${currentFilter === 'expiring' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-white text-gray-400 border border-gray-100'}`}
        >
          Expiring Soon
        </button>
      </div>

      {isAdmin && currentFilter === 'all' && (
        <section className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-emerald-500" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Warehouse Valuation</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Stock Cost</p>
              <p className="text-lg font-black text-gray-800 leading-none">{formatNaira(stats.totalCost)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Potential Profit</p>
              <p className="text-lg font-black text-emerald-600 leading-none">{formatNaira(stats.potentialProfit)}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Estimated Revenue</p>
                <p className="text-xl font-black text-gray-900">{formatNaira(stats.totalValue)}</p>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input 
          type="text" 
          placeholder="Search name or barcode..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => {
          const isLow = item.stock <= (item.minStock || 5);
          const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 7));
          
          return (
            <button 
              key={item.id} 
              disabled={!isAdmin}
              onClick={() => isAdmin && setEditingItem(item)}
              className={`bg-white p-5 rounded-[32px] border border-gray-50 flex items-center gap-5 shadow-sm text-left transition-transform group ${isAdmin ? 'active:scale-[0.98]' : 'cursor-default'}`}
            >
              <div className={`p-4 rounded-[22px] transition-colors ${isExpiring ? 'bg-red-50 text-red-500' : isLow ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {isExpiring ? <ShieldAlert size={24} /> : <Package size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors">{item.name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <p className="text-emerald-600 font-black text-base">{formatNaira(item.sellingPrice)}</p>
                    {item.expiryDate && (
                      <p className={`text-[8px] font-black uppercase mt-1 ${isExpiring ? 'text-red-500' : 'text-gray-400'}`}>
                        Exp: {new Date(item.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${isLow ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                      {item.stock} in stock
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && <Edit3 size={18} className="text-gray-200 group-hover:text-emerald-400 transition-colors" />}
            </button>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="py-24 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
             <Package className="mx-auto text-gray-200" size={48} />
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No items found in this category</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight italic">New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-3 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Barcode</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-2">Expiry Date</label>
                  <input type="date" className="w-full p-4 bg-red-50/30 border border-red-100 rounded-2xl font-bold" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cost (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Stock Level</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-2">Min. Stock</label>
                  <input type="number" className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl font-bold" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Update Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">Edit Item</h2>
              <button onClick={() => setEditingItem(null)} className="bg-gray-100 p-3 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateItem} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Barcode</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={editingItem.barcode || ''} onChange={e => setEditingItem({...editingItem, barcode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-2">Expiry Date</label>
                  <input type="date" className="w-full p-4 bg-red-50/30 border border-red-100 rounded-2xl font-bold" value={editingItem.expiryDate || ''} onChange={e => setEditingItem({...editingItem, expiryDate: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cost (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={editingItem.costPrice} onChange={e => setEditingItem({...editingItem, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={editingItem.sellingPrice} onChange={e => setEditingItem({...editingItem, sellingPrice: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <ArrowUpCircle size={14}/> Stock / Min Level
                  </label>
                  <span className="text-emerald-800 font-black text-xl">{editingItem.stock} <span className="text-[10px] text-gray-400 opacity-60">/ min {editingItem.minStock || 5}</span></span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Set Stock" 
                    value={editingItem.stock}
                    className="flex-1 bg-white border-none rounded-xl text-center text-xs font-bold shadow-sm py-2"
                    onChange={(e) => setEditingItem({...editingItem, stock: Number(e.target.value)})}
                  />
                  <input 
                    type="number" 
                    placeholder="Set Min" 
                    value={editingItem.minStock}
                    className="flex-1 bg-orange-100/50 border-none rounded-xl text-center text-xs font-bold shadow-sm py-2"
                    onChange={(e) => setEditingItem({...editingItem, minStock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id!)}
                  className="bg-red-50 text-red-500 p-5 rounded-2xl active:scale-95 transition-all"
                >
                  <Trash2 size={24} />
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};