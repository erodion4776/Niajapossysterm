
import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle, ArrowLeft, Book, Shield, Zap, Info, HelpCircle, Package, Lock, RefreshCw, Smartphone } from 'lucide-react';

interface PublicHelpProps {
  onBack: () => void;
}

const HELP_SECTIONS = [
  {
    category: "Getting Started",
    icon: <Zap className="text-amber-500" size={20} />,
    items: [
      { q: "How do I install NaijaShop?", a: "On Android, open Chrome and visit the app link. Tap the 'Install' button or the 3 dots in the corner and select 'Add to Home Screen'. On iOS, tap the Share icon and select 'Add to Home Screen'." },
      { q: "Setting up your first Admin PIN", a: "When you first launch the app as a Shop Owner, you'll receive a 6-digit verification code. After verification, you can create your secret 4-digit Admin PIN to lock your records." },
      { q: "Adding your first product", a: "Go to the 'Stock' tab, tap the '+' button. Enter the product name, cost price, and selling price. You can also snap a photo of the product for better tracking." }
    ]
  },
  {
    category: "Sales & Payments",
    icon: <Package className="text-emerald-500" size={20} />,
    items: [
      { q: "How to use Soft POS?", a: "In the POS cart, select 'Transfer'. The app will display your bank details (set up in Admin Settings) to the customer. Once you confirm the alert on your bank app, tap 'YES, ALERT RECEIVED' in NaijaShop." },
      { q: "Recording partial payments", a: "If a customer pays part cash and owes the rest, choose 'Cash' as payment and enter the amount paid. The app will detect the underpayment and automatically record the balance as Debt." },
      { q: "Sharing WhatsApp receipts", a: "After every sale, tap the 'WhatsApp' button. The app generates a professional, branded text receipt that you can send directly to your customer's number." }
    ]
  },
  {
    category: "Inventory & AI",
    icon: <Info className="text-blue-500" size={20} />,
    items: [
      { q: "Using the AI Expiry Scanner", a: "When adding or editing an item, tap the camera icon next to Expiry Date. Point your camera at the 'EXP' text on the product. Our AI will read the date automatically and fill the form." },
      { q: "Bulk Inflation Protection", a: "Fuel price go up? Go to Stock > TrendingUp Icon. You can increase prices for your entire shop or a specific category by a percentage (e.g. 10%) or fixed amount instantly." }
    ]
  },
  {
    category: "Security & Staff",
    icon: <Lock className="text-purple-500" size={20} />,
    items: [
      { q: "How to clone to staff phones?", a: "In Admin Settings, add a 'Staff' user. Tap the share icon next to their name to generate an 'Invite Code'. On the staff phone, they should choose 'Staff Member' on setup and paste that code." },
      { q: "Admin vs Staff roles", a: "Admins can delete sales, change prices, and see total profits. Staff can only record sales, view stock, and see their own sales for the day. They cannot delete anything." }
    ]
  },
  {
    category: "Troubleshooting",
    icon: <RefreshCw className="text-red-500" size={20} />,
    items: [
      { q: "Fixing 'Site not found'", a: "This usually means your browser cache was cleared. Re-visit the original link and ensure you have 'Installed' the app to your home screen for better stability." },
      { q: "Restoring from WhatsApp backup", a: "Go to Admin Settings > Database Icon (Restore). Select the .json.gz file from your phone's Downloads folder (the one you sent to yourself on WhatsApp). Everything will come back instantly." }
    ]
  }
];

export const PublicHelp: React.FC<PublicHelpProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => setOpenIndex(openIndex === id ? null : id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950 flex flex-col max-w-lg mx-auto pb-24">
      <header className="p-6 bg-white dark:bg-emerald-900 border-b border-slate-100 dark:border-emerald-800 sticky top-0 z-50">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-xl text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 italic">Help Center</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search documentation..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        {HELP_SECTIONS.map((section, sIdx) => {
          const filteredItems = section.items.filter(i => 
            i.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
            i.a.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                {section.icon}
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{section.category}</h2>
              </div>
              <div className="space-y-3">
                {filteredItems.map((item, iIdx) => {
                  const id = `${sIdx}-${iIdx}`;
                  const isOpen = openIndex === id;
                  return (
                    <div key={id} className="bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-[32px] overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggle(id)}
                        className="w-full p-6 text-left flex justify-between items-center gap-4"
                      >
                        <h3 className="font-black text-slate-800 dark:text-emerald-50 text-sm leading-tight">{item.q}</h3>
                        <div className="shrink-0 text-slate-300">
                          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 animate-in slide-in-from-top duration-200">
                          <p className="text-xs font-medium text-slate-500 dark:text-emerald-400 leading-relaxed bg-slate-50 dark:bg-emerald-950 p-4 rounded-2xl border border-slate-100 dark:border-emerald-800">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      <a 
        href="https://wa.me/2347062228026" 
        target="_blank"
        className="fixed bottom-8 right-6 bg-emerald-600 text-white p-5 rounded-full shadow-2xl animate-bounce active:scale-90 transition-all z-[60]"
      >
        <MessageCircle size={28} className="fill-white/20" />
      </a>
      
      <div className="text-center py-6">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">NaijaShop Support Ecosystem</p>
      </div>
    </div>
  );
};

export default PublicHelp;
