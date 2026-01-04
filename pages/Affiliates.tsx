
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { 
  ArrowLeft, Coins, Share2, Banknote, UserPlus, 
  CheckCircle2, MessageCircle, TrendingUp, Sparkles, 
  ChevronDown, ChevronUp, Gift, Target, Wallet,
  ShieldCheck, BarChart3, Image as ImageIcon, Smartphone,
  Copy, Check, ArrowRight, Zap, HelpCircle, User, Landmark, Phone, Download, X
} from 'lucide-react';
import { getRequestCode } from '../utils/security.ts';
import { formatNaira } from '../utils/whatsapp.ts';

interface AffiliatesProps {
  onBack: () => void;
}

const AFFILIATE_FAQ = [
  {
    q: "How do I track my referrals?",
    a: "When your customer messages us to activate, they provide your ID or use your link. We track the source to ensure you get credited."
  },
  {
    q: "When do I get my money?",
    a: "All commissions are paid out every Friday morning directly to your provided Nigerian bank account."
  },
  {
    q: "Do I need to be a shop owner?",
    a: "No! Anyone can become a marketer. Just generate your Marketer ID and start sharing your link."
  }
];

export const Affiliates: React.FC<AffiliatesProps> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [requestCode, setRequestCode] = useState('...');
  const [copied, setCopied] = useState(false);
  
  // Registration States for non-shop owners
  const [marketerId, setMarketerId] = useState<string | null>(() => localStorage.getItem('marketer_id'));
  const [isRegistered, setIsRegistered] = useState(() => localStorage.getItem('marketer_registered') === 'true');
  const [regData, setRegData] = useState({
    fullName: '',
    bankName: '',
    accountNumber: '',
    phone: ''
  });

  // Check if current user is a shop owner
  const shopNameSetting = useLiveQuery(() => db.settings.get('shop_name'));
  const isShopOwner = !!shopNameSetting;

  useEffect(() => {
    getRequestCode().then(code => {
      // If shop owner, use standard NG code. If marketer, use the generated MK code.
      setRequestCode(isShopOwner ? code : (marketerId || code.replace('NG', 'MK')));
    });
  }, [isShopOwner, marketerId]);

  const referralLink = `https://naijashop.com.ng/?ref=${requestCode}`;
  const whatsappMarketingMessage = `Oga, stop paying for data to run your shop! I'm using NaijaShop POS and it works 100% offline. Try the 14-day free trial here: ${referralLink}`;

  const handleGenerateMarketerId = async () => {
    const code = await getRequestCode();
    const mkCode = code.replace('NG', 'MK');
    setMarketerId(mkCode);
    localStorage.setItem('marketer_id', mkCode);
  };

  const handleActivateMarketer = () => {
    if (!regData.fullName || !regData.bankName || !regData.accountNumber || !regData.phone) {
      alert("Please fill all details to register!");
      return;
    }

    const message = `Hello NaijaShop Admin! 🚀\nI want to register as an Affiliate Marketer.\n\nMy Details:\n🆔 Marketer ID: ${requestCode}\n👤 Name: ${regData.fullName}\n🏦 Bank: ${regData.bankName}\n🔢 Account: ${regData.accountNumber}\n📱 Phone: ${regData.phone}\n\nPlease activate my code so I can start earning ₦2,000 per referral!`;
    
    window.open(`https://wa.me/2347062228026?text=${encodeURIComponent(message)}`, '_blank');
    
    setIsRegistered(true);
    localStorage.setItem('marketer_registered', 'true');
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMarketingMessage)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fix: Added handleJoinTeam to resolve missing name error
  const handleJoinTeam = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-emerald-950 font-sans flex flex-col max-w-lg mx-auto overflow-x-hidden">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-emerald-50">
        <button onClick={onBack} className="p-2 bg-emerald-50 rounded-xl text-emerald-600 active:scale-95 transition-all">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tight">Affiliate Program</h1>
      </header>

      <main className="flex-1 pb-24">
        {/* PERSONALIZED HUB SECTION */}
        <section className="px-6 py-8">
          {isShopOwner || isRegistered ? (
            <div className="bg-emerald-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-emerald-500/20">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                      <Target size={20} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                      {isShopOwner ? 'My Referral Hub' : 'My Marketing Hub'}
                    </h3>
                  </div>
                  {!isShopOwner && (
                    <button 
                      onClick={() => { localStorage.removeItem('marketer_registered'); localStorage.removeItem('marketer_id'); window.location.reload(); }}
                      className="text-[8px] font-black text-white/40 uppercase tracking-widest hover:text-red-400 transition-colors"
                    >
                      Reset Account
                    </button>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mb-1">
                      {isShopOwner ? 'Device ID / Code' : 'Your Marketer ID'}
                    </p>
                    <div className="flex items-center justify-between">
                       <span className="text-2xl font-black tracking-widest text-white">{requestCode}</span>
                       <button onClick={handleCopyLink} className="p-2 bg-white/10 rounded-lg text-emerald-400 active:scale-90 transition-all">
                          {copied ? <Check size={18}/> : <Copy size={18}/>}
                       </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">Total Earned</p>
                      <p className="text-lg font-black text-white">₦0.00</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">Pending Payouts</p>
                      <p className="text-lg font-black text-amber-400">₦0.00</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleShareWhatsApp}
                    className="w-full bg-emerald-500 text-emerald-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl animate-pulse active:scale-95 transition-all"
                  >
                    <MessageCircle size={20} className="fill-emerald-950" /> SHARE MY LINK ON WHATSAPP
                  </button>

                  <button 
                    onClick={() => window.open('https://naijashop.com.ng/marketing-video.mp4', '_blank')}
                    className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-[1.5rem] flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                  >
                    <Download size={14} /> Download Marketing Kit
                  </button>
                </div>
                
                <p className="text-[9px] text-center text-emerald-500/40 font-bold uppercase tracking-widest">
                  Copy your link and share on WhatsApp Status. For every shop that pays, you get ₦2,000 commission!
                </p>
              </div>
            </div>
          ) : (
            /* MARKETER ONBOARDING / REGISTRATION */
            <div className="bg-slate-50 border-2 border-dashed border-emerald-200 rounded-[2.5rem] p-8 space-y-8 animate-in fade-in duration-500">
               {!marketerId ? (
                 <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-emerald-100 rounded-[32px] flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                       <UserPlus size={40} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-2xl font-black uppercase italic tracking-tight">Become a Partner</h2>
                       <p className="text-sm font-medium text-slate-500 px-4">Don't own a shop? No problem. Generate your ID to start earning with us.</p>
                    </div>
                    <button 
                      onClick={handleGenerateMarketerId}
                      className="w-full bg-emerald-600 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                       <Zap size={18} fill="white" /> Generate My Marketer ID
                    </button>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <div className="space-y-1">
                          <h3 className="text-lg font-black uppercase italic tracking-tight text-emerald-950">Activate & Register</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enter your payout details</p>
                       </div>
                       <div className="bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">
                          <p className="text-[10px] font-black text-emerald-600 font-mono tracking-widest">{marketerId}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Your Full Name</label>
                          <div className="relative">
                             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={16} />
                             <input 
                                placeholder="Legal Name for Bank"
                                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={regData.fullName}
                                onChange={e => setRegData({...regData, fullName: e.target.value})}
                             />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Bank Name</label>
                             <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={16} />
                                <input 
                                   placeholder="e.g. OPay"
                                   className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                   value={regData.bankName}
                                   onChange={e => setRegData({...regData, bankName: e.target.value})}
                                />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Account No.</label>
                             <input 
                                placeholder="0000000000"
                                className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-4 text-sm font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={regData.accountNumber}
                                onChange={e => setRegData({...regData, accountNumber: e.target.value})}
                             />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">WhatsApp Number</label>
                          <div className="relative">
                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={16} />
                             <input 
                                placeholder="080..."
                                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={regData.phone}
                                onChange={e => setRegData({...regData, phone: e.target.value})}
                             />
                          </div>
                       </div>
                    </div>

                    <button 
                      onClick={handleActivateMarketer}
                      className="w-full bg-emerald-600 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                       <CheckCircle2 size={18} /> ACTIVATE MY REFERRAL CODE
                    </button>
                    
                    <button 
                       onClick={() => { setMarketerId(null); localStorage.removeItem('marketer_id'); }}
                       className="w-full text-[9px] font-black text-slate-300 uppercase tracking-widest text-center"
                    >
                       Cancel Registration
                    </button>
                 </div>
               )}
            </div>
          )}
        </section>

        {/* 1. The "Money-Maker" Hero */}
        <section className="px-6 py-12 text-center space-y-8 bg-gradient-to-b from-emerald-50 to-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <Coins size={300} className="absolute -top-20 -left-20 -rotate-12" />
            <TrendingUp size={200} className="absolute bottom-10 -right-10 rotate-12" />
          </div>
          
          <div className="inline-flex items-center gap-2 bg-amber-100 px-5 py-2 rounded-full text-amber-700 text-[10px] font-black uppercase tracking-[0.2em] border border-amber-200">
            <Sparkles size={14} className="fill-amber-500" /> Pure Hustle. No Entry Fee.
          </div>

          <h2 className="text-5xl font-black tracking-tighter leading-[0.85] uppercase italic relative z-10">
            Earn <span className="text-amber-500 underline decoration-amber-300 underline-offset-8">₦2,000</span> <br/>
            For Every Shop!
          </h2>

          <p className="text-lg font-bold text-slate-500 leading-relaxed max-w-xs mx-auto relative z-10">
            Help Nigerian businesses grow and get paid instantly. No registration fee, no hidden costs.
          </p>

          <button 
            onClick={handleJoinTeam}
            className="w-full bg-emerald-600 text-white font-black py-7 rounded-[32px] text-xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter italic relative z-10"
          >
            Join the Affiliate Team <ArrowRight size={24} />
          </button>
        </section>

        {/* 2. The "Simple Math" Earnings Table */}
        <section className="px-6 py-12 space-y-8">
           <div className="bg-emerald-950 rounded-[48px] p-8 text-white shadow-2xl relative overflow-hidden border-4 border-amber-400/20">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Banknote size={120} />
              </div>
              
              <div className="space-y-1 mb-8">
                 <h3 className="text-xl font-black uppercase italic tracking-tight text-amber-400">Potential Earnings</h3>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">How much will you make this month?</p>
              </div>

              <div className="space-y-4">
                 {[
                   { label: "Refer 1 Shop", amount: "₦2,000", color: "bg-white/5" },
                   { label: "Refer 5 Shops", amount: "₦10,000", color: "bg-white/10" },
                   { label: "Refer 20 Shops", amount: "₦40,000", color: "bg-white/20" },
                   { label: "Refer 50 Shops", amount: "₦100,000", color: "bg-amber-500/20", border: "border-amber-400/50" }
                 ].map((tier, i) => (
                   <div key={i} className={`${tier.color} ${tier.border || 'border-white/10'} border p-5 rounded-3xl flex justify-between items-center group hover:scale-[1.02] transition-transform`}>
                      <span className="font-black text-xs uppercase tracking-widest">{tier.label}</span>
                      <span className="text-xl font-black text-amber-400 tracking-tighter">{tier.amount}</span>
                   </div>
                 ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                 <div className="p-2 bg-amber-400 rounded-lg text-emerald-950">
                    <CheckCircle2 size={16} />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    Payouts are made every Friday morning.
                 </p>
              </div>
           </div>
        </section>

        {/* 3. How It Works (3 Easy Steps) */}
        <section className="px-6 py-12 space-y-12">
           <div className="text-center">
              <h3 className="text-2xl font-black uppercase italic tracking-tight text-emerald-950">3 Easy Steps</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Start earning in 24 hours</p>
           </div>

           <div className="space-y-10">
              {[
                { step: "01", icon: <MessageCircle className="text-blue-500" />, t: "Get Your ID", d: "Chat with us on WhatsApp to get your unique Affiliate ID and customized marketing link." },
                { step: "02", icon: <Smartphone className="text-amber-500" />, t: "Share the App", d: "Show a shop owner how the app works in Airplane Mode. Let them start the trial on their own phone." },
                { step: "03", icon: <Gift className="text-emerald-500" />, t: "Get Paid", d: "When they pay for their license using your ID, you get ₦2,000 commission instantly." }
              ].map((step, i) => (
                <div key={i} className="flex gap-6 relative">
                   {i < 2 && <div className="absolute left-7 top-14 bottom-[-40px] w-0.5 bg-slate-100"></div>}
                   <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm relative z-10">
                      {step.icon}
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-300">STEP {step.step}</span>
                        <h4 className="font-black uppercase text-sm tracking-tight text-emerald-900">{step.t}</h4>
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">{step.d}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* 4. Why Join the Team? */}
        <section className="px-6 py-12 bg-slate-50 border-y border-slate-100">
           <div className="space-y-8">
              <div className="flex items-center gap-3">
                 <Target size={24} className="text-emerald-600" />
                 <h3 className="text-xl font-black uppercase italic tracking-tight">Why Join the Team?</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {[
                   { t: "High Demand", d: "Every shop in Nigeria needs this to stop staff theft and messy notebooks." },
                   { t: "Easy to Sell", d: "The ₦10k - ₦25k price is the cheapest, most professional POS in the market." },
                   { t: "Zero Data Pitch", d: "Owners love it because they don't need to buy data just to see their records." },
                   { t: "Free Materials", d: "We provide professional videos and flyers for your WhatsApp Status every day." }
                 ].map((item, i) => (
                   <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-start gap-4 shadow-sm group hover:border-emerald-200 transition-colors">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black uppercase text-xs text-emerald-900">{item.t}</h4>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed">{item.d}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* 5. Affiliate FAQ */}
        <section className="px-6 py-12 space-y-8">
           <div className="flex items-center gap-3">
              <HelpCircle size={24} className="text-emerald-600" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Recruit FAQ</h3>
           </div>

           <div className="space-y-3">
              {AFFILIATE_FAQ.map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden">
                   <button 
                     onClick={() => setOpenFaq(openFaq === i ? null : i)}
                     className="w-full p-6 text-left flex justify-between items-center gap-4"
                   >
                      <span className="font-black text-xs uppercase tracking-tight text-emerald-900 leading-tight">{item.q}</span>
                      {openFaq === i ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                   </button>
                   {openFaq === i && (
                     <div className="px-6 pb-6 animate-in slide-in-from-top duration-200">
                        <p className="text-xs font-medium text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           {item.a}
                        </p>
                     </div>
                   )}
                </div>
              ))}
           </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pt-8 pb-16 text-center space-y-6">
           <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase italic tracking-tight">Ready to Hustle?</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600">No registration fee. Ever.</p>
           </div>
           <button 
             onClick={handleJoinTeam}
             className="w-full bg-emerald-600 text-white font-black py-7 rounded-[40px] text-xl shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
           >
             Start Earning Now <ArrowRight className="rotate-180" />
           </button>
           <button 
             onClick={onBack}
             className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 py-4"
           >
             Back to Main Home
           </button>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-slate-50 bg-slate-50">
        <div className="flex items-center justify-center gap-2 mb-2">
           <ShieldCheck size={14} className="text-emerald-600" />
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">NaijaShop Growth Ecosystem 🇳🇬</p>
        </div>
      </footer>
    </div>
  );
};

export default Affiliates;
