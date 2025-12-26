import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Zap, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getOCRWorker, preprocessImage, extractExpiryDate } from '../utils/ocr.ts';

interface ExpiryScannerProps {
  onDateFound: (date: string) => void;
  onClose: () => void;
}

export const ExpiryScanner: React.FC<ExpiryScannerProps> = ({ onDateFound, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [foundDate, setFoundDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) setHasFlash(true);

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Cannot access camera. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (e) {
      console.error("Flash toggle failed", e);
    }
  };

  const captureAndRead = async () => {
    if (!videoRef.current || !canvasRef.current || isReading) return;

    setIsReading(true);
    setError(null);

    // Initial Tesseract Download Check
    const needsDownload = !localStorage.getItem('tesseract_ready');
    if (needsDownload) {
      setIsDownloading(true);
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Crop only the focus box area for accuracy
      const boxSize = 300;
      const startX = (video.videoWidth - boxSize) / 2;
      const startY = (video.videoHeight - boxSize) / 2;

      canvas.width = boxSize;
      canvas.height = boxSize;
      ctx.drawImage(video, startX, startY, boxSize, boxSize, 0, 0, boxSize, boxSize);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Capture failed");

        // 1. Preprocess
        const processedDataUrl = await preprocessImage(blob);
        
        // 2. OCR
        const worker = await getOCRWorker((p) => setDownloadProgress(p));
        localStorage.setItem('tesseract_ready', 'true');
        setIsDownloading(false);

        const { data: { text } } = await worker.recognize(processedDataUrl);
        console.debug("OCR Output:", text);

        // 3. Extract Date
        const date = extractExpiryDate(text);
        if (date) {
          setFoundDate(date);
        } else {
          setError("Could not read date clearly. Try again with more light or type manually.");
        }
        setIsReading(false);
      }, 'image/jpeg', 0.95);

    } catch (err) {
      setError("AI Engine Error. Please try again.");
      setIsReading(false);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <button 
        onClick={onClose} 
        className="absolute top-8 right-8 bg-white/10 p-4 rounded-full text-white backdrop-blur-md z-[610] active:scale-95"
      >
        <X size={24} />
      </button>

      {/* Main Scanner View */}
      {!foundDate ? (
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Expiry Scanner</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest px-8">
              {isDownloading ? "Downloading AI Brain..." : "Position the Expiry Date inside the box"}
            </p>
          </div>

          <div className="w-full aspect-square relative rounded-[48px] overflow-hidden border-4 border-emerald-500/30 shadow-[0_0_80px_rgba(5,150,105,0.2)]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            {/* Focus Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[300px] h-[300px] border-4 border-emerald-400 rounded-3xl pointer-events-none relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-8 border-l-8 border-white rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-8 border-r-8 border-white rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-8 border-l-8 border-white rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-8 border-r-8 border-white rounded-br-xl"></div>
                
                {/* Scanning Line Animation */}
                {isReading && <div className="absolute inset-x-0 h-1 bg-emerald-400/50 shadow-[0_0_15px_#10b981] animate-[bounce_2s_infinite]"></div>}
              </div>
            </div>
          </div>

          {/* Progress Bar for Download */}
          {isDownloading && (
            <div className="w-full space-y-3 px-4">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
              </div>
              <p className="text-[10px] text-emerald-400 font-black uppercase text-center tracking-widest">
                First time download (10MB)... {downloadProgress}%
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-in shake duration-300">
              <AlertCircle size={20} />
              <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          <div className="flex gap-4 w-full px-4">
            {hasFlash && (
              <button 
                onClick={toggleFlash}
                className={`p-6 rounded-[32px] transition-all ${flashOn ? 'bg-amber-400 text-amber-950 shadow-[0_0_30px_rgba(251,191,36,0.4)]' : 'bg-white/10 text-white'}`}
              >
                <Zap size={24} fill={flashOn ? 'currentColor' : 'none'} />
              </button>
            )}
            <button 
              onClick={captureAndRead}
              disabled={isReading || isDownloading}
              className="flex-1 bg-white text-emerald-950 font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isReading ? <Loader2 className="animate-spin" /> : <Camera />}
              {isReading ? 'Reading Date...' : 'Snap Date'}
            </button>
          </div>
        </div>
      ) : (
        /* Confirmation View */
        <div className="w-full max-w-sm bg-white dark:bg-emerald-900 rounded-[48px] p-10 text-center space-y-8 animate-in zoom-in duration-300">
           <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
             <CheckCircle2 size={40} />
           </div>
           
           <div className="space-y-2">
             <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Date Found!</h2>
             <p className="text-slate-400 dark:text-emerald-500/60 text-xs font-bold uppercase tracking-widest">Is this correct?</p>
           </div>

           <div className="bg-slate-50 dark:bg-emerald-950/40 p-8 rounded-[32px] border-2 border-emerald-500/20">
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                {new Date(foundDate).toLocaleDateString([], { month: 'short', year: 'numeric', day: 'numeric' })}
              </p>
           </div>

           <div className="flex gap-3">
             <button 
               onClick={() => setFoundDate(null)}
               className="flex-1 bg-slate-100 dark:bg-emerald-800 text-slate-400 dark:text-emerald-500/40 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest"
             >
               Try Again
             </button>
             <button 
               onClick={() => onDateFound(foundDate)}
               className="flex-[2] bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
             >
               Yes, Fill Form <ArrowRight size={14} />
             </button>
           </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);