"use client";

import React, { useState, useEffect, useRef } from "react";
import { getChatMessages } from "@/lib/supabase";
import { Sparkles, Send, Plus, Settings } from "lucide-react";

interface Message {
  role: string;
  content: string;
  suggestions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchHistory() {
      const history = await getChatMessages();
      if (history && history.length > 0) {
        setMessages(history.map((msg: any) => ({ role: msg.role, content: msg.content })));
      } else {
        // Initial greeting to mimic the image exactly if empty
        setMessages([{
          role: 'assistant',
          content: 'Hi! I am MindMate. How are you feeling today? I am here to listen.',
          suggestions: [] 
        }]);
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (forcedUserMessage?: string) => {
    const userMsg = forcedUserMessage || input.trim();
    if(!userMsg) return;
    
    // Clear suggestions from the previous assistant message so they disappear after clicking
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages[newMessages.length - 1].suggestions = undefined;
      }
      return [...newMessages, { role: 'user', content: userMsg }];
    });
    
    if(!forcedUserMessage) setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('soul_link_id');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages, userId: token })
      });
      const data = await res.json();
      if(data.reply) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply,
          suggestions: data.suggestions
        }]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDayTime = () => {
    const d = new Date();
    return `TODAY • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#FDF8F9] font-['Plus_Jakarta_Sans'] pb-6">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-5 bg-white/50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[#FE005B] font-bold tracking-tight">
          <Sparkles size={22} className="text-[#FE005B]" />
          <span className="text-xl font-extrabold tracking-tight">MindMate</span>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24 space-y-6 scrollbar-hide flex flex-col">
        {messages.length > 0 && (
          <div className="text-center w-full mb-2">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider">
              {getDayTime()}
            </span>
          </div>
        )}

        {messages.map((m: Message, i: number) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-full bg-[#1b2533] flex items-center justify-center overflow-hidden border border-white shadow-sm">
                       <span className="text-[16px]">👨‍💼</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#9e1a3b] flex items-center justify-center shadow-lg shadow-[#9e1a3b]/30">
                      <Sparkles size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className="flex flex-col">
                  <div className={`px-5 py-4 font-medium text-[15px] leading-[1.4] shadow-sm
                    ${isUser 
                      ? 'bg-[#b82c46] text-white rounded-[24px] rounded-tr-sm' 
                      : 'bg-white text-[#111827] rounded-[24px] rounded-tl-sm border border-gray-100/50'
                    }`}
                  >
                    {m.content}
                  </div>
                  
                  {/* Status Label */}
                  <span className={`text-[9px] font-bold mt-1.5 text-gray-300 tracking-wider uppercase
                    ${isUser ? 'text-right' : 'text-left ml-2'}
                  `}>
                    {isUser ? 'DELIVERED' : 'MINDMATE AI'}
                  </span>
                </div>
              </div>

              {/* Suggestions */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="flex gap-2.5 mt-3 ml-[52px]">
                  {m.suggestions[0] && (
                    <button 
                      onClick={() => handleSend(m.suggestions![0])}
                      className="px-4 py-2 bg-[#bcf2cc] text-[#166534] rounded-full text-[13px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      {m.suggestions[0]}
                    </button>
                  )}
                  {m.suggestions[1] && (
                    <button 
                      onClick={() => handleSend(m.suggestions![1])}
                      className="px-4 py-2 bg-[#fcd2df] text-[#FE005B] rounded-full text-[13px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      {m.suggestions[1]}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[85%] flex-row items-start">
            <div className="flex-shrink-0 mt-1">
               <div className="w-10 h-10 rounded-full bg-[#9e1a3b] flex items-center justify-center shadow-lg shadow-[#9e1a3b]/30">
                  <Sparkles size={18} className="text-white" strokeWidth={2.5} />
               </div>
            </div>
            <div className="px-5 py-5 bg-white border border-gray-100/50 rounded-[24px] rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[52px]">
               <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-75"></span>
               <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-150"></span>
               <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-300"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-[100px] left-0 right-0 px-6 z-40 max-w-2xl mx-auto">
        <div className="flex gap-3 bg-white p-2 rounded-[32px] shadow-lg shadow-gray-200/50 items-center">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <Plus size={24} strokeWidth={2.5} />
          </button>
          
          <input 
            value={input} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} 
            placeholder="Share your thoughts..."
            className="flex-1 bg-transparent focus:outline-none text-gray-800 text-[15px] font-medium placeholder:text-gray-400 min-w-0"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          
          <button 
            onClick={() => handleSend()} 
            disabled={loading || !input.trim()} 
            className="w-[42px] h-[42px] shrink-0 rounded-full bg-[#b82c46] flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#b82c46]/30"
          >
            <Send size={18} className="text-white ml-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
