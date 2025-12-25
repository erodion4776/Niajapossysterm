import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { Plus, Search, Package, Edit3, X, Lock, Trash2, ArrowUpCircle, TrendingUp, Wallet, BarChart3, Scan } from 'lucide-react';
import { Role } from '../types.ts';

interface InventoryProps {
  role: Role;
}

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const isStaffDevice = localStorage.getItem('device_role') === 'StaffDevice';
  const isAdmin = role === 'Admin' && !isStaffDevice;
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    category: 'General',
    barcode: ''
  });

  // Financial Calculations for the Header
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
      setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, category: 'General', barcode: '' });
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

  const filteredItems = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.barcode && item.barcode.includes(searchTerm))
  ) || [];

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

      {/* Admin Financial Dashboard - Hidden for Staff Devices */}
      {isAdmin && (
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
        {filteredItems.map(item => (
          <button 
            key={item.id} 
            disabled={!isAdmin}
            onClick={() => isAdmin && setEditingItem(item)}
            className={`bg-white p-5 rounded-[32px] border border-gray-50 flex items-center gap-5 shadow-sm text-left transition-transform group ${isAdmin ? 'active:scale-[0.98]' : 'cursor-default'}`}
          >
            <div className={`p-4 rounded-[22px] transition-colors ${item.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
              <Package size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors">{item.name}</h3>
              <div className="flex justify-between items-center mt-2">
                <div>
                  <p className="text-emerald-600 font-black text-base">{formatNaira(item.sellingPrice)}</p>
                  <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">{item.category}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${item.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.stock} in stock
                  </span>
                </div>
              </div>
            </div>
            {isAdmin && <Edit3 size={18} className="text-gray-200 group-hover:text-emerald-400 transition-colors" />}
          </button>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800">Add Product</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-3 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item Name</label>
                <input required type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Barcode (Optional)</label>
                <div className="relative">
                  <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input type="text" className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cost (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price (₦)</label>
                  <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Initial Stock</label>
                <input required type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs">
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Barcode (Optional)</label>
                <div className="relative">
                  <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input type="text" className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={editingItem.barcode || ''} onChange={e => setEditingItem({...editingItem, barcode: e.target.value})} />
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
                    <ArrowUpCircle size={14}/> Current Stock
                  </label>
                  <span className="text-emerald-800 font-black text-xl">{editingItem.stock}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingItem({...editingItem, stock: editingItem.stock + 10})} className="flex-1 bg-white text-emerald-600 font-bold py-2 rounded-xl text-[10px] shadow-sm">+10</button>
                  <button type="button" onClick={() => setEditingItem({...editingItem, stock: editingItem.stock + 50})} className="flex-1 bg-white text-emerald-600 font-bold py-2 rounded-xl text-[10px] shadow-sm">+50</button>
                  <input 
                    type="number" 
                    placeholder="Set manual" 
                    className="flex-[2] bg-white border-none rounded-xl text-center text-xs font-bold shadow-sm"
                    onChange={(e) => setEditingItem({...editingItem, stock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id!)}
                  className="bg-red-50 text-red-500 p-5 rounded-2xl hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={24} />
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs">
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