
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
  ChevronRight,
  TrendingUp,
  CreditCard
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
        <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full text-emerald-700 text-xs font-black uppercase tracking-widest mb-6">
          <Zap size={14} className="fill-emerald-700" /> Proudly Nigerian
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[0.9] mb-6">
          Stop Paying for Data <br className="hidden md:block" />
          <span className="text-emerald-600">to Run Your Shop.</span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          The only POS made for Nigeria—100% Offline, No Monthly Fees, No Data Needed. Professional stock management for the busy business owner.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartTrial}
            className="w-full sm:w-auto bg-emerald-600 text-white font-black px-10 py-6 rounded-3xl text-lg shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            Start My 3-Day Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
            className="w-full sm:w-auto bg-white border-2 border-gray-100 text-gray-800 font-black px-10 py-6 rounded-3xl text-lg hover:border-emerald-200 active:scale-95 transition-all"
          >
            Contact Developer
          </button>
        </div>
      </section>

      {/* Naija Proof Section */}
      <section className="px-6 py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4">The Naija Proof</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Built for the Nigerian Reality</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <Plane size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">Airplane Mode Ready</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              No internet? No problem. Record sales, track stock, and see profits even when the network is down or data is exhausted.
            </p>
          </div>
          {/* Feature 2 */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <Smartphone size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">Naira Receipts</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              Send professional, branded receipts with ₦ symbols directly to your customer's WhatsApp in seconds. No paper needed.
            </p>
          </div>
          {/* Feature 3 */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <Lock size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">Staff-Lock Security</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              Stop staff from deleting sales or peeking at your profit margins. Total control with multi-user PIN access.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Transparent Pricing</h2>
          <p className="text-gray-500 font-medium">One-time payment for lifetime activation. No monthly subscriptions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Basic */}
          <div className="bg-white border-2 border-gray-100 p-8 rounded-[40px] flex flex-col hover:border-emerald-200 transition-colors">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Basic</h4>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black">₦15,000</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> Single User Access
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> Offline Inventory
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> WhatsApp Receipts
              </li>
            </ul>
            <button onClick={onStartTrial} className="w-full py-4 rounded-2xl border-2 border-gray-100 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Select Basic</button>
          </div>
          {/* Business */}
          <div className="bg-gray-900 border-2 border-emerald-500 p-8 rounded-[40px] flex flex-col relative text-white shadow-2xl scale-105">
            <div className="absolute top-0 right-10 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">Most Popular</div>
            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Business</h4>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black">₦50,000</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                <CheckCircle2 size={18} className="text-emerald-500" /> Everything in Basic
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                <CheckCircle2 size={18} className="text-emerald-500" /> Staff Management
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                <CheckCircle2 size={18} className="text-emerald-500" /> Debt Tracker Module
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                <CheckCircle2 size={18} className="text-emerald-500" /> 2 Device Activations
              </li>
            </ul>
            <button onClick={onStartTrial} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Get Started</button>
          </div>
          {/* Enterprise */}
          <div className="bg-white border-2 border-gray-100 p-8 rounded-[40px] flex flex-col hover:border-emerald-200 transition-colors">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Enterprise</h4>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black">₦150,000</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> Multi-device Sync
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> Cloud Backup (Encrypted)
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> 24/7 Priority Support
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                <CheckCircle2 size={18} className="text-emerald-500" /> Professional Training
              </li>
            </ul>
            <button onClick={onStartTrial} className="w-full py-4 rounded-2xl border-2 border-gray-100 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* Trust Builder / Footer */}
      <footer className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center -space-x-4 mb-8">
            <img className="w-12 h-12 rounded-full border-4 border-white bg-gray-200" src="https://i.pravatar.cc/150?u=1" alt="Avatar" />
            <img className="w-12 h-12 rounded-full border-4 border-white bg-gray-200" src="https://i.pravatar.cc/150?u=2" alt="Avatar" />
            <img className="w-12 h-12 rounded-full border-4 border-white bg-gray-200" src="https://i.pravatar.cc/150?u=3" alt="Avatar" />
            <div className="w-12 h-12 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">+400</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Trusted by 400+ Shop Owners in Nigeria</h2>
          <p className="text-gray-500 font-medium mb-10">From Lagos to Kano, businesses are saving data and making more profit.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <button 
                onClick={onStartTrial}
                className="bg-emerald-600 text-white font-black px-10 py-5 rounded-3xl active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-emerald-200"
              >
                Launch Free Trial <ArrowRight size={20} />
             </button>
             <button 
                onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
                className="bg-white text-emerald-600 font-black px-10 py-5 rounded-3xl border border-emerald-100 flex items-center gap-2 shadow-sm"
              >
                <MessageCircle size={20} /> Chat on WhatsApp
             </button>
          </div>
          <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">100% Secure & Offline</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">© 2025 NaijaShop POS Systems Nigeria</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
