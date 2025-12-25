import React from 'react';
import { CheckCircle2, Folder, Download, ShieldAlert, ArrowRight, Share2, Info } from 'lucide-react';

interface BackupSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
}

export const BackupSuccessModal: React.FC<BackupSuccessModalProps> = ({ isOpen, onClose, fileName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-emerald-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in duration-300">
        {/* Header with Icon */}
        <div className="bg-emerald-600 p-10 flex flex-col items-center text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Download size={120} />
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
            <Folder size={40} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-center">✅ Backup Saved to Phone!</h2>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* Location Guide */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Where is my file?</p>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-emerald-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-950 leading-tight">
                  Your backup is in your phone's <span className="underline">Downloads</span> folder.
                </p>
                <p className="text-[10px] font-mono font-bold text-emerald-600 break-all bg-white/50 px-2 py-1 rounded border border-emerald-100">
                  {fileName}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Section */}
          <div className="space-y-2">
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Important Warning</p>
             <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
               <ShieldAlert className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
               <p className="text-[11px] font-bold text-red-950 leading-relaxed">
                 ⚠️ Do not delete this file. This is your shop's life. If you lose your phone, you will need this file to get your records back.
               </p>
             </div>
          </div>

          {/* Pro Tip */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pro Safety Tip</p>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
              <Share2 className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-[11px] font-bold text-amber-950 leading-relaxed">
                For 100% safety, go to your 'Files' app and upload this file to your Google Drive or email it to yourself.
              </p>
            </div>
          </div>

          {/* How to Restore Preview */}
          <div className="pt-4 border-t border-gray-100">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">How to Restore:</h4>
             </div>
             <p className="text-[10px] text-gray-500 font-medium leading-relaxed pl-3.5">
               To bring back your data, go to <span className="font-bold text-gray-800">Admin &gt; Import JSON</span> and select this file from your Downloads folder.
             </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            Got it, I understand <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
