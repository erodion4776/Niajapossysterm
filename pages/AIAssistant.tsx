import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { formatNaira } from '../utils/whatsapp.ts';
import { 
  Sparkles, 
  Send, 
  ArrowLeft, 
  Bot, 
  User as UserIcon, 
  TrendingUp, 
  AlertCircle,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { Page } from '../types.ts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AIAssistantProps {
  setPage: (page: Page) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ setPage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inventory = useLiveQuery(() => db.inventory.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const generateSystemInstruction = () => {
    const lowStock = inventory?.filter(i => i.stock < 5).map(i => i.name).join(', ') || 'None';
    const totalSales = sales?.length || 0;
    const totalDebt = debts?.filter(d => d.status === 'Unpaid').reduce((sum, d) => sum + d.amount, 0) || 0;
    const shopName = localStorage.getItem('shop_name') || 'NaijaShop';

    return `You are NaijaGPT, an expert Nigerian business consultant and shop manager for "${shopName}". 
    Your tone is friendly, professional, and savvy, using Nigerian English/Pidgin where appropriate (e.g., using terms like "Oga", "Customer", "Market", "Naira").
    
    CURRENT SHOP DATA:
    - Low Stock Items: ${lowStock}
    - Total Transactions Recorded: ${totalSales}
    - Outstanding Customer Debt: ${formatNaira(totalDebt)}
    
    Always provide actionable advice to increase profit, manage stock better, or recover debts. Keep responses concise and formatted with bullet points if helpful.`;
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Corrected initialization to follow Gemini API guidelines exactly.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages, userMessage].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: generateSystemInstruction(),
          temperature: 0.7,
        }
      });

      const modelText = response.text || "Oga, I'm having trouble connecting right now. Please check your network.";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry Oga, I couldn't reach the server. Make sure you are connected to the internet for the AI assistant." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "How can I increase sales?",
    "Which items should I restock?",
    "Advice on recovering debts",
    "Analyze my business health"
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 pt-6 flex items-center gap-4 shadow-lg sticky top-0 z-20">
        <button 
          onClick={() => setPage(Page.DASHBOARD)}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Sparkles size={20} className="text-emerald-100" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">NaijaGPT</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-200">AI Business Consultant</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 pb-32"
      >
        {messages.length === 0 && (
          <div className="py-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Bot size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-800">Welcome, Oga!</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider px-10">
                I'm your AI partner. Ask me anything about your shop or how to grow your profit.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 px-4">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(s)}
                  className="bg-white border border-gray-100 p-4 rounded-2xl text-xs font-black text-emerald-700 text-left hover:bg-emerald-50 active:scale-95 transition-all shadow-sm flex justify-between items-center"
                >
                  {s} <TrendingUp size={14} className="opacity-40" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm flex gap-3 ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              <div className="flex-shrink-0 mt-1">
                {m.role === 'user' ? <UserIcon size={16} /> : <Sparkles size={16} className="text-emerald-500" />}
              </div>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                {m.text}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
              <Loader2 size={16} className="text-emerald-500 animate-spin" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">NaijaGPT is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 p-4 pb-6 safe-bottom">
        <div className="relative flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Ask Oga AI..."
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-14"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 active:scale-90 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};