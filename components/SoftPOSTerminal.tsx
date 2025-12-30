
import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ShieldCheck, 
  Smartphone, Landmark, User, Timer, 
  AlertCircle, ChevronRight, CheckCircle2,
  Wallet, ArrowLeft, CheckCircle, Loader2
} from 'lucide-react';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';

interface SoftPOSTerminalProps {
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SoftPOSTerminal: React.FC<SoftPOSTerminalProps> = ({ 
  amount, 
  onConfirm, 
  onCancel 
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [copied, setCopied] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [details, setDetails] = useState({ bank: '', number: '', name: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const b = await db.settings.get('softPosBank');
        const n = await db.settings.get('softPosNumber');
        const a = await db.settings.get('softPosAccount');
        
        setDetails({ 
          bank: b?.value || '', 
          number: n?.value || '', 
          name: a?.value || '' 
        });
      } catch (err) {
        console.error("Failed to load Soft POS details", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsTimedOut(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    if (details.number) {
      navigator.clipboard.writeText(details.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const playChaChing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.2);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio feedback failed");
    }
  };

  const handleConfirm = () => {
    setIsSuccess(true);
    playChaChing();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => {
      onConfirm();
    }, 2000);
  };

  const isConfigMissing = !details.bank || !details.number || !details.name;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[2000] bg-emerald-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
        <div className="relative">
          <CheckCircle2 size={120} className="mb-8 animate-bounce fill-white/20" />
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter drop-shadow-2xl">Cha-Ching!</h1>
        <p className="text-emerald-100 font-black uppercase tracking-[0.3em] mt-4 text-sm text-center px-6">Sale Recorded Successfully</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col text-white animate-in slide-in-from-bottom duration-300 pt-10">
      {/* Terminal Header */}
      <header className="p-5 flex justify-between items-center bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#10b981] ${isTimedOut ? 'bg-red-500 shadow-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
          <div>
            <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isTimedOut ? 'text-red-400' : 'text-emerald-500'}`}>
              {isTimedOut ? 'Session Expired' : 'Official Transfer Terminal'}
            </h2>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors group">
          <X size={18} className="text-red-400 group-active:scale-90 transition-transform" />
        </button>
      </header>

      <main className="flex-1 flex flex-col p-6 items-center justify-start overflow-y-auto">
        {/* Amount Display */}
        <div className="text-center space-y-1 mb-10">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Amount Due</p>
          <h1 className="text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            {formatNaira(amount)}
          </h1>
        </div>

        {/* Bank Details Card */}
        <div className="w-full max-w-sm bg-white rounded-[48px] p-8 pb-10 shadow-2xl text-slate-900 relative overflow-visible min-h-[320px] flex flex-col text-center border border-slate-200">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
             <Landmark size={120} />
          </div>
          
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-8">
               <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : isConfigMissing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 space-y-4">
               <div className="bg-red-50 p-4 rounded-3xl text-red-500">
                  <AlertCircle size={40} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">Configuration Missing</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase">Update details in Admin Settings</p>
               </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col">
              {/* Bank Name Section */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Name</p>
                <p className="text-2xl font-bold uppercase text-emerald-600 leading-none">{details.bank}</p>
              </div>

              {/* Account Number Section */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Number</p>
                <div className="flex items-center justify-center gap-3 bg-slate-100 p-6 py-4 rounded-[32px] border border-slate-200 shadow-inner group active:scale-[0.98] transition-all cursor-pointer" onClick={handleCopy}>
                  <span className="text-4xl font-mono font-black tracking-[0.05em] text-emerald-950">
                    {details.number}
                  </span>
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 text-slate-400 group-hover:text-emerald-600 transition-colors">
                    {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                  </div>
                </div>
              </div>

              {/* Account Name Section */}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Name</p>
                <p className="text-emerald-950 font-black text-xl leading-tight uppercase italic tracking-tight px-2 break-words">
                  {details.name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Space shifter to push footer items down */}
        <div className="flex-grow" />

        {/* Status indicator - Pushed down towards buttons */}
        <div className="flex flex-col items-center gap-4 w-full mt-20 mb-8">
          <div className={`px-8 py-3 rounded-full flex items-center gap-4 border transition-all duration-500 bg-white/5 ${isTimedOut ? 'border-red-500/20' : 'border-white/10 shadow-lg'}`}>
             <Timer size={18} className={isTimedOut ? 'text-red-400' : 'text-emerald-500'} />
             <span className={`text-base font-mono font-black ${isTimedOut ? 'text-red-400' : 'text-emerald-400'}`}>
               {isTimedOut ? '0:00' : formatTime(timeLeft)}
             </span>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
               {isTimedOut ? 'Timed Out' : 'Remaining'}
             </span>
          </div>
          
          {isTimedOut && (
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">
              Verify alert received manually.
            </p>
          )}
        </div>
      </main>

      {/* Immediate Action Buttons */}
      <footer className="p-6 bg-slate-900/90 backdrop-blur-md border-t border-white/5 space-y-4">
        <button 
          onClick={handleConfirm}
          disabled={isLoading || isConfigMissing}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black py-6 rounded-[32px] shadow-lg active:scale-[0.98] transition-all uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 group"
        >
          <CheckCircle size={22} className="group-hover:scale-110 transition-transform" />
          YES, ALERT RECEIVED
        </button>
        
        <button 
          onClick={onCancel}
          className="w-full bg-white/5 border border-white/10 text-slate-400 font-black py-4 rounded-[24px] active:scale-[0.98] transition-all uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 hover:text-red-400 hover:border-red-400/30"
        >
          <ArrowLeft size={16} />
          CANCEL / GO BACK
        </button>
      </footer>
    </div>
  );
};
