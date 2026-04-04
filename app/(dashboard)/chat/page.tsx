"use client";

import React, { useState, useEffect, useRef } from "react";
import { getChatMessages } from "@/lib/supabase";
import { Sparkles, Zap } from "lucide-react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchHistory() {
      const history = await getChatMessages();
      if (history && history.length > 0) {
        setMessages(history.map((msg: any) => ({ role: msg.role, content: msg.content })));
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if(!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev: {role: string, content: string}[]) => [...prev, {role: 'user', content: userMsg}]);
    setInput('');
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
        setMessages((prev: {role: string, content: string}[]) => [...prev, {role: 'assistant', content: data.reply}]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] pt-4 px-6 max-w-2xl mx-auto">
      <header className="flex justify-between items-center py-4 mb-4">
        <div className="flex items-center gap-2 text-[#FE005B] font-bold">
          <Sparkles size={20} />
          <span>Mindmate AI</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6 flex flex-col scrollbar-hide py-2">
        {messages.length === 0 && <p className="text-gray-400 font-medium text-center text-sm mt-10">Start a conversation with your Mindmate AI.</p>}
        {messages.map((m: {role: string, content: string}, i: number) => (
          <div key={i} className={`px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-gray-100 text-gray-900 self-end ml-auto rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 mr-auto rounded-bl-sm'}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="px-5 py-3.5 rounded-2xl rounded-bl-sm max-w-[85%] bg-white border border-gray-100 text-gray-800 mr-auto flex items-center gap-2 animate-pulse shadow-sm h-[50px]">
             <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-75"></span>
             <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-150"></span>
             <span className="w-2 h-2 rounded-full bg-[#FE005B] animate-bounce delay-300"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 relative bg-white border border-gray-200 p-1.5 rounded-full shadow-sm">
        <input 
          value={input} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)} 
          placeholder="Message MindMate..."
          className="flex-1 p-3 pl-5 rounded-full bg-transparent focus:outline-none text-gray-800 text-sm font-medium placeholder:text-gray-400"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-12 h-12 shrink-0 rounded-full bg-[#FE005B] text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-md">
          <Zap size={18} className="fill-white" />
        </button>
      </div>
    </div>
  );
}
