
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Category } from '../db.ts';
import { 
  ArrowLeft, Plus, Trash2, Camera, X, 
  Image as ImageIcon, Loader2, Edit3, Save 
} from 'lucide-react';
import { Page } from '../types.ts';
import { processImage } from '../utils/images.ts';

interface CategoryManagerProps {
  setPage: (page: Page) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ setPage }) => {
  const categories = useLiveQuery(() => db.categories.toArray());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    image: ''
  });

  const handleImageUpload = async (file: File, isEdit: boolean) => {
    setIsProcessing(true);
    try {
      const base64 = await processImage(file);
      if (isEdit && editingCat) {
        setEditingCat({ ...editingCat, image: base64 });
      } else {
        setFormData({ ...formData, image: base64 });
      }
    } catch (err) {
      alert("Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    await db.categories.add({
      name: formData.name,
      image: formData.image,
      dateCreated: Date.now()
    });
    setFormData({ name: '', image: '' });
    setShowAddModal(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name) return;

    // Logic: If renaming, update all items in inventory too
    const original = categories?.find(c => c.id === editingCat.id);
    if (original && original.name !== editingCat.name) {
      await db.transaction('rw', [db.inventory, db.categories], async () => {
        await db.inventory.where('category').equals(original.name).modify({ category: editingCat.name });
        await db.categories.update(editingCat.id!, {
          name: editingCat.name,
          image: editingCat.image
        });
      });
    } else {
      await db.categories.update(editingCat.id!, {
        name: editingCat.name,
        image: editingCat.image
      });
    }
    setEditingCat(null);
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (name === 'Uncategorized' || name === 'General') return alert("Cannot delete this core category.");
    if (confirm(`Delete category "${name}"? All products inside will be moved to "Uncategorized".`)) {
      try {
        await db.transaction('rw', [db.inventory, db.categories], async () => {
          // Move items to Uncategorized
          await db.inventory.where('category').equals(name).modify({ category: 'Uncategorized' });
          // Delete the category
          await db.categories.delete(id);
        });
      } catch (err) {
        alert("Failed to delete category properly.");
      }
    }
  };

  const CategoryIcon = ({ cat }: { cat: Category }) => (
    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
      {cat.image ? (
        <img src={cat.image} className="w-full h-full object-cover" alt="" />
      ) : (
        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase">{cat.name.charAt(0)}</span>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <button onClick={() => setPage(Page.SETTINGS)} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-slate-400 shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Category Lab</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Shop Folders</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="ml-auto p-4 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all">
          <Plus size={24} />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {categories?.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[32px] border border-slate-50 dark:border-emerald-800/20 flex items-center gap-4 shadow-sm group">
            <CategoryIcon cat={cat} />
            <div className="flex-1">
              <h3 className="font-black text-slate-800 dark:text-emerald-50 text-lg uppercase tracking-tight">{cat.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date(cat.dateCreated || 0).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingCat(cat)} className="p-3 bg-slate-50 dark:bg-emerald-800 text-emerald-600 rounded-xl active:scale-90 transition-all">
                <Edit3 size={18} />
              </button>
              {cat.name !== 'Uncategorized' && cat.name !== 'General' && (
                <button onClick={() => handleDelete(cat.id!, cat.name)} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 italic">New Category</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-2 dark:border-emerald-800">
                    {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={32} className="text-slate-200" />}
                    {isProcessing && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="cat-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)} />
                  <label htmlFor="cat-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer"><Camera size={16} /></label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label>
                <input required className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Toiletries" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Create Category</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 italic">Edit Category</h2>
              <button onClick={() => setEditingCat(null)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-2 dark:border-emerald-800">
                    {editingCat.image ? <img src={editingCat.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={32} className="text-slate-200" />}
                    {isProcessing && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="edit-cat-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)} />
                  <label htmlFor="edit-cat-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer"><Camera size={16} /></label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label>
                <input required className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
