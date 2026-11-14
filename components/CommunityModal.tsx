"use client";

import { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}

export default function CommunityModal({ isOpen, onClose, onSubmit }: CommunityModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle('');
    setContent('');
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(title.trim(), content.trim());
      setTitle('');
      setContent('');
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit story:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Popup confirmation after user submits story
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-[32px] p-7 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300 text-center font-['Plus_Jakarta_Sans']">
          <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#b42243] shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
            Story Submitted
          </h3>
          <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6">
            MindMate team will check it before uploading in 24 hours. Thank you for sharing your story.
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-[#b42243] hover:bg-[#9a1a36] text-white font-bold text-sm rounded-full shadow-lg shadow-[#b42243]/20 transition-all active:scale-95 cursor-pointer"
          >
            Okay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300 font-['Plus_Jakarta_Sans']">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#b42243] font-bold text-xl tracking-tight">Share Your Journey</h2>
          <button 
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors cursor-pointer"
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
              className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#b42243]/20 focus:border-[#b42243]/30 transition-all font-medium text-gray-800 placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-2">Your Experience</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what you're going through. Your words might be the exact hope someone else needs today..."
              className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-3xl min-h-[160px] resize-none focus:outline-none focus:ring-2 focus:ring-[#b42243]/20 focus:border-[#b42243]/30 transition-all font-medium text-gray-800 placeholder-gray-400 leading-relaxed"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#b42243] text-white py-4 rounded-full font-bold text-lg hover:bg-[#9a1a36] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#b42243]/20 cursor-pointer"
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
