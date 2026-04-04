"use client";

import { useState } from 'react';
import { X, Send } from 'lucide-react';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}

export default function CommunityModal({ isOpen, onClose, onSubmit }: CommunityModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(title, content);
      setTitle('');
      setContent('');
      onClose();
    } catch (error) {
      console.error("Failed to submit story:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#FE005B] font-bold text-xl tracking-tight">Share Your Journey</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-2">Story Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Finding peace in the silence"
              className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#FE005B]/20 focus:border-[#FE005B]/30 transition-all font-medium text-gray-800 placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-2">Your Experience</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what you're going through. Your words might be the exact hope someone else needs today..."
              className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-3xl min-h-[160px] resize-none focus:outline-none focus:ring-2 focus:ring-[#FE005B]/20 focus:border-[#FE005B]/30 transition-all font-medium text-gray-800 placeholder-gray-400 leading-relaxed"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#FE005B] text-white py-4 rounded-full font-bold text-lg hover:bg-[#E60052] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FE005B]/20"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} strokeWidth={2.5} />
                  Post Anonymously
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4 font-medium">
              Your story will be shared anonymously to protect your privacy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
