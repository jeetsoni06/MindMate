"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Sprout, Sparkles, Mountain, Leaf, Link } from 'lucide-react';
import Image from 'next/image';
import CommunityModal from '@/components/CommunityModal';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  authorName: string;
  authorIcon: string;
  timeAgo: string;
  title: string;
  content: string;
  category: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/community');
      const data = await res.json();
      if (data.stories) {
        setStories(data.stories);
      }
    } catch (error) {
      console.error("Failed to fetch stories", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareStory = async (title: string, content: string) => {
    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      // Re-fetch stories after submission, though in a real app it might be awaiting vetting
      await fetchStories();
    } catch (error) {
      console.error("Error submitting story", error);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'mountain':
        return <span className="text-xl">⛰️</span>;
      case 'sparkles':
        return <span className="text-[#FE005B] text-xl">✨</span>;
      case 'sprout':
        return <Sprout size={20} className="text-[#166534]" />;
      default:
        return <Leaf size={20} className="text-[#166534]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] px-6 pt-12 pb-32 font-['Plus_Jakarta_Sans']">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[#b5173f] active:scale-95 transition-transform">
            <ArrowLeft strokeWidth={2.5} size={24} />
          </button>
          <div>
            <h1 className="text-[#b5173f] text-[22px] font-extrabold tracking-tight leading-none bg-clip-text">
              Success Stories
            </h1>
            <p className="text-gray-500 text-xs font-semibold mt-1">
              Real stories. Real growth.
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-white shadow-sm flex items-center justify-center">
          {/* Fallback to emoji if no user image available */}
          <span className="text-2xl">👨‍💼</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 relative">
        
        {/* Banner Card */}
        <div className="bg-gradient-to-br from-[#eefaf2] to-[#f6fdf9] rounded-[32px] p-8 shadow-sm border border-[#e6f4ea] relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-[#C53F54] font-bold text-xs tracking-widest uppercase mb-4 flex items-center">
              COMMUNITY SANCTUARY
            </h2>
            <h3 className="text-[28px] font-extrabold text-[#111827] leading-[1.1] tracking-tight mb-4">
              Read inspiring journeys from people who chose to <span className="text-[#FE005B]">grow</span>.
            </h3>
            <p className="text-[#6B7280] text-[15px] font-medium leading-relaxed max-w-[90%]">
              Heal, and move forward. You're not alone. Each story is a beacon of hope for someone still in the dark.
            </p>
          </div>
        </div>

        {/* Stories Feed */}
        {loading ? (
          <div className="animate-pulse space-y-6 pt-4">
            <div className="h-64 bg-white/50 rounded-[32px]"></div>
            <div className="h-64 bg-white/50 rounded-[32px]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {stories.map((story, index) => (
              <div 
                key={story.id || index}
                className={`bg-white rounded-[32px] p-8 shadow-sm relative overflow-hidden ${
                  index === 0 ? 'border-l-4 border-l-[#166534]' : 'border border-gray-100'
                }`}
              >
                {/* Author Section */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      story.authorIcon === 'sparkles' ? 'bg-red-50' : 'bg-[#e2f1e6]'
                    }`}>
                      {getIcon(story.authorIcon)}
                    </div>
                    <span className={`text-[13px] font-bold tracking-widest ${
                      story.authorIcon === 'sparkles' ? 'text-[#C53F54]' : 'text-[#166534]'
                    }`}>
                      {story.authorName}
                    </span>
                  </div>
                  {story.timeAgo && (
                    <span className="text-[12px] font-medium text-gray-400">
                      {story.timeAgo}
                    </span>
                  )}
                </div>

                {/* Content */}
                <h4 className="text-[22px] font-extrabold text-[#111827] leading-tight mb-3 tracking-tight">
                  {story.title}
                </h4>
                
                <p className="text-[#6B7280] text-[15px] font-medium leading-relaxed italic mb-5 pr-4 line-clamp-3">
                  {story.content}
                </p>

                <button className="text-[#C53F54] font-bold text-[15px] flex items-center gap-1 hover:text-[#9e3343] transition-colors">
                  {index === 0 ? 'Read More' : 'Read full journey'} <ArrowLeft className="rotate-180 ml-1" size={16} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#FE005B] text-white px-6 py-4 rounded-full font-bold shadow-xl shadow-[#FE005B]/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="text-[17px]">Share Story</span>
        </button>
      </div>

      <CommunityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleShareStory}
      />
    </div>
  );
}
