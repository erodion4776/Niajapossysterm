
import React from 'react';
import { ArrowLeft, Coins, Share2, Banknote, UserPlus, CheckCircle2, MessageCircle, TrendingUp } from 'lucide-react';

interface AffiliatesProps {
  onBack: () => void;
}

export const Affiliates: React.FC<AffiliatesProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col max-w-lg mx-auto">
      <header className="p-6 flex items-center gap-4 bg-slate-900 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black italic">Affiliate Program</h1>
      </header>

      <main className="flex-1 p-8 space-y-12">
        <section className="text-center space-y-6">
          <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse">
            <Coins size={48} className="text-slate-900" />
          </div>
          <div className="space-y-2">
            <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-[0.85]">
              Earn <span className="text-amber-500">₦2,000</span> <br/>
              Per Shop!
            </h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-4">
              Help us grow the market.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[48px] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp size={120} />
            </div>
            
            <h3 className="text-xl font-black uppercase italic tracking-tight text-emerald-400">How it works</h3>
            
            <div className="space-y-8">
              {[
                { icon: <Share2 className="text-amber-500" />, t: "Introduce a Shop", d: "Find a shop owner using a notebook. Show them NaijaShop on your phone." },
                { icon: <UserPlus className="text-blue-500" />, t: "Use Your Reference", d: "Tell them to use your Name or Phone as the 'Referral' when they contact us." },
                { icon: <CheckCircle2 className="text-emerald-500" />, t: "Verification", d: "When they pay for a Lifetime License (₦25,000), we verify the referral with you." },
                { icon: <Banknote className="text-amber-500" />, t: "Get Paid", d: "Receive ₦2,000 instantly via Bank Transfer for every successful sign-up." }
              ].map((step, i) => (
                <div key={i} className="flex gap-5">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-xs text-white">{step.t}</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed mt-1">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="text-center space-y-6 pb-12">
          <p className="text-slate-400 font-bold text-sm leading-relaxed px-6">
            Join 500+ growth partners across Lagos, Onitsha, and Kano earning daily.
          </p>
          <button 
            onClick={() => window.open('https://wa.me/2347062228026?text=' + encodeURIComponent("I want to join the NaijaShop Growth Team as an Affiliate."), '_blank')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[32px] text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter italic"
          >
            Join the Growth Team <MessageCircle size={24} />
          </button>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-white/5 bg-slate-900">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">Earn While You Help 🇳🇬</p>
      </footer>
    </div>
  );
};
