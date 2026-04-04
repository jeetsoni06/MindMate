"use client";

import React, { useState, useEffect } from "react";
import { getJournals, supabase } from "@/lib/supabase";
import JournalCard from "@/components/JournalCard";
import JournalInput from "@/components/JournalInput";
import { Plus, Bell, Sparkles } from "lucide-react";

export default function JournalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    setLoading(true);
    const data = await getJournals();
    setJournals(data);
    setLoading(false);
  };

  const handleSaveEntry = async (text: string, file: File | null) => {
    try {
      let imageUrl = "";
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('journal-photos').upload(`public/${fileName}`, file, { cacheControl: '3600', upsert: false });
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Image upload failed, saving text only...");
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage.from('journal-photos').getPublicUrl(uploadData.path);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const token = localStorage.getItem('soul_link_id');
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText: text, userId: token, imageUrl })
      });
      if(res.ok) {
        await loadJournals();
      } else {
        alert("Failed to save entry.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save entry due to network error.");
    }
  };

  const calculateBloom = () => {
    if (!journals || journals.length === 0) return "0.0";
    const recent = journals.slice(0, 7);
    const total = recent.reduce((sum, j) => {
      const t = (j.ai_mood_label || '').toLowerCase();
      if (t.match(/joy|happy|thriving|great|inspired|motivated|balanced|grateful|calm|peaceful/)) return sum + 9;
      if (t.match(/tired|busy|stressed|anxious|sad|burnout|overwhelmed|negative/)) return sum + 4;
      return sum + 7;
    }, 0);
    return (total / recent.length).toFixed(1);
  };

  const getActiveDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diffToMonday));
    startOfWeek.setHours(0,0,0,0);

    const active = [false, false, false, false, false, false, false];
    journals.forEach(j => {
      const d = new Date(j.created_at);
      if (d >= startOfWeek) {
        let jsDay = d.getDay();
        let idx = jsDay === 0 ? 6 : jsDay - 1; 
        active[idx] = true;
      }
    });
    return active;
  };

  const activeDays = getActiveDays();
  const daysLetters = ['M','T','W','T','F','S','S'];

  return (
    <main className="px-6 md:px-12 max-w-2xl mx-auto flex flex-col pt-4 pb-12">
      {/* Top Bar Header */}
      <header className="flex justify-between items-center py-4 mb-4">
        <div className="flex items-center gap-2 text-[#FE005B] font-bold tracking-tight">
          <Sparkles size={20} className="text-[#FE005B]" />
          <span className="text-base uppercase tracking-wider">Mindmate</span>
        </div>
        <Bell size={20} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" strokeWidth={2.5} />
      </header>

      {/* Hero Editorial Section */}
      <section className="mb-12 mt-4">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#78555e] uppercase mb-2 block">Daily Reflections</span>
        <h2 className="text-5xl font-extrabold text-gray-900 tracking-tighter leading-none mb-4">
          Your Mindful <br /><span className="text-[#b42243]">Sanctuary.</span>
        </h2>
        <p className="text-[#594042] text-lg max-w-md leading-relaxed font-medium">Gather your thoughts like smooth river stones. Every entry is a step toward clarity.</p>
      </section>

      {/* Rhythm Section */}
      <div className="flex justify-between items-end mt-4 mb-6 bg-white p-6 justify-between rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-gray-500 uppercase mb-2">Your Rhythm</p>
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">Weekly Mood</h3>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-3xl font-bold text-[#166534] leading-none mb-1">{calculateBloom()}</span>
          <p className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Avg. Bloom</p>
        </div>
      </div>

      {/* Days Array */}
      <div className="flex justify-between items-center mb-10 px-4 text-[11px] font-bold tracking-widest text-gray-400">
        {daysLetters.map((letter, idx) => (
          <span key={idx} className={activeDays[idx] ? "text-[#FE005B] bg-pink-50 w-8 h-8 rounded-full flex items-center justify-center shadow-sm" : "w-8 h-8 flex items-center justify-center"}>{letter}</span>
        ))}
      </div>

      <div className="w-full h-px bg-gray-200/60 mt-4 mb-8"></div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[15px] font-bold text-gray-900 uppercase tracking-widest">Recent Entries</h2>
        <button className="text-[10px] font-bold text-[#FE005B] hover:opacity-80 transition-opacity flex items-center gap-1 uppercase tracking-widest">
           View Archive &rarr;
        </button>
      </div>

      <div className="flex flex-col gap-0 pb-16">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#b42243] border-t-transparent"></div>
            <p className="mt-4 text-[#594042] text-sm font-medium">Gathering your thoughts...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-32 h-32 bg-[#aaf0b0]/30 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="text-[#296b38]/40" size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No entries yet</h3>
            <p className="text-[#594042] max-w-xs mb-8 text-sm leading-relaxed">Your sanctuary is waiting. Begin your journey of self-discovery.</p>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#b42243] text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
              <Plus size={18} />
              Start Your First Entry
            </button>
          </div>
        ) : (
          journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        )}
      </div>

      <JournalInput 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveEntry} 
      />

      {/* Floating Action Button */}
      {!isModalOpen && (
        <div className="fixed right-6 bottom-28 z-40">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-gradient-to-tr from-[#b42243] to-[#ff5c77] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all outline-none"
            aria-label="New Entry"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </main>
  );
}
