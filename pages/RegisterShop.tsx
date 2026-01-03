
import React, { useState } from 'react';
import { db } from '../db.ts';
import { Store, User, MapPin, Phone, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface RegisterShopProps {
  onComplete: () => void;
}

export const RegisterShop: React.FC<RegisterShopProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    ownerName: '',
    shopName: '',
    address: '',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Save all details to settings table
      await db.settings.bulkPut([
        { key: 'owner_name', value: formData.ownerName },
        { key: 'shop_name', value: formData.shopName },
        { key: 'shop_address', value: formData.address },
        { key: 'shop_phone', value: formData.phone }
      ]);
      
      // Also update localStorage for immediate legacy compatibility
      localStorage.setItem('shop_name', formData.shopName);
      localStorage.setItem('shop_info', formData.address);
      
      onComplete();
    } catch (err) {
      alert("Failed to save shop details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-emerald-950 flex flex-col text-white overflow-y-auto selection:bg-emerald-500/30">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-6 max-w-md mx-auto w-full">
        <header className="pt-12 pb-8 text-center space-y-4 animate-in fade-in slide-in-from-top duration-700">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-2xl mb-4">
             <Store size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Register Your <br/>
            <span className="text-emerald-500">Business</span>
          </h1>
          <p className="text-emerald-100/40 text-[10px] font-bold uppercase tracking-[0.3em]">Step 1 of 2: Identity</p>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-4">Your Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
              <input 
                required 
                type="text"
                placeholder="e.g. Osarodion Odion"
                className="w-full bg-white/5 border border-white/10 rounded-[28px] py-5 pl-14 pr-6 font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                value={formData.ownerName}
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-4">Business Name</label>
            <div className="relative">
              <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
              <input 
                required 
                type="text"
                placeholder="e.g. Naija Choice Pharmacy"
                className="w-full bg-white/5 border border-white/10 rounded-[28px] py-5 pl-14 pr-6 font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                value={formData.shopName}
                onChange={e => setFormData({...formData, shopName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-4">Shop Address</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
              <input 
                required 
                type="text"
                placeholder="e.g. Shop 24, Main Market"
                className="w-full bg-white/5 border border-white/10 rounded-[28px] py-5 pl-14 pr-6 font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-4">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
              <input 
                required 
                type="tel"
                placeholder="e.g. 08012345678"
                className="w-full bg-white/5 border border-white/10 rounded-[28px] py-5 pl-14 pr-6 font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-emerald-500 text-emerald-950 font-black py-6 rounded-[32px] text-lg shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter mt-8"
          >
            {isSaving ? "Saving..." : "Continue to Security"} <ArrowRight size={20} />
          </button>
        </form>

        <footer className="py-8 flex items-center justify-center gap-3 opacity-30">
          <ShieldCheck size={16} />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Secure Data Encryption</p>
        </footer>
      </div>
    </div>
  );
};
