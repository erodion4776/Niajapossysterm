
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
      { q: "How do I install NaijaShop?", a: "On Android, open Chrome and visit the app link. Tap the 'Install' button or the 3 dots in the corner and select 'Add to Home Screen'. On iOS, tap the Share icon and select 'Add to Home Screen'. This allows the app to work 100% offline without network." },
      { q: "Setting up your first Admin PIN", a: "When you first launch the app as a Shop Owner, you'll receive a 6-digit verification code. After verification, you can create your secret 4-digit Admin PIN to lock your records from staff." },
      { q: "Adding your first product", a: "Go to the 'Stock' tab, tap the '+' button. Enter the product name, cost price, and selling price. You can also snap a photo of the product or use the AI scanner for expiry dates." }
    ]
  },
  {
    category: "Sales & Payments",
    icon: <Package className="text-emerald-500" size={20} />,
    items: [
      { q: "How to use Soft POS?", a: "In the POS cart, select 'Transfer'. The app will display your bank details to the customer. Once you confirm the alert on your bank app, tap 'YES, ALERT RECEIVED' in NaijaShop." },
      { q: "Recording partial payments", a: "If a customer pays part cash and owes the rest, choose 'Cash' as payment and enter the amount paid. The app will detect the underpayment and automatically record the balance in the Debt Book." },
      { q: "Sharing WhatsApp receipts", a: "After every sale, tap the 'WhatsApp' button. The app generates a professional text receipt that you can send directly to your customer's number, saving you the cost of paper and ink." }
    ]
  },
  {
    category: "Inventory & AI",
    icon: <Info className="text-blue-500" size={20} />,
    items: [
      { q: "Using the AI Expiry Scanner", a: "When adding or editing an item, tap the camera icon next to Expiry Date. Point your camera at the 'EXP' text on the product. Our AI will read the date automatically to help you avoid expired stock losses." },
      { q: "Bulk Inflation Protection", a: "Fuel or Dollar price go up? Go to Stock > TrendingUp Icon. You can increase prices for your entire shop by a percentage (e.g. 10%) or fixed amount instantly." }
    ]
  },
  {
    category: "Security & Staff",
    icon: <Lock className="text-purple-500" size={20} />,
    items: [
      { q: "How to clone to staff phones?", a: "In Admin Settings, add a 'Staff' user. Tap the share icon next to their name to generate an 'Invite Code'. On the staff phone, they should choose 'Staff Member' on setup and paste that code." },
      { q: "Admin vs Staff roles", a: "Admins can delete sales, change prices, and see total profits. Staff can only record sales and view stock. They cannot delete anything to hide money from you." }
    ]
  },
  {
    category: "Troubleshooting",
    icon: <RefreshCw className="text-red-500" size={20} />,
    items: [
      { q: "Fixing 'Site not found'", a: "This usually means your browser cache was cleared. Ensure you have 'Installed' the app to your home screen. Re-visit the link and tap 'Add to Home Screen' for the most stable experience." },
      { q: "Restoring from WhatsApp backup", a: "Go to Admin Settings > Database Icon (Restore). Select the .json.gz file from your phone's Downloads folder. Your entire business history will be restored in seconds." }
    ]
  }
];

export const PublicHelp: React.FC<PublicHelpProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => setOpenIndex(openIndex === id ? null : id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto pb-24">
      <header className="p-6 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-all">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black text-emerald-950 italic">Help Center</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search guides..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
                    <div key={id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button 
                        onClick={() => toggle(id)}
                        className="w-full p-6 text-left flex justify-between items-center gap-4"
                      >
                        <h3 className="font-black text-emerald-950 text-sm leading-tight">{item.q}</h3>
                        <div className="shrink-0 text-slate-300">
                          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 animate-in slide-in-from-top duration-200">
                          <p className="text-xs font-medium text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">NaijaShop Professional Support</p>
      </div>
    </div>
  );
};

export default PublicHelp;
