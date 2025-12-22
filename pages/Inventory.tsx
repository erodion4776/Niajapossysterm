import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { Plus, Search, Package, MoreVertical, X, Lock } from 'lucide-react';
import { Role } from '../types.ts';

interface InventoryProps {
  role: Role;
}

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const isAdmin = role === 'Admin';
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    category: 'General'
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    await db.inventory.add(formData);
    setFormData({ name: '', costPrice: 0, sellingPrice: 0, stock: 0, category: 'General' });
    setShowAddModal(false);
  };

  const filteredItems = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        {isAdmin ? (
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        ) : (
          <div className="p-3 bg-gray-100 text-gray-400 rounded-2xl" title="Admin only">
            <Lock size={20} />
          </div>
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search items..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-50 flex items-center gap-4 shadow-sm">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
              <Package size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-800 text-lg leading-tight">{item.name}</h3>
              <div className="flex justify-between items-center mt-2">
                <div>
                  <p className="text-emerald-700 font-bold">{formatNaira(item.sellingPrice)}</p>
                  {isAdmin && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cost: {formatNaira(item.costPrice)}</p>}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${item.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {item.stock} Unit{item.stock !== 1 && 's'}
                </span>
              </div>
            </div>
            {isAdmin && (
              <button className="text-gray-300 hover:text-gray-600 transition-colors">
                <MoreVertical size={20} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800">New Item</h2>
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Item Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-400"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cost (₦)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900"
                    value={formData.costPrice || ''}
                    onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Price (₦)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900"
                    value={formData.sellingPrice || ''}
                    onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Initial Stock</label>
                <input 
                  required
                  type="number" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900"
                  value={formData.stock || ''}
                  onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all"
              >
                Register Stock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
