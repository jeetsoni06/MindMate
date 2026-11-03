"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJournals, supabase } from "@/lib/supabase";
import JournalCard from "@/components/JournalCard";
import JournalInput from "@/components/JournalInput";
import { Plus, Bell, Sparkles, Lock, LogOut } from "lucide-react";

export default function JournalPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const user = sessionStorage.getItem("soul_link_username") || localStorage.getItem("soul_link_username") || "";
    setUsername(user);
    loadJournals();
  }, []);

  const getActiveToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("soul_link_id") || localStorage.getItem("soul_link_id");
  };

  const loadJournals = async () => {
    setLoading(true);
    const token = getActiveToken();
    if (!token) {
      setJournals([]);
      setLoading(false);
      return;
    }
    const data = await getJournals(token);
    setJournals(data);
    setLoading(false);
  };

  const handleLockVault = () => {
    sessionStorage.removeItem("soul_link_id");
    sessionStorage.removeItem("soul_link_username");
    localStorage.removeItem("soul_link_id");
    router.replace("/auth");
  };

  const handleSaveEntry = async (text: string, file: File | null) => {
    try {
      let imageUrl = "";
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('journal-photos')
          .upload(`public/${fileName}`, file, { cacheControl: '3600', upsert: false });
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Image upload failed, saving text only...");
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage.from('journal-photos').getPublicUrl(uploadData.path);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const token = getActiveToken();
      if (!token) {
        alert("Session expired. Please unlock your vault again.");
        router.replace("/auth");
        return;
      }

      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText: text, userId: token, imageUrl })
      });
      if (res.ok) {
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
        
        <div className="flex items-center gap-3">
          {username && (
            <span className="text-xs font-semibold text-gray-500 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              Vault: {username}
            </span>
          )}
          <button
            onClick={handleLockVault}
            title="Lock Sanctuary Vault"
            className="flex items-center gap-1.5 text-xs font-bold text-[#b42243] bg-white border border-[#b42243]/20 px-3 py-1.5 rounded-full hover:bg-pink-50 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        </div>
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
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Private Vault
        </span>
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
            <p className="text-[#594042] text-sm max-w-xs mb-6">Your private thoughts will appear here once you write them down.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#b42243] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-[#9a1a36] transition-all text-sm"
            >
              Write First Reflection
            </button>
          </div>
        ) : (
          journals.map((entry) => (
            <JournalCard key={entry.id} journal={entry} />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#b42243] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#b42243]/30 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        aria-label="New Journal Entry"
      >
        <Plus size={28} />
      </button>

      {/* Input Modal */}
      <JournalInput
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEntry}
      />
    </main>
  );
}
