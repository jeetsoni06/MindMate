"use client";

import { useState } from "react";

export default function ChatInput({ onSend }: any) {
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
    };

    return (
        <div className="fixed bottom-[88px] left-0 right-0 px-4 pb-4">
            <div className="max-w-3xl mx-auto bg-white p-2 flex gap-2 rounded-xl shadow-lg">

                <input
                    className="flex-1 p-2 outline-none"
                    placeholder="Share your thoughts..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />

                <button
                    onClick={handleSend}
                    className="px-4 bg-primary text-white rounded-lg"
                >
                    Send
                </button>

            </div>
        </div>
    );
}