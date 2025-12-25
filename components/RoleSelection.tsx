import React from 'react';
import { User, ShieldCheck, Briefcase, ArrowRight, Store, Smartphone } from 'lucide-react';
import { DeviceRole } from '../types.ts';

interface RoleSelectionProps {
  onSelect: (role: DeviceRole) => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-[24px] flex items-center justify-center mb-6 border border-emerald-500/30 shadow-2xl">
        <Store size={40} className="text-emerald-400" />
      </div>
      
      <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase leading-tight">Welcome to <br/><span className="text-emerald-500">NaijaShop</span></h1>
      <p className="text-emerald-100/60 mb-10 max-w-xs mx-auto text-sm font-medium">
        How will you be using this device today? Choose your role to proceed.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={() => onSelect('Owner')}
          className="w-full bg-white text-emerald-950 p-8 rounded-[40px] flex items-center justify-between group active:scale-95 transition-all shadow-2xl"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="bg-emerald-100 p-4 rounded-3xl text-emerald-600">
              <ShieldCheck size={32} />
            </div>
            <div>
              <p className="font-black text-xl leading-none">Shop Owner</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase mt-2 tracking-widest">Setup Boss Control</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-emerald-200 group-hover:text-emerald-600 transition-colors" />
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-emerald-800"></div></div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.4em] bg-emerald-950 px-4 text-emerald-700">OR</div>
        </div>

        <button 
          onClick={() => onSelect('StaffDevice')}
          className="w-full bg-emerald-900/40 border-2 border-emerald-800/50 p-8 rounded-[40px] flex items-center justify-between group active:scale-95 transition-all shadow-xl"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="bg-emerald-500/20 p-4 rounded-3xl text-emerald-400 border border-emerald-400/20">
              <Smartphone size={32} />
            </div>
            <div>
              <p className="font-black text-xl leading-none">Staff Member</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase mt-2 tracking-widest">Import Boss Key</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-emerald-700 group-hover:text-emerald-400 transition-colors" />
        </button>
      </div>

      <p className="mt-12 text-[9px] font-black text-emerald-800 uppercase tracking-[0.4em]">Secure POS System 🇳🇬</p>
    </div>
  );
};