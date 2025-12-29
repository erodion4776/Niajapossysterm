
import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ShieldCheck, 
  Smartphone, Landmark, User, Timer, 
  AlertCircle, ChevronRight, CheckCircle2,
  Wallet, ArrowLeft, CheckCircle
} from 'lucide-react';
import { formatNaira } from '../utils/whatsapp.ts';

interface SoftPOSTerminalProps {
  amount: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const SoftPOSTerminal: React.FC<SoftPOSTerminalProps> = ({ 
  amount, 
  bankDetails, 
  onConfirm, 
  onCancel 
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [copied, setCopied] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

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
    navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const playChaChing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First note (High)
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

      // Second note (Higher)
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
    
    // Allow animation to play for 2 seconds before closing
    setTimeout(() => {
      onConfirm();
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[2000] bg-emerald-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
        <div className="relative">
          <CheckCircle2 size={160} className="mb-8 animate-bounce fill-white/20" />
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
        </div>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter drop-shadow-2xl">Cha-Ching!</h1>
        <p className="text-emerald-100 font-black uppercase tracking-[0.3em] mt-4 text-sm">Sale Recorded Successfully</p>
        <div className="mt-12 flex gap-3">
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          <div className="w-3 h-3 bg-white/60 rounded-full"></div>
          <div className="w-3 h-3 bg-white/30 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col text-white animate-in slide-in-from-bottom duration-300">
      {/* Terminal Header */}
      <header className="p-6 flex justify-between items-center bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_#10b981] ${isTimedOut ? 'bg-red-500 shadow-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
          <div>
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none ${isTimedOut ? 'text-red-400' : 'text-emerald-500'}`}>
              {isTimedOut ? 'Session Expired' : 'Official Transfer Terminal'}
            </h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">System Version 2.6 • Offline Verified</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2.5 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors group">
          <X size={20} className="text-red-400 group-active:scale-90 transition-transform" />
        </button>
      </header>

      <main className="flex-1 flex flex-col p-8 items-center justify-center space-y-8 overflow-y-auto">
        {/* Amount Display */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Amount Due</p>
          <h1 className="text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
            {formatNaira(amount)}
          </h1>
        </div>

        {/* Bank Details Card */}
        <div className="w-full max-w-sm bg-white rounded-[48px] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] space-y-8 text-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Landmark size={120} />
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</p>
              <p className="text-2xl font-black uppercase tracking-tight">{bankDetails.bankName}</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</p>
              <div className="flex items-center justify-between bg-slate-100 p-5 rounded-[24px] border border-slate-200">
                <span className="text-3xl font-mono font-black tracking-[0.1em]">{bankDetails.accountNumber}</span>
                <button onClick={handleCopy} className="p-3 bg-white rounded-2xl shadow-md hover:scale-110 transition-transform active:scale-95 border border-slate-100">
                  {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} className="text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name</p>
              <p className="text-base font-black uppercase text-slate-700 leading-tight">{bankDetails.accountName}</p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className={`px-8 py-3.5 rounded-full flex items-center gap-3 border transition-all duration-500 ${isTimedOut ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
             <Timer size={18} className={isTimedOut ? 'text-red-400' : 'text-emerald-500'} />
             <span className={`text-base font-mono font-black ${isTimedOut ? 'text-red-400' : 'text-emerald-400'}`}>
               {isTimedOut ? '0:00' : formatTime(timeLeft)}
             </span>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               {isTimedOut ? 'Session Timeout' : 'Time Remaining'}
             </span>
          </div>
          
          {isTimedOut && (
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">
              Did you receive the alert? Confirm manually below.
            </p>
          )}
        </div>
      </main>

      {/* Immediate Action Buttons */}
      <footer className="p-8 bg-slate-900/80 border-t border-white/5 space-y-4">
        <button 
          onClick={handleConfirm}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[32px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 group"
        >
          <CheckCircle size={22} className="group-hover:scale-110 transition-transform" />
          YES, ALERT RECEIVED
        </button>
        
        <button 
          onClick={onCancel}
          className="w-full bg-white/5 border border-white/10 text-slate-400 font-black py-5 rounded-[28px] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 hover:text-red-400 hover:border-red-400/30"
        >
          <ArrowLeft size={16} />
          CANCEL / GO BACK
        </button>
      </footer>
    </div>
  );
};
