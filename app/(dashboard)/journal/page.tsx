"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJournals, supabase } from "@/lib/supabase";
import JournalCard from "@/components/JournalCard";
import JournalInput from "@/components/JournalInput";
import { Plus, Bell, Sparkles, LogOut, Edit3 } from "lucide-react";

export default function JournalPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [bookTitle, setBookTitle] = useState("My Mindful Sanctuary");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    const user = sessionStorage.getItem("soul_link_username") || localStorage.getItem("soul_link_username") || "";
    setUsername(user);
    const token = getActiveToken();
    if (token) {
      const savedBookTitle = localStorage.getItem(`journal_book_title_${token}`);
      if (savedBookTitle) {
        setBookTitle(savedBookTitle);
      }
    }
    loadJournals();
  }, []);

  const handleSaveBookTitle = (newTitle: string) => {
    const clean = newTitle.trim() || "My Mindful Sanctuary";
    setBookTitle(clean);
    setIsEditingTitle(false);
    const token = getActiveToken();
    if (token) {
      localStorage.setItem(`journal_book_title_${token}`, clean);
    }
  };

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

  const handleSaveEntry = async (title: string, text: string, file: File | null) => {
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
        body: JSON.stringify({ title, journalText: text, userId: token, imageUrl })
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

  const getWeeklyMoodTag = () => {
    if (!journals || journals.length === 0) {
      return { tag: "Normal", color: "text-gray-700 bg-gray-50 border-gray-200" };
    }
    const recent = journals.slice(0, 7);
    const total = recent.reduce((sum, j) => {
      const t = (j.ai_mood_label || '').toLowerCase();
      if (t.match(/fantastic|joy|ecstatic|thriving|super|wonderful/)) return sum + 10;
      if (t.match(/happy|great|inspired|motivated|balanced|grateful|calm|peaceful/)) return sum + 8;
      if (t.match(/tired|busy|stressed|anxious|sad|burnout|overwhelmed|negative/)) return sum + 4;
      if (t.match(/worst|depressed|hopeless|terrible|awful|crying/)) return sum + 2;
      return sum + 6;
    }, 0);
    const avg = total / recent.length;
    if (avg >= 9) return { tag: "Fantastic", color: "text-[#166534] bg-emerald-50 border-emerald-200" };
    if (avg >= 7.5) return { tag: "Happy", color: "text-[#15803d] bg-green-50 border-green-200" };
    if (avg >= 5.5) return { tag: "Normal", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (avg >= 3.5) return { tag: "Sad", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { tag: "Worst", color: "text-[#b42243] bg-red-50 border-red-200" };
  };

  const getDaysOfWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const mondayOffset = (dayOfWeek + 6) % 7; // Monday = 0, Tuesday = 1 ... Sunday = 6

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const active = [false, false, false, false, false, false, false];

    journals.forEach(j => {
      if (!j.created_at) return;
      const d = new Date(j.created_at);
      if (d >= startOfWeek && d < endOfWeek) {
        const jsDay = d.getDay();
        const idx = (jsDay + 6) % 7; // 0 for Monday, 6 for Sunday
        active[idx] = true;
      }
    });

    return {
      activeDays: active,
      currentDayIndex: mondayOffset
    };
  };

  const weekInfo = getDaysOfWeek();
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

      {/* Hero Editorial Section */}
      <section className="mb-6 mt-4">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#78555e] uppercase mb-2 block">Daily Reflections</span>
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              onBlur={() => handleSaveBookTitle(bookTitle)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveBookTitle(bookTitle)}
              autoFocus
              className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tighter bg-transparent border-b-2 border-[#b42243] focus:outline-none w-full pb-1"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-2.5 cursor-pointer group w-fit"
              title="Click to rename your journal book"
            >
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tighter leading-none">
                {bookTitle}
              </h2>
              <Edit3 size={20} className="text-gray-300 group-hover:text-[#b42243] transition-colors shrink-0" />
            </div>
          )}
        </div>
      </section>

      {/* Rhythm Section */}
      <div className="flex justify-between items-center mt-4 mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">Weekly Mood</h3>
        </div>
        <div className="text-right">
          <span className={`inline-block px-4 py-2 rounded-2xl text-base font-extrabold border ${getWeeklyMoodTag().color}`}>
            {getWeeklyMoodTag().tag}
          </span>
        </div>
      </div>

      {/* Days Array */}
      <div className="flex justify-between items-center mb-8 px-4 py-3 bg-white/70 rounded-2xl border border-gray-100 shadow-sm">
        {daysLetters.map((letter, idx) => {
          const isActive = weekInfo.activeDays[idx];
          const isToday = idx === weekInfo.currentDayIndex;

          return (
            <span
              key={idx}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#b42243] text-white shadow-sm'
                  : isToday
                  ? 'border-2 border-[#b42243] text-[#b42243] bg-pink-50/50'
                  : 'text-gray-400'
              }`}
            >
              {letter}
            </span>
          );
        })}
      </div>

      <div className="w-full h-px bg-gray-200/60 mt-4 mb-8"></div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[15px] font-bold text-gray-900 uppercase tracking-widest">Recent Entries</h2>
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
