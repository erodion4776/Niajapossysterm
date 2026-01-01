
import React from 'react';
import { ArrowLeft, Store, ShieldCheck, Zap, Heart, Globe, Lock } from 'lucide-react';

interface AboutUsProps {
  onBack: () => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-emerald-950 flex flex-col max-w-lg mx-auto">
      <header className="p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-50 dark:bg-emerald-900 rounded-xl text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic">About NaijaShop</h1>
      </header>

      <main className="flex-1 p-6 space-y-12">
        {/* Mission */}
        <section className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-600 rounded-[32px] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-200">
            <Globe size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Our Mission</h2>
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-[0.9] uppercase italic">
              Ending the Data Tax <br/> for Nigerian SMEs.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
            We build software that understands Nigeria. No network? No problem. No data? No problem. Your business shouldn't stop because the network is down.
          </p>
        </section>

        {/* Story */}
        <section className="bg-slate-50 dark:bg-emerald-900/40 p-8 rounded-[48px] space-y-6">
          <div className="flex items-center gap-3">
             <Heart className="text-red-500 fill-red-500" size={20} />
             <h3 className="font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">The NaijaShop Story</h3>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-emerald-400 leading-relaxed">
            NaijaShop was built by developers who saw their parents and friends struggle with expensive software that required 24/7 internet. 
            In the local market, network fails, data runs out, and power goes off. 
          </p>
          <p className="text-sm font-medium text-slate-600 dark:text-emerald-400 leading-relaxed">
            We decided to build the world's most powerful <span className="text-emerald-600 font-black">Offline-First</span> POS. 
            Today, we empower market traders, chemists, and boutiques to manage stock and stop staff theft without paying a kobo for data.
          </p>
        </section>

        {/* Privacy Promise */}
        <section className="space-y-6 px-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight italic">Privacy Promise</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Local & Secure</p>
              </div>
           </div>
           <div className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-lg space-y-4">
              <p className="text-sm font-bold leading-relaxed italic">
                "Your data stays on your phone. We do not have a 'Cloud' where we track your sales. Your business is your business."
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                 <ShieldCheck size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">100% On-Device Storage</span>
              </div>
           </div>
        </section>
      </main>

      <footer className="py-12 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Built with 🇳🇬 for the Market</p>
      </footer>
    </div>
  );
};
