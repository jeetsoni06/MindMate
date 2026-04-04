import React from "react";
import { Compass, Sparkles } from "lucide-react";

function getThemeStyles(theme: string) {
  const t = theme.toLowerCase();
  if (t.match(/joy|happy|thriving|great|inspired|motivated|balanced|grateful|calm|peaceful/)) {
    return 'bg-[#166534]'; // Positive - Green
  }
  if (t.match(/tired|busy|stressed|anxious|sad|burnout|overwhelmed|negative/)) {
    return 'bg-[#ea580c]'; // Negative - Orange
  }
  return 'bg-[#0ea5e9]'; // Neutral/Mixed - Blue
}

export default function JournalCard({ journal }: { journal: any }) {
  const themeText = journal.ai_mood_label || 'Balanced';
  const themeBgColor = getThemeStyles(themeText);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-4 mb-6 border border-gray-50 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {new Date(journal.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {new Date(journal.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
        <div className={`text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeBgColor}`}>
          <Compass size={12} /> {themeText}
        </div>
      </div>
      
      {journal.image_url && (
        <img src={journal.image_url} alt="Journal visual memory" className="w-full h-auto max-h-64 object-cover rounded-xl mt-4 shadow-sm border border-gray-100/50" />
      )}

      <p className="text-sm text-gray-800 leading-relaxed font-medium mt-3 whitespace-pre-wrap">
        {journal.content_text}
      </p>

      {journal.wellness_tip && (
        <div className="bg-white p-3.5 rounded-xl flex items-start gap-3 shadow-sm border border-gray-50 mt-4">
          <Sparkles size={16} className="text-[#FE005B] shrink-0 mt-0.5" />
          <p className="text-xs italic text-gray-600 leading-relaxed">{journal.wellness_tip}</p>
        </div>
      )}
    </div>
  );
}
