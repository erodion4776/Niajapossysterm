
import React from 'react';
import { 
  ArrowLeft, Store, ShieldCheck, Zap, Heart, Globe, 
  Lock, CloudOff, MessageCircle, ArrowRight, User 
} from 'lucide-react';

interface AboutUsProps {
  onBack: () => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white text-emerald-950 font-sans flex flex-col max-w-lg mx-auto transition-colors duration-300">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <button onClick={onBack} className="p-2 bg-emerald-50 rounded-xl text-emerald-600 active:scale-95 transition-all">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tight">Our Journey</h1>
      </header>

      <main className="flex-1 px-6 pb-24">
        {/* 1. The Naija-First Hero */}
        <section className="py-12 space-y-6 text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-[32px] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-200">
            <Globe size={40} />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-black leading-[1.1] uppercase italic tracking-tighter">
              Empowering the <br/>
              <span className="text-emerald-600">Heartbeat of Nigeria.</span>
            </h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
              NaijaShop was built to solve the 3 biggest problems facing our local retailers: Network issues, Staff theft, and expensive monthly fees.
            </p>
          </div>
        </section>

        {/* 2. Our Story (The "Why") */}
        <section className="py-12 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="text-red-500 fill-red-500" size={20} />
            <h3 className="font-black uppercase tracking-tight italic">Our Why</h3>
          </div>
          <div className="space-y-6">
            <p className="text-lg font-medium text-slate-600 leading-relaxed">
              In a country where <span className="text-emerald-950 font-black italic">"No Network"</span> is a daily song, why should your business stop?
            </p>
            <p className="text-lg font-medium text-slate-600 leading-relaxed">
              We watched hard-working shop owners lose records to rain, fire, or staff "mistakes". We decided to build a POS that is as tough and reliable as the Nigerian spirit. <span className="text-emerald-600 font-black">100% Offline. 100% Secure.</span>
            </p>
          </div>
        </section>

        {/* 3. The 3 Core Promises */}
        <section className="py-12 space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-4 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="font-black uppercase italic tracking-tight mb-2">Promise 1: Total Privacy</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  We don't store your sales on any cloud. Your records stay on your phone. Only you have the key.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-4 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                <CloudOff size={28} />
              </div>
              <div>
                <h4 className="font-black uppercase italic tracking-tight mb-2">Promise 2: No Data Tax</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Stop buying data just to run your shop. Use that money to buy more stock instead.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-4 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                <MessageCircle size={28} />
              </div>
              <div>
                <h4 className="font-black uppercase italic tracking-tight mb-2">Promise 3: Lifetime Support</h4>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  We are not a faceless foreign company. We are here in Nigeria, ready to support you on WhatsApp 24/7.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Meet the Developer */}
        <section className="py-12 bg-emerald-950 rounded-[48px] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-emerald-500/30">
                <img src="https://i.ibb.co/TD1JLFvQ/Generated-Image-September-24-2025-3-37-AM.png" alt="Osarodion" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tight">Osarodion</h3>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Lead Software Engineer</p>
              </div>
            </div>
            
            <div className="space-y-4">
               <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest">A Message from the Developer</h4>
               <p className="text-lg font-bold italic leading-relaxed text-emerald-50">
                "I believe every Nigerian shop—from the smallest chemist to the biggest boutique—deserves world-class technology without the world-class price tag. NaijaShop is my gift to our business community for 2026."
               </p>
            </div>
            
            <div className="pt-6 flex items-center gap-2 text-emerald-400/60 border-t border-white/10">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Secure Nigerian Product</span>
            </div>
          </div>
        </section>

        {/* 5. The "Join Us" Footer */}
        <section className="py-16 text-center space-y-8">
           <div className="space-y-2">
             <h3 className="text-2xl font-black uppercase italic">Ready to digitize?</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Start your 100% offline journey today</p>
           </div>
           <button 
             onClick={onBack}
             className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] text-lg shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter italic group"
           >
             Start Your Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
           </button>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-slate-50 bg-slate-50">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">NaijaShop POS Systems Nigeria 🇳🇬</p>
      </footer>
    </div>
  );
};

export default AboutUs;
