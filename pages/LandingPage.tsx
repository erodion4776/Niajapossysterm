
import React from 'react';
import { 
  ShieldCheck, 
  Plane, 
  MessageCircle, 
  Lock, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Store, 
  Zap,
  TrendingUp,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface LandingPageProps {
  onStartTrial: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrial }) => {
  return (
    <div className="bg-white min-h-screen text-gray-900 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200">
            <Store size={20} />
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900">NaijaShop</span>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
          className="text-emerald-600 font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 active:scale-95 transition-all"
        >
          <MessageCircle size={18} /> Support
        </button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full text-amber-700 text-[10px] font-black uppercase tracking-widest mb-6 border border-amber-100 animate-pulse">
          <Zap size={12} className="fill-amber-700" /> Launch Offer: First 100 Customers Only
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[0.9] mb-6">
          Unlock Your Business Growth <br className="hidden md:block" />
          <span className="text-emerald-600">for the Price of Lunch.</span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          No Monthly Fees. No Data Costs. No Stress. <br className="hidden sm:block" />
          Get the full Offline POS for a one-time payment of just <span className="text-gray-900 font-black">₦5,000.</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartTrial}
            className="w-full sm:w-auto bg-emerald-600 text-white font-black px-10 py-6 rounded-[32px] text-lg shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            Setup My Shop <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => window.open('https://wa.me/2347062228026?text=' + encodeURIComponent("I'm ready to pay ₦5,000 for my Lifetime Activation Key. My Request Code is: [Enter Code from Lock Screen]"), '_blank')}
            className="w-full sm:w-auto bg-white border-2 border-gray-100 text-gray-800 font-black px-10 py-6 rounded-[32px] text-lg hover:border-emerald-200 active:scale-95 transition-all"
          >
            Pay ₦5,000 & Get My Key
          </button>
        </div>
        <p className="mt-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Join 500+ Smart Shop Owners in Lagos, Kano & Abuja
        </p>
      </section>

      {/* Magic Demo: Airplane Mode */}
      <section className="px-6 py-20 bg-emerald-950 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
        <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase">Sell in Airplane Mode ✈️</h2>
            <p className="text-emerald-100/60 max-w-xl mx-auto font-medium">
              While other POS apps are saying "Searching for Network...", you are already attending to your next customer and counting your profit.
            </p>
          </div>
          
          <div className="relative inline-block group">
            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full"></div>
            <div className="relative bg-black rounded-[48px] p-4 border-8 border-gray-800 shadow-2xl overflow-hidden w-full max-w-[300px] mx-auto aspect-[9/19]">
              <div className="bg-emerald-900 h-full w-full rounded-[32px] flex flex-col p-4 relative">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-1">
                      <Plane size={14} className="text-white" />
                      <span className="text-[10px] font-bold">Airplane Mode</span>
                   </div>
                   <div className="w-8 h-4 bg-white/20 rounded-full flex items-center px-0.5 justify-end">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                   </div>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="h-20 bg-emerald-800/50 rounded-2xl flex items-center justify-center text-xs font-black uppercase text-emerald-400 border border-emerald-700/50">POS Ready</div>
                  <div className="space-y-2">
                    <div className="h-10 bg-white/5 rounded-xl"></div>
                    <div className="h-10 bg-white/5 rounded-xl"></div>
                  </div>
                </div>
                <div className="bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase text-center shadow-lg">Confirm Sale ₦15,000</div>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-widest">
              <Zap size={14} /> 40% Longer Battery Life (No Data drain)
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Single Unbeatable Offer */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">End Monthly Fees Forever</h2>
          <p className="text-gray-500 font-medium">Simple. Transparent. One-time payment.</p>
        </div>
        
        <div className="max-w-xl mx-auto">
          <div className="bg-emerald-950 border-4 border-emerald-500 p-10 rounded-[56px] flex flex-col relative text-white shadow-[0_40px_80px_-15px_rgba(5,150,105,0.3)] z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black uppercase px-8 py-3 rounded-full tracking-widest shadow-xl flex items-center gap-2 whitespace-nowrap">
              <Zap size={14} className="fill-white" /> Launch Special Special 🇳🇬
            </div>
            
            <div className="text-center mb-10">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-4">The Lifetime License</h4>
              <div className="flex items-center justify-center gap-2">
                <span className="text-6xl font-black tracking-tighter italic">₦5,000</span>
              </div>
              <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mt-2">One-Time Activation Fee</p>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-10">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">100% Offline (No Data Needed)</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">Unlimited Sales & Inventory</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">Staff Anti-Theft Protection</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">WhatsApp Receipts & Backups</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">Profit & Debt Tracking</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-black text-emerald-50">Lifetime Updates Included</span>
              </div>
            </div>

            <button 
              onClick={() => window.open('https://wa.me/2347062228026?text=' + encodeURIComponent("I'm ready to pay ₦5,000 for my Lifetime Activation Key. My Request Code is: [Enter Code from Lock Screen]"), '_blank')}
              className="w-full py-6 rounded-[32px] bg-emerald-500 text-white font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
            >
              Pay ₦5,000 & Get My Key <ArrowRight size={20} />
            </button>
          </div>
          <div className="mt-8 text-center text-gray-400 font-black text-[10px] uppercase tracking-[0.4em]">Pay Once. Own it Forever. No Monthly Tax.</div>
        </div>
      </section>

      {/* Staff Lock / Anti-Theft */}
      <section className="px-6 py-24 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
           <div className="inline-block px-4 py-2 bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest rounded-full border border-amber-100">Anti-Theft Security</div>
           <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">Sleep Better. <br/><span className="text-emerald-600">Your Staff is Locked.</span></h2>
           <p className="text-gray-500 text-lg leading-relaxed font-medium">
             Tired of staff "forgetting" to record sales or "reversing" transactions? Our system locks the Delete button. Only YOU (The Boss) can see the profit dashboard with your secret Admin PIN.
           </p>
           <ul className="space-y-4">
              <li className="flex items-center gap-3 font-bold text-gray-700"><ShieldCheck className="text-emerald-500" size={20} /> Staff cannot see total profit</li>
              <li className="flex items-center gap-3 font-bold text-gray-700"><ShieldCheck className="text-emerald-500" size={20} /> Every sale shows staff name</li>
              <li className="flex items-center gap-3 font-bold text-gray-700"><ShieldCheck className="text-emerald-500" size={20} /> PIN-protected Inventory edits</li>
           </ul>
        </div>
        <div className="flex-1 w-full max-w-sm">
           <div className="bg-gray-100 p-8 rounded-[48px] border-4 border-white shadow-2xl space-y-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Lock size={32} /></div>
              <h3 className="text-2xl font-black text-gray-900">Admin Controls</h3>
              <div className="space-y-3">
                 <div className="h-14 bg-white rounded-2xl flex items-center px-4 justify-between border border-gray-200">
                    <span className="text-xs font-black uppercase text-gray-400">Inventory Status</span>
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">LOCKED</span>
                 </div>
                 <div className="h-14 bg-white rounded-2xl flex items-center px-4 justify-between border border-gray-200">
                    <span className="text-xs font-black uppercase text-gray-400">Net Profit</span>
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">BOSS ONLY</span>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Trust Builder / Footer */}
      <footer className="bg-white py-24 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="flex justify-center -space-x-4 mb-8">
            <img className="w-14 h-14 rounded-full border-4 border-white bg-gray-100" src="https://i.pravatar.cc/150?u=LagosBoss" alt="Avatar" />
            <img className="w-14 h-14 rounded-full border-4 border-white bg-gray-100" src="https://i.pravatar.cc/150?u=KanoShop" alt="Avatar" />
            <img className="w-14 h-14 rounded-full border-4 border-white bg-gray-100" src="https://i.pravatar.cc/150?u=AbujaPharm" alt="Avatar" />
            <div className="w-14 h-14 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-200">+500</div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none uppercase">Trusted by 500+ <br/>Shop Owners in Nigeria</h2>
            <p className="text-gray-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
              From Lagos Island to Kano Sabon Gari, business owners are saving data and making more profit every single day.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <button 
                onClick={onStartTrial}
                className="w-full sm:w-auto bg-emerald-600 text-white font-black px-12 py-6 rounded-[32px] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-200"
              >
                Launch My Shop <ArrowRight size={20} />
             </button>
             <button 
                onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
                className="w-full sm:w-auto bg-white text-emerald-600 font-black px-12 py-6 rounded-[32px] border-2 border-emerald-50 flex items-center justify-center gap-3 shadow-sm hover:border-emerald-200 active:scale-95 transition-all"
              >
                <MessageCircle size={24} /> Chat on WhatsApp
             </button>
          </div>

          <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Secure Activation Required</p>
            <p className="text-sm font-bold text-gray-600 leading-relaxed italic">
              "If you don't love how easy it is to manage your shop offline, you don't pay a single kobo. No credit card required to start setup."
            </p>
          </div>

          <div className="pt-16 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">100% Secure & Offline POS</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">© 2025 NaijaShop POS Systems Nigeria 🇳🇬</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
