import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageCircle } from 'lucide-react';

interface TrialGuardProps {
  children: (isExpired: boolean) => React.ReactNode;
}

// Set to 3 days (3 * 24 * 60 * 60 * 1000)
const TRIAL_DURATION_MS = 259200000; 

export const TrialGuard: React.FC<TrialGuardProps> = ({ children }) => {
  const trialStart = useLiveQuery(() => db.settings.get('trial_start'));
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (trialStart) {
      const checkExpiry = () => {
        const now = Date.now();
        const start = trialStart.value;
        if (now - start >= TRIAL_DURATION_MS) {
          setIsExpired(true);
        }
      };
      
      checkExpiry();
      const interval = setInterval(checkExpiry, 10000); // Check every 10s
      return () => clearInterval(interval);
    }
  }, [trialStart]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isExpired && (
        <div className="bg-red-600 text-white p-3 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 animate-pulse">
          <span>Application Lock: Contact Developer to unlock.</span>
          <a 
            href="https://wa.me/2347062228026" 
            target="_blank" 
            className="bg-white text-red-600 px-2 py-1 rounded text-xs flex items-center gap-1"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      )}
      {children(isExpired)}
    </div>
  );
};