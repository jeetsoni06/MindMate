"use client";

import React, { useState } from "react";
import { Home, MessageCircle, CheckSquare, Heart, Plus } from "lucide-react";
import { saveJournalEntry } from "../lib/supabase";

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntryText, setNewEntryText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const dummyEntries = [
    {
      id: 1,
      title: "Morning Routine",
      snippet: "Woke up early, drank some water, and did a quick 10-minute meditation. Feeling ready for the day ahead!",
      time: "8:00 AM",
      date: "Today",
    },
    {
      id: 2,
      title: "Afternoon Slump",
      snippet: "Feeling a bit tired after lunch. Need to grab a coffee and power through the rest of the work.",
      time: "2:30 PM",
      date: "Today",
    },
    {
      id: 3,
      title: "Evening Reflection",
      snippet: "Had a good day overall. Managed to tick off everything on my to-do list. Grateful for the little things.",
      time: "9:00 PM",
      date: "Yesterday",
    },
  ];

  const handleSave = async () => {
    if (!newEntryText.trim()) return;
    
    setIsSaving(true);
    try {
      await saveJournalEntry(newEntryText);
      setNewEntryText("");
      setIsModalOpen(false);
      alert("Journal entry saved successfully!"); // Simple feedback for now
    } catch (error) {
      console.error(error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white px-5 py-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-rose-500">MindMate</h1>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {dummyEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 text-lg">{entry.title}</h3>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                {entry.date} at {entry.time}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {entry.snippet}
            </p>
          </div>
        ))}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all z-40 transform hover:-translate-y-1"
        aria-label="New Entry"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 pb-safe z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button className="flex flex-col items-center justify-center w-full h-full text-rose-500 transition-colors">
          <Home size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-medium">Journal</span>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-rose-400 transition-colors">
          <MessageCircle size={22} className="mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">AI Friend</span>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-rose-400 transition-colors">
          <CheckSquare size={22} className="mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">To-Do</span>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-rose-400 transition-colors">
          <Heart size={22} className="mb-1" strokeWidth={2} />
          <span className="text-[10px] font-medium">Wellness</span>
        </button>
      </nav>

      {/* Full-Screen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700 font-medium text-base transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <h2 className="font-semibold text-lg text-gray-800">New Entry</h2>
            <button
              onClick={handleSave}
              disabled={isSaving || !newEntryText.trim()}
              className="text-rose-500 hover:text-rose-600 disabled:text-rose-300 font-semibold text-base transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
          <div className="flex-1 p-5 bg-gray-50">
            <textarea
              className="w-full h-full outline-none resize-none text-lg text-gray-800 placeholder-gray-400 bg-transparent"
              placeholder="What's on your mind today?"
              autoFocus
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
