
import React, { useState } from 'react';
import { 
  ArrowLeft, Coins, Share2, Banknote, UserPlus, 
  CheckCircle2, MessageCircle, TrendingUp, Sparkles, 
  ChevronDown, ChevronUp, Gift, Target, Wallet,
  ShieldCheck, BarChart3, Image as ImageIcon, Smartphone
} from 'lucide-react';

interface AffiliatesProps {
  onBack: () => void;
}

const AFFILIATE_FAQ = [
  {
    q: "How do I track my referrals?",
    a: "When your customer messages us to activate, they will provide your unique Affiliate ID. We also track the specific download link they used to ensure you get credited."
  },
  {
    q: "When do I get my money?",
    a: "All commissions are calculated and paid out every Friday morning directly to your provided Nigerian bank account."
  },
  {
    q: "Do I need to be a tech expert?",
    a: "No! If you can use WhatsApp and know how to talk to people, you can earn with NaijaShop. We even provide you with the words to say."
  }
];

export const Affiliates: React.FC<AffiliatesProps> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleJoinTeam = () => {
    window.open('https://wa.me/2347062228026?text=' + encodeURIComponent("Hello! I want to become a NaijaShop Affiliate and join the Growth Team."), '_blank');
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
        {/* 1. The "Money-Maker" Hero */}
        <section className="px-6 py-16 text-center space-y-8 bg-gradient-to-b from-emerald-50 to-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <Coins size={300} className="absolute -top-20 -left-20 -rotate-12" />
            <TrendingUp size={200} className="absolute bottom-10 -right-10 rotate-12" />
          </div>
          
          <div className="inline-flex items-center gap-2 bg-amber-100 px-5 py-2 rounded-full text-amber-700 text-[10px] font-black uppercase tracking-[0.2em] border border-amber-200 animate-bounce">
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
            Join the Affiliate Team <ArrowLeft className="rotate-180" />
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
                { step: "02", icon: <Smartphone className="text-amber-500" />, t: "Share the App", d: "Show a shop owner how the app works in Airplane Mode. Let them start the 3-day trial on their own phone." },
                { step: "03", icon: <Gift className="text-emerald-500" />, t: "Get Paid", d: "When they pay for their lifetime license using your ID, you get ₦2,000 commission instantly." }
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
              <Target size={24} className="text-emerald-600" />
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
             Start Earning Now <ArrowLeft className="rotate-180" />
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
