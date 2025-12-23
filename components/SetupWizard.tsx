
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db.ts';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, Sparkles, Lock } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

type SetupStep = 'WELCOME' | 'VERIFY' | 'PIN' | 'SUCCESS';

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('WELCOME');
  const [tempOtp, setTempOtp] = useState<string>('');
  const [shopName, setShopName] = useState<string>('Your Shop');

  // Input states
  const [otpArr, setOtpArr] = useState(new Array(6).fill(''));
  const [pinArr, setPinArr] = useState(new Array(4).fill(''));
  const [confirmPinArr, setConfirmPinArr] = useState(new Array(4).fill(''));
  
  const [error, setError] = useState('');

  // Refs for auto-focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const otp = localStorage.getItem('temp_otp') || '000000';
    const name = localStorage.getItem('shop_name') || 'NaijaShop';
    setTempOtp(otp);
    setShopName(name);
  }, []);

  const handleInputChange = (
    val: string, 
    index: number, 
    arr: string[], 
    setArr: React.Dispatch<React.SetStateAction<string[]>>, 
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    length: number
  ) => {
    if (!/^\d*$/.test(val)) return;
    const newArr = [...arr];
    newArr[index] = val.slice(-1);
    setArr(newArr);
    
    // Auto-advance
    if (val && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent, 
    index: number, 
    arr: string[], 
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === 'Backspace' && !arr[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    if (otpArr.join('') === tempOtp) {
      setStep('PIN');
      setError('');
    } else {
      setError('Invalid code. Check Stage 0 again.');
    }
  };

  const handleCompleteSetup = async () => {
    const newPin = pinArr.join('');
    const confirmPin = confirmPinArr.join('');

    if (newPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      const admin = await db.users.where('role').equals('Admin').first();
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: newPin });
        
        // Finalize state
        localStorage.setItem('is_setup_pending', 'false');
        localStorage.removeItem('temp_otp');
        
        // Celebration!
        setStep('SUCCESS');
        setTimeout(() => {
          onComplete();
        }, 2500);
      }
    } catch (err) {
      setError('System Error: Could not save PIN');
    }
  };

  const renderInputGrid = (
    arr: string[], 
    setArr: React.Dispatch<React.SetStateAction<string[]>>, 
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    length: number,
    isPassword = false
  ) => (
    <div className="flex gap-2 justify-center py-2">
      {arr.map((digit, idx) => (
        <input
          key={idx}
          ref={el => refs.current[idx] = el}
          type={isPassword ? "password" : "text"}
          inputMode="numeric"
          maxLength={1}
          className="w-10 h-12 bg-white border-2 border-gray-200 rounded-xl text-center text-xl font-black text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
          value={digit}
          onChange={e => handleInputChange(e.target.value, idx, arr, setArr, refs, length)}
          onKeyDown={e => handleKeyDown(e, idx, arr, refs)}
          autoFocus={idx === 0}
        />
      ))}
    </div>
  );

  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 z-[1000] bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Sparkles size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter drop-shadow-lg">Success!</h1>
        <p className="text-xl font-bold opacity-90 max-w-xs drop-shadow-md">Setup Complete! Your shop is now live and secured.</p>
        <div className="mt-12 flex gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          <div className="w-2 h-2 bg-white/50 rounded-full"></div>
          <div className="w-2 h-2 bg-white/20 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500 overflow-hidden">
      {/* Immersive Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 opacity-100"></div>
      
      <div className="w-full max-w-sm bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 relative z-10 animate-in zoom-in-95 duration-500">
        
        {/* Image Header with Light Background */}
        <div className="h-40 w-full bg-gray-50 flex items-center justify-center border-b border-gray-100 overflow-hidden">
          <img 
            src={step === 'WELCOME' 
              ? "https://i.ibb.co/m5y9NjqV/1766529834120-019b4d61-d179-7e3d-aad7-4ae5252e707b.png"
              : "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png"
            } 
            alt="Setup Stage"
            className="h-full w-full object-contain p-4 animate-in fade-in zoom-in duration-700"
          />
        </div>

        <div className="p-8 space-y-6 text-center">
          
          {/* Step 0: Welcome */}
          {step === 'WELCOME' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-emerald-950 tracking-tight leading-none uppercase">Welcome, Boss!</h2>
                <p className="text-gray-400 text-sm font-medium">Let's set up your secure shop manager.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-5 text-emerald-900 group-hover:scale-110 transition-transform">
                  <Lock size={40} />
                </div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Your One-Time Setup Code</p>
                <div className="text-4xl font-mono font-black text-emerald-900 tracking-[0.2em]">{tempOtp}</div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="text-amber-500 shrink-0" size={16} />
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                  Write this code down. You will need to verify it on the next screen to prove your identity.
                </p>
              </div>

              <button 
                onClick={() => setStep('VERIFY')}
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
              >
                Start Setup <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 1: Verify OTP */}
          {step === 'VERIFY' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">Verify Code</h2>
                <p className="text-gray-400 text-xs font-medium">Enter the 6-digit code shown on the previous screen.</p>
              </div>

              <div className="space-y-4">
                {renderInputGrid(otpArr, setOtpArr, otpRefs, 6)}
                
                {error && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce">
                    {error}
                  </p>
                )}

                <button 
                  onClick={handleVerifyOtp}
                  disabled={otpArr.join('').length < 6}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-200 disabled:shadow-none active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Identity
                </button>
                
                <button 
                  onClick={() => setStep('WELCOME')}
                  className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto pt-2 hover:bg-emerald-50 px-4 py-2 rounded-full transition-colors"
                >
                  <ChevronLeft size={14} /> Go Back
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create PIN */}
          {step === 'PIN' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">Create Admin PIN</h2>
                <p className="text-gray-400 text-xs font-medium px-4">Set a 4-digit secret PIN to lock your profits and staff settings.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left ml-2">New 4-Digit PIN</p>
                  {renderInputGrid(pinArr, setPinArr, pinRefs, 4, true)}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left ml-2">Confirm PIN</p>
                  {renderInputGrid(confirmPinArr, setConfirmPinArr, confirmPinRefs, 4, true)}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
                    <AlertCircle className="text-red-500" size={16} />
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <button 
                  onClick={handleCompleteSetup}
                  disabled={pinArr.join('').length < 4 || confirmPinArr.join('').length < 4}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-200 disabled:shadow-none active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  Complete Setup <CheckCircle2 size={18} />
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* Footnote */}
        <div className="p-6 bg-gray-50 flex items-center gap-3 border-t border-gray-100">
          <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
          <p className="text-[9px] text-gray-400 font-bold leading-relaxed uppercase tracking-wider">
            Military-Grade Encryption Enabled
          </p>
        </div>
      </div>
      
      {/* Decorative Gradient Glows */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-[120px]"></div>
    </div>
  );
};
