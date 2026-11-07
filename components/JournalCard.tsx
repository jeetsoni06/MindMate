"use client";

import React, { useState } from "react";
import { ChevronRight, X } from "lucide-react";

export function parseJournalContent(raw: string) {
  if (!raw) return { title: "Untitled Reflection", body: "" };

  const trimmed = raw.trim();
  if (trimmed.startsWith("# ")) {
    const firstLineEnd = trimmed.indexOf("\n");
    if (firstLineEnd === -1) {
      return {
        title: trimmed.slice(2).trim() || "Untitled Reflection",
        body: ""
      };
    }
    const title = trimmed.slice(2, firstLineEnd).trim();
    const body = trimmed.slice(firstLineEnd).trim();
    return {
      title: title || "Untitled Reflection",
      body: body
    };
  }

  // Fallback for older entries without markdown header
  const lines = trimmed.split("\n").filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length <= 60) {
      return {
        title: firstLine,
        body: lines.slice(1).join("\n\n").trim() || firstLine
      };
    }
    return {
      title: firstLine.slice(0, 50) + "...",
      body: trimmed
    };
  }

  return { title: "Untitled Reflection", body: trimmed };
}

export default function JournalCard({ journal }: { journal: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const { title, body } = parseJournalContent(journal.content_text || "");

  const dateObj = new Date(journal.created_at);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <>
      {/* Journal Preview Card: strictly Title, Date, Time */}
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white p-5 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] mb-4 border border-gray-100 hover:border-[#b42243]/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4 overflow-hidden"
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {formattedDate} • {formattedTime}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight group-hover:text-[#b42243] transition-colors break-words [overflow-wrap:anywhere] line-clamp-2">
            {title}
          </h3>
        </div>
        
        <div className="shrink-0 text-gray-300 group-hover:text-[#b42243] group-hover:translate-x-1 transition-all">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Full Journal Viewer Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg max-h-[85vh] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl relative border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 shrink-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {formattedDate} • {formattedTime}
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-all"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Journal Content */}
            <div className="overflow-y-auto py-5 space-y-5 flex-1 pr-1">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
                {title}
              </h2>

              {journal.image_url && (
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm max-h-80">
                  <img 
                    src={journal.image_url} 
                    alt={title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}

              {body ? (
                <div className="text-base text-gray-700 leading-relaxed font-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {body}
                </div>
              ) : (
                <p className="text-sm italic text-gray-400">No additional notes for this entry.</p>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 bg-[#b42243] hover:bg-[#9a1a36] text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-[#b42243]/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
