"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getChatMessages } from "@/lib/supabase";
import { Sparkles, Send, Plus, LogOut } from "lucide-react";

interface Message {
  role: string;
  content: string;
  suggestions?: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getActiveToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("soul_link_id") || localStorage.getItem("soul_link_id");
  };

  useEffect(() => {
    const user = sessionStorage.getItem("soul_link_username") || localStorage.getItem("soul_link_username") || "";
    setUsername(user);

    async function fetchHistory() {
      const token = getActiveToken();
      if (!token) return;
      const history = await getChatMessages(token);
      if (history && history.length > 0) {
        setMessages(history.map((msg: any) => ({ role: msg.role, content: msg.content })));
      } else {
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

  const handleLockVault = () => {
    sessionStorage.removeItem("soul_link_id");
    sessionStorage.removeItem("soul_link_username");
    localStorage.removeItem("soul_link_id");
    router.replace("/auth");
  };

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
      const token = getActiveToken();
      // Ensure history sent to Gemini starts from actual conversation turns
      const conversationHistory = messages.filter((m, idx) => {
        if (idx === 0 && m.role === 'assistant' && m.content.startsWith('Hi! I am MindMate')) {
          return false;
        }
        return true;
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: conversationHistory, userId: token })
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
      <header className="flex justify-between items-center px-6 py-4 bg-white/70 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2 text-[#FE005B] font-bold tracking-tight">
          <Sparkles size={22} className="text-[#FE005B]" />
          <span className="text-xl font-extrabold tracking-tight">MindMate</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLockVault}
            title="Back to Login"
            className="flex items-center gap-1.5 text-xs font-bold text-[#b42243] bg-white border border-[#b42243]/20 px-3 py-1.5 rounded-full hover:bg-pink-50 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Back to Login</span>
          </button>
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
                    <div className="w-8 h-8 rounded-full bg-[#ffdadc] flex items-center justify-center text-xs font-bold text-[#40000f]">
                      ME
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FE005B] flex items-center justify-center text-white shadow-sm">
                      <Sparkles size={16} />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#FE005B] text-white rounded-tr-sm shadow-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>

              {/* Suggestions (only under assistant messages) */}
              {!isUser && m.suggestions && m.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 ml-11">
                  {m.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="text-xs bg-white border border-[#FE005B]/30 text-[#FE005B] hover:bg-pink-50 px-3.5 py-1.5 rounded-full font-semibold transition-all shadow-sm active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FE005B] flex items-center justify-center text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="bg-white p-4 rounded-3xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 max-w-2xl mx-auto px-6 z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border border-gray-100"
        >
          <input
            type="text"
            placeholder="Share what's on your mind..."
            className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-[#FE005B] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#FE005B]/20"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
