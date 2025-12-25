
import React, { useState } from 'react';
import { ChevronLeft, Search, MessageCircle, ChevronDown, ChevronUp, HelpCircle, ShieldCheck } from 'lucide-react';
import { Page } from '../types.ts';

interface FAQProps {
  setPage: (page: Page) => void;
}

const FAQ_DATA = [
  {
    q: "Does this app really work without internet?",
    a: "Yes! You only need internet once to activate the app. After that, you can sell in Airplane Mode. All data is saved directly on your phone's memory (IndexedDB)."
  },
  {
    q: "Are there any monthly charges?",
    a: "No. Once you pay the ₦5,000 activation fee, the app is yours forever. You never have to pay another kobo. No subscriptions, no data tax."
  },
  {
    q: "What happens if I lose my phone or it spoils?",
    a: "This is why the 'Backup to WhatsApp' button in Settings is vital. If you backup daily, you can simply install the app on a new phone, import your WhatsApp file, and all your records come back."
  },
  {
    q: "Can my staff delete sales to steal money?",
    a: "No. If you set them as 'Staff' in the users section, they do not have a delete button. Only the person with the 'Admin' PIN can delete or edit sales records."
  },
  {
    q: "Why does it say 'Site cannot be reached' when I refresh?",
    a: "This happens if the browser cache is cleared. Ensure you have 'Installed' the app to your Home Screen using the 'Add to Home Screen' option. The installed version is much more stable."
  },
  {
    q: "How do I print receipts?",
    a: "To save you money on expensive hardware, we use WhatsApp Receipts. After a sale, click 'Share Receipt' to send a professional, branded breakdown directly to your customer's WhatsApp."
  },
  {
    q: "Can I use this on two phones at once?",
    a: "Yes. Use the 'Get Setup Key' in Admin Settings to clone your inventory to a second phone. Note: Since this is offline-first, sales on Phone A will not show on Phone B automatically."
  }
];

export const FAQ: React.FC<FAQProps> = ({ setPage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaq = FAQ_DATA.filter(item => 
    item.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50 p-4 space-y-6 pb-32 animate-in fade-in duration-300">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => setPage(Page.SETTINGS)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 transition-colors shadow-sm"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Help Center</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Support & FAQ</p>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input 
          type="text" 
          placeholder="Search questions..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-gray-900 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredFaq.map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
            <button 
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h3 className="text-sm font-black text-gray-800 leading-tight pr-4">{item.q}</h3>
              <div className="flex-shrink-0 bg-gray-50 p-1.5 rounded-full text-gray-300">
                {openIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            {openIndex === idx && (
              <div className="px-6 pb-6 animate-in slide-in-from-top duration-200">
                <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}

        {filteredFaq.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <HelpCircle size={48} className="mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">No matching questions found</p>
          </div>
        )}
      </div>

      <div className="bg-emerald-600 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Still Need Help?</h2>
          <p className="text-emerald-100 text-xs font-medium mb-6 leading-relaxed">
            Can't find what you're looking for? Chat with our direct support team in Nigeria.
          </p>
          <a 
            href="https://wa.me/2347062228026" 
            target="_blank"
            className="w-full bg-white text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-lg"
          >
            <MessageCircle size={20} /> Contact Support
          </a>
        </div>
        <ShieldCheck className="absolute -right-4 -bottom-4 opacity-10" size={120} />
      </div>

      <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] pt-4">
        NaijaShop POS • Version 2.5.0 Stable
      </p>
    </div>
  );
};
