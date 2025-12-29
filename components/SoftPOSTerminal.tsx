
import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ShieldCheck, 
  Smartphone, Landmark, User, Timer, 
  AlertCircle, ChevronRight, CheckCircle2,
  Wallet
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
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
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

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio feedback failed");
    }
  };

  const handleFinalConfirm = () => {
    playSuccessSound();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col text-white animate-in fade-in duration-300">
      {/* Terminal Header */}
      <header className="p-6 flex justify-between items-center bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 leading-none">Soft POS Terminal</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">System Version 2.5 • Offline Ready</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <X size={20} className="text-slate-400" />
        </button>
      </header>

      <main className="flex-1 flex flex-col p-8 items-center justify-center space-y-10">
        {/* Amount Display */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Transfer Amount</p>
          <h1 className="text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            {formatNaira(amount)}
          </h1>
        </div>

        {/* Bank Details Card */}
        <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl space-y-6 text-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
             <Landmark size={80} />
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Name</p>
              <p className="text-xl font-black uppercase tracking-tight">{bankDetails.bankName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Number</p>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-2xl font-mono font-black tracking-[0.2em]">{bankDetails.accountNumber}</span>
                <button onClick={handleCopy} className="p-2 bg-white rounded-xl shadow-sm hover:scale-110 transition-transform active:scale-95">
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Name</p>
              <p className="text-sm font-black uppercase text-slate-600">{bankDetails.accountName}</p>
            </div>
          </div>
        </div>

        {/* Status & Timer */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full flex items-center gap-3">
             <Timer size={16} className="text-emerald-500" />
             <span className="text-sm font-mono font-black text-emerald-400">{formatTime(timeLeft)}</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Waiting for Bank...</span>
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center leading-relaxed max-w-[200px]">
            Please instruct customer to verify account name before sending
          </p>
        </div>
      </main>

      {/* Footer Action */}
      <footer className="p-8 bg-slate-900/50 border-t border-white/5">
        <button 
          onClick={() => setShowFinalConfirm(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[32px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 group"
        >
          <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
          Confirm Alert Received
        </button>
      </footer>

      {/* Final Verification Modal */}
      {showFinalConfirm && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-in zoom-in duration-300">
           <div className="bg-white text-slate-900 w-full max-w-sm rounded-[48px] p-10 text-center space-y-8 shadow-2xl">
              <div className="w-20 h-20 bg-amber-100 rounded-[32px] flex items-center justify-center mx-auto text-amber-600">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight leading-tight">Verification Check</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  I confirm that I have seen the credit alert of <span className="font-black text-slate-900">{formatNaira(amount)}</span> in the shop's bank account.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <button 
                  onClick={handleFinalConfirm}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                >
                  Yes, Complete Sale
                </button>
                <button 
                  onClick={() => setShowFinalConfirm(false)}
                  className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest py-2"
                >
                  Cancel
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
