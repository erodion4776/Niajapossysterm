
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Category } from '../db.ts';
import { 
  ArrowLeft, Plus, Trash2, Camera, X, 
  Image as ImageIcon, Loader2, Edit3, Save,
  FolderTree, LayoutGrid, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Page } from '../types.ts';
import { processImage } from '../utils/images.ts';

interface CategoryLabProps {
  setPage: (page: Page) => void;
}

export const CategoryLab: React.FC<CategoryLabProps> = ({ setPage }) => {
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
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
      alert("Failed to process image. Try a smaller file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    try {
      await db.categories.add({
        name: formData.name.trim(),
        image: formData.image,
        dateCreated: Date.now()
      });
      setFormData({ name: '', image: '' });
      setShowAddModal(false);
    } catch (err) {
      alert("Category name must be unique!");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name.trim()) return;

    const original = categories?.find(c => c.id === editingCat.id);
    if (original && original.name !== editingCat.name) {
      // Sync rename across inventory
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
    if (['Uncategorized', 'General', 'Food', 'Drinks'].includes(name)) {
      alert("Cannot delete core system category.");
      return;
    }

    if (confirm(`Move all products in "${name}" to "Uncategorized" and delete this folder?`)) {
      try {
        await db.transaction('rw', [db.inventory, db.categories], async () => {
          await db.inventory.where('category').equals(name).modify({ category: 'Uncategorized' });
          await db.categories.delete(id);
        });
      } catch (err) {
        alert("Failed to delete category safely.");
      }
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500 overflow-y-auto max-h-screen custom-scrollbar">
      <header className="flex items-center gap-4 sticky top-0 bg-slate-50 dark:bg-emerald-950 py-2 z-10">
        <button onClick={() => setPage(Page.SETTINGS)} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-all">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic uppercase">Category Lab</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Shop Folders & Organization</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="ml-auto p-4 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-200 active:scale-90 transition-all">
          <Plus size={24} />
        </button>
      </header>

      <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-[32px] flex items-center gap-4">
         <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500"><FolderTree size={24}/></div>
         <div>
            <h3 className="text-xs font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-tight italic">Logical Grouping</h3>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Categorized shops sell 40% faster</p>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {categories?.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-emerald-900/40 rounded-[40px] border border-slate-50 dark:border-emerald-800/20 shadow-sm p-4 flex flex-col items-center gap-4 relative group animate-in zoom-in duration-300">
             <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-slate-50 dark:bg-emerald-950 border dark:border-emerald-800 flex items-center justify-center">
                {cat.image ? (
                   <img src={cat.image} className="w-full h-full object-cover" alt="" />
                ) : (
                   <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 uppercase">{cat.name.charAt(0)}</span>
                )}
             </div>
             <div className="text-center">
                <h3 className="font-black text-xs text-slate-800 dark:text-emerald-50 uppercase tracking-widest truncate max-w-[120px]">{cat.name}</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Created: {new Date(cat.dateCreated || 0).toLocaleDateString()}</p>
             </div>
             
             <div className="flex gap-2 w-full pt-2">
                <button onClick={() => setEditingCat(cat)} className="flex-1 p-3 bg-emerald-50 dark:bg-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400 flex justify-center active:scale-95 transition-all">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(cat.id!, cat.name)} className="flex-1 p-3 bg-red-50 dark:bg-red-950/20 text-red-400 rounded-2xl flex justify-center active:scale-95 transition-all">
                  <Trash2 size={16} />
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-t-[48px] sm:rounded-[48px] p-10 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic uppercase tracking-tight">New Folder</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-8">
               <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[40px] bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-4 border-white dark:border-emerald-800 shadow-xl">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <ImageIcon size={40} />
                        <span className="text-[8px] font-black uppercase">Cover Photo</span>
                      </div>
                    )}
                    {isProcessing && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="lab-cat-add-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)} />
                  <label htmlFor="lab-cat-add-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer active:scale-90 transition-all"><Camera size={18} /></label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Folder Name</label>
                <input required className="w-full p-5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-[24px] font-black text-lg text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Cosmetics" />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-6 rounded-[28px] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Create Shop Folder</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-t-[48px] sm:rounded-[48px] p-10 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic uppercase tracking-tight">Edit Folder</h2>
              <button onClick={() => setEditingCat(null)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-8">
               <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[40px] bg-slate-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border-4 border-white dark:border-emerald-800 shadow-xl">
                    {editingCat.image ? (
                      <img src={editingCat.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={40} className="text-slate-200" />
                    )}
                    {isProcessing && <div className="absolute inset-0 bg-white/60 dark:bg-emerald-900/60 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" id="lab-cat-edit-img" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)} />
                  <label htmlFor="lab-cat-edit-img" className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer active:scale-90 transition-all"><Camera size={18} /></label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Update Name</label>
                <input required className="w-full p-5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-[24px] font-black text-lg text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-6 rounded-[28px] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={18}/> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryLab;
