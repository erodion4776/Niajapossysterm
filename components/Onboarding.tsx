
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db.ts';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, 
  Store, Users, Package, Lock, Key, Smartphone, Sparkles 
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tempOtp, setTempOtp] = useState<string>('');
  
  // Security Inputs
  const [pinArr, setPinArr] = useState(new Array(4).fill(''));
  const [confirmPinArr, setConfirmPinArr] = useState(new Array(4).fill(''));
  const [error, setError] = useState('');
  
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const otp = localStorage.getItem('temp_otp') || '000000';
    setTempOtp(otp);
  }, []);

  const handleInputChange = (val: string, index: number, isConfirm: boolean) => {
    if (!/^\d*$/.test(val)) return;
    const setter = isConfirm ? setConfirmPinArr : setPinArr;
    const arr = isConfirm ? confirmPinArr : pinArr;
    const refs = isConfirm ? confirmRefs : pinRefs;

    const newArr = [...arr];
    newArr[index] = val.slice(-1);
    setter(newArr);
    setError('');

    if (val && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, isConfirm: boolean) => {
    const arr = isConfirm ? confirmPinArr : pinArr;
    const refs = isConfirm ? confirmRefs : pinRefs;
    const setter = isConfirm ? setConfirmPinArr : setPinArr;

    if (e.key === 'Backspace') {
      if (!arr[index] && index > 0) {
        const newArr = [...arr];
        newArr[index - 1] = '';
        setter(newArr);
        refs.current[index - 1]?.focus();
      } else {
        const newArr = [...arr];
        newArr[index] = '';
        setter(newArr);
      }
    }
  };

  const validateSecurityStep = () => {
    const pin = pinArr.join('');
    const confirm = confirmPinArr.join('');
    
    if (pin.length < 4) {
      setError('Enter a 4-digit PIN');
      return false;
    }
    if (pin !== confirm) {
      setError('PINs do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateSecurityStep()) return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      finalizeSetup();
    }
  };

  const finalizeSetup = async () => {
    try {
      const newPin = pinArr.join('');
      let admin = await db.users.where('role').equals('Admin').first();
      
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: newPin });
      } else {
        await db.users.add({
          name: 'Shop Owner',
          pin: newPin,
          role: 'Admin'
        });
      }
      
      localStorage.setItem('is_setup_pending', 'false');
      onComplete();
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const screens = [
    {
      title: "Welcome, Boss!",
      desc: "Your shop is now digital. Enjoy 14 days of world-class management for free. No data costs, no hidden fees.",
      img: "https://i.ibb.co/m5y9NjqV/1766529834120-019b4d61-d179-7e3d-aad7-4ae5252e707b.png",
      icon: <Store className="text-emerald-400" size={32} />
    },
    {
      title: "Lock Your Profit",
      desc: "Set your secret Admin PIN. This locks your records and profit dashboard away from prying eyes.",
      img: "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png",
      content: (
        <div className="space-y-6 w-full max-w-xs mx-auto">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Create Admin PIN</p>
            <div className="flex gap-2 justify-center">
              {pinArr.map((d, i) => (
                <input
                  key={i} ref={el => { pinRefs.current[i] = el; }}
                  type="password" inputMode="numeric" maxLength={1}
                  className="w-12 h-14 bg-white/10 border border-white/20 rounded-2xl text-center text-2xl font-black text-white focus:outline-none focus:border-emerald-400 transition-all"
                  value={d} onChange={e => handleInputChange(e.target.value, i, false)}
                  onKeyDown={e => handleKeyDown(e, i, false)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Confirm PIN</p>
            <div className="flex gap-2 justify-center">
              {confirmPinArr.map((d, i) => (
                <input
                  key={i} ref={el => { confirmRefs.current[i] = el; }}
                  type="password" inputMode="numeric" maxLength={1}
                  className="w-12 h-14 bg-white/10 border border-white/20 rounded-2xl text-center text-2xl font-black text-white focus:outline-none focus:border-emerald-400 transition-all"
                  value={d} onChange={e => handleInputChange(e.target.value, i, true)}
                  onKeyDown={e => handleKeyDown(e, i, true)}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-[10px] font-black uppercase text-center animate-bounce">{error}</p>}
        </div>
      )
    },
    {
      title: "The Master Key",
      desc: "Write this code down! You will need it to link other staff phones to your shop inventory.",
      img: "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png",
      content: (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[40px] text-center space-y-3 relative overflow-hidden group shadow-2xl w-full max-w-xs mx-auto">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-white"><Key size={60} /></div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Master Setup Code</p>
          <div className="text-5xl font-mono font-black tracking-[0.2em]">{tempOtp}</div>
          <div className="pt-4 flex items-center justify-center gap-2 text-amber-300">
            <AlertCircle size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Save this code now</p>
          </div>
        </div>
      )
    },
    {
      title: "Staff Protection",
      desc: "Staff can record sales but they CANNOT delete them or see your total profit. You are in full control.",
      img: "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png",
      icon: <Users className="text-emerald-400" size={32} />
    },
    {
      title: "Start Selling",
      desc: "Everything is set! Tap 'Open My Shop' to start your 14-day risk-free trial. Remember: No data needed!",
      img: "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png",
      icon: <Package className="text-emerald-400" size={32} />
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-emerald-950 flex flex-col overflow-hidden text-white">
      {/* Background with Transition */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105" 
        style={{ backgroundImage: `url(${screens[currentStep].img})` }} 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent" />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col h-full px-8 pt-20 pb-12 justify-between">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center animate-in fade-in slide-in-from-top duration-700">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto border border-white/20 shadow-2xl">
              {screens[currentStep].icon || <Sparkles className="text-emerald-400" size={32} />}
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-2xl italic">
              {screens[currentStep].title}
            </h1>
          </div>

          {/* Dynamic Content */}
          <div className="min-h-[200px] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            {screens[currentStep].content || (
              <p className="text-emerald-100/80 text-lg font-medium text-center leading-relaxed drop-shadow-md">
                {screens[currentStep].desc}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-8">
          {/* Indicators */}
          <div className="flex justify-center gap-2">
            {screens.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${currentStep === i ? 'w-8 bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'w-2 bg-white/20'}`} 
              />
            ))}
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="bg-white/10 backdrop-blur-md p-6 rounded-[32px] border border-white/20 active:scale-90 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
            >
              {currentStep === 4 ? 'Open My Shop' : 'Next Step'} <ArrowRight size={20} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 opacity-50">
            <ShieldCheck size={16} />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Local Secure POS 🇳🇬</p>
          </div>
        </div>
      </div>
    </div>
  );
};
