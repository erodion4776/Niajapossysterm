
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
    // Fix: Access remainingBalance property correctly on Debt objects
    const totalDebt = debts?.filter(d => d.status === 'Unpaid').reduce((sum, d) => sum + d.remainingBalance, 0) || 0;
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
      // Fix: Follow initialization guidelines for GoogleGenAI
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Fix: Use generateContent directly as per latest Gemini API guidelines
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

      // Fix: Access text directly as a property of GenerateContentResponse
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
            <