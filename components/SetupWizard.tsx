
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

  // Refs for auto-focus control
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const otp = localStorage.getItem('temp_otp') || '000000';
    const name = localStorage.getItem('shop_name') || 'NaijaShop';
    setTempOtp(otp);
    setShopName(name);
  }, []);

  // Handle step change focus
  useEffect(() => {
    if (step === 'VERIFY') otpRefs.current[0]?.focus();
    if (step === 'PIN') pinRefs.current[0]?.focus();
  }, [step]);

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
    // Take the last character typed
    newArr[index] = val.slice(-1);
    setArr(newArr);
    setError('');

    // Auto-advance if we have a value
    if (val && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent, 
    index: number, 
    arr: string[], 
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === 'Backspace') {
      if (!arr[index] && index > 0) {
        // Cell is empty, move focus back and clear previous
        const newArr = [...arr];
        newArr[index - 1] = '';
        setArr(newArr);
        refs.current[index - 1]?.focus();
      } else {
        // Cell has value, clear it
        const newArr = [...arr];
        newArr[index] = '';
        setArr(newArr);
      }
    }
  };

  const handleVerifyOtp = () => {
    if (otpArr.join('') === tempOtp) {
      setStep('PIN');
      setError('');
    } else {
      setError('Incorrect verification code.');
    }
  };

  const handleCompleteSetup = async () => {
    const newPin = pinArr.join('');
    const confirmPin = confirmPinArr.join('');

    if (newPin.length !== 4) {
      setError('Admin PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Try again.');
      return;
    }

    try {
      // Find Admin user or create if somehow missing
      let admin = await db.users.where('role').equals('Admin').first();
      
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: newPin });
      } else {
        // Fail-safe: Create the admin account if it doesn't exist
        await db.users.add({
          name: 'Shop Owner',
          pin: newPin,
          role: 'Admin'
        });
      }
      
      // Finalize setup state
      localStorage.setItem('is_setup_pending', 'false');
      localStorage.removeItem('temp_otp');
      
      setStep('SUCCESS');
      setTimeout(() => {
        onComplete();
      }, 2500);
    } catch (err) {
      setError('System Error: Could not save admin data.');
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
          // Fix: Ensure ref callback doesn't return the element to satisfy TypeScript Ref type
          ref={el => { refs.current[idx] = el; }}
          type={isPassword ? "password" : "text"}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          className="w-10 h-12 bg-white/10 border border-white/30 rounded-xl text-center text-xl font-black text-white focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all shadow-sm backdrop-blur-md"
          value={digit}
          onChange={e => handleInputChange(e.target.value, idx, arr, setArr, refs, length)}
          onKeyDown={e => handleKeyDown(e, idx, arr, setArr, refs)}
        />
      ))}
    </div>
  );

  const getBackgroundImage = () => {
    if (step === 'WELCOME') return "https://i.ibb.co/m5y9NjqV/1766529834120-019b4d61-d179-7e3d-aad7-4ae5252e707b.png";
    return "https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png";
  };

  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 z-[1000] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 blur-md scale-110" style={{ backgroundImage: `url(${getBackgroundImage()})` }} />
        <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm" />
        
        <div className="relative z-10 animate-in zoom-in duration-500 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/40">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter drop-shadow-lg">Success!</h1>
          <p className="text-xl font-bold opacity-90 max-w-xs drop-shadow-md">Setup Complete! Your shop is now live and secured.</p>
          <div className="mt-12 flex gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-white/50 rounded-full"></div>
            <div className="w-2 h-2 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: `url(${getBackgroundImage()})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-12 justify-between">
        <div className="space-y-4 text-center animate-in slide-in-from-top duration-700">
          {step === 'WELCOME' && (
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-xl">Welcome, Boss!</h1>
              <p className="text-emerald-100/70 text-sm font-bold tracking-wide uppercase drop-shadow-md">Let's set up your secure shop manager.</p>
            </div>
          )}
          {step === 'VERIFY' && (
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-xl">Verify Code</h1>
              <p className="text-emerald-100/70 text-sm font-bold tracking-wide uppercase drop-shadow-md">Enter the 6-digit code from Stage 0.</p>
            </div>
          )}
          {step === 'PIN' && (
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-xl">Create Admin PIN</h1>
              <p className="text-emerald-100/70 text-sm font-bold tracking-wide uppercase drop-shadow-md">Secure your profits and staff settings.</p>
            </div>
          )}
        </div>

        <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
          {step === 'WELCOME' && (
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[40px] text-center space-y-3 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-white"><Lock size={60} /></div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Your One-Time Setup Code</p>
                <div className="text-5xl font-mono font-black tracking-[0.2em]">{tempOtp}</div>
                <div className="pt-4 flex items-center justify-center gap-2 text-amber-300">
                  <AlertCircle size={14} />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Write this code down</p>
                </div>
              </div>
              <button onClick={() => setStep('VERIFY')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                Start Setup <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 'VERIFY' && (
            <div className="space-y-8">
              <div className="space-y-4">
                {renderInputGrid(otpArr, setOtpArr, otpRefs, 6)}
                {error && (
                  <div className="flex items-center justify-center gap-2 text-red-400 animate-bounce">
                    <AlertCircle size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <button 
                  onClick={handleVerifyOtp}
                  disabled={otpArr.join('').length < 6}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-500/30 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Identity
                </button>
                <button onClick={() => setStep('WELCOME')} className="w-full text-white/50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-2">
                  <ChevronLeft size={14} /> Go Back
                </button>
              </div>
            </div>
          )}

          {step === 'PIN' && (
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Set New 4-Digit PIN</p>
                  {renderInputGrid(pinArr, setPinArr, pinRefs, 4, true)}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Confirm Secret PIN</p>
                  {renderInputGrid(confirmPinArr, setConfirmPinArr, confirmPinRefs, 4, true)}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3 justify-center">
                  <AlertCircle className="text-red-400" size={16} />
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              <button 
                onClick={handleCompleteSetup}
                disabled={pinArr.join('').length < 4 || confirmPinArr.join('').length < 4}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-500/30 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                Complete Setup <CheckCircle2 size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4 opacity-50">
            <ShieldCheck size={16} />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Military-Grade Protection</p>
          </div>
        </div>
      </div>
    </div>
  );
};
