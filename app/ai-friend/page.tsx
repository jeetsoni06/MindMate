"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import BottomNav from "@/components/BottomNav";

export default function Page() {
    const [messages, setMessages] = useState<{role: 'assistant'|'user', text: string}[]>([
        {
            role: "assistant",
            text: "Hi! I am MindMate. How are you feeling today?",
        },
    ]);

    const [isThinking, setIsThinking] = useState(false);

    const handleSend = async (text: string) => {
        setMessages((prev) => [...prev, { role: "user", text }]);
        setIsThinking(true);

        try {
            // Re-map messages slightly if the backend expects 'content' instead of 'text'
            // But our current implementation uses 'content', so let's format it.
            const historyForBackend = messages.map(m => ({ role: m.role, content: m.text }));

            // Optional identity hook (from original implementation)
            const token = typeof window !== 'undefined' ? localStorage.getItem('soul_link_id') : null;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: historyForBackend, userId: token })
            });

            const data = await response.json();

            if (data.reply) {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", text: data.reply },
                ]);
            } else if (data.error) {
                console.error("AI API Error:", data.error);
            }
        } catch (error) {
            console.error("Fetch failure:", error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", text: "I'm having trouble connecting to my servers right now... but I'm still here for you." }
            ]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="bg-[#f8faf8] min-h-screen">

            <Navbar />

            <main className="pt-24 pb-32 px-4 max-w-3xl mx-auto space-y-6">
                {messages?.map((msg, i) => (
                    <ChatMessage key={i} role={msg.role} text={msg.text} />
                ))}
                
                {isThinking && (
                     <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant text-on-surface mr-auto flex items-center gap-2 animate-pulse w-max">
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300"></span>
                        <span className="ml-2 text-sm text-outline">MindMate is thinking...</span>
                     </div>
                )}
            </main>

            <ChatInput onSend={handleSend} />
            <BottomNav />

        </div>
    );
}