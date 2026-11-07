"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Camera, Smile } from "lucide-react";

export default function JournalInput({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, text: string, file: File | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle("");
    setText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsRecording(false);
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim() && !text.trim() && !selectedFile) return;
    setIsSaving(true);
    await onSave(title.trim(), text.trim(), selectedFile);
    setTitle("");
    setText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsSaving(false);
    onClose();
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported in this browser.");
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; 
    
    const baselineText = text;

    recognition.onresult = (event: any) => {
      let sessionTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript;
      }
      setText((baselineText ? baselineText + " " : "") + sessionTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech extraction error:", event.error);
      setIsRecording(false);
    };

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
    recognitionRef.current = recognition;
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      startRecording();
    }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
      <div className="bg-[#FDF8F9] w-full max-w-md md:max-w-xl h-[90vh] md:h-auto md:min-h-[560px] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)] slide-up-anim overflow-hidden">
        
        <header className="flex justify-between items-center px-6 py-5 border-b border-gray-100/50">
          <button onClick={handleClose} className="text-gray-500 hover:bg-gray-200/50 p-2 pl-0 rounded-full transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
          <span className="font-bold text-base text-[#b42243]">New Journal Entry</span>
          <button 
            onClick={handleSave} 
            disabled={isSaving || (!title.trim() && !text.trim() && !selectedFile)} 
            className="font-bold text-[13px] text-[#b42243] opacity-90 hover:opacity-100 disabled:opacity-40 transition-all"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </header>
        
        <div className="p-6 pt-5 pb-8 flex-1 overflow-y-auto flex flex-col relative">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-none mb-5">
            What's on your mind today?
          </h1>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
              Title
            </label>
            <input
              type="text"
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              autoFocus
              className="w-full bg-white border border-gray-200 focus:border-[#b42243] focus:ring-2 focus:ring-[#b42243]/20 rounded-2xl px-4 py-3 text-base font-bold text-gray-900 placeholder-gray-400 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Journal Thoughts / Body */}
          <div className="flex-1 bg-white border border-gray-200 rounded-3xl p-5 mb-6 flex flex-col min-h-[220px] shadow-sm">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Your Thoughts
            </label>
            <textarea 
              className="w-full flex-1 bg-transparent text-base text-gray-800 leading-relaxed font-medium resize-none placeholder-gray-400 outline-none pb-3 min-h-[140px]" 
              placeholder="Write your reflections, feelings, or story here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSaving}
            ></textarea>

            {previewUrl && (
              <div className="relative inline-block w-24 h-24 mb-3 ml-1">
                <img src={previewUrl} className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" alt="Preview" />
                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute -top-2 -right-2 bg-white text-gray-500 shadow-md p-1 rounded-full hover:bg-gray-50 transition-all">
                  <X size={14} />
                </button>
              </div>
            )}
            
            {/* Tool buttons placed below text area in flow so text never goes behind them */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button 
                type="button"
                onClick={toggleRecording} 
                className={`p-2 rounded-full transition-all ${isRecording ? 'bg-pink-100 text-[#b42243] animate-pulse ring-2 ring-[#b42243] ring-offset-1' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title={isRecording ? "Stop recording" : "Voice recording"}
              >
                <Mic size={20} />
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                title="Add photo"
              >
                <Camera size={20} />
              </button>
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 bg-white border border-gray-100 shadow-xl rounded-xl p-2 flex gap-1 z-20 w-max slide-up-anim">
                    {['😀','🥰','😌','😭','😡','✨','🌱','🧘'].map(emoji => (
                      <button key={emoji} type="button" onClick={() => { setText(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-xl hover:bg-gray-100 p-2 rounded-lg transition-all">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <button onClick={handleClose} className="text-[#b42243] font-bold text-xs uppercase tracking-widest px-4 py-3 hover:bg-pink-50 rounded-full transition-all">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || (!title.trim() && !text.trim() && !selectedFile)}
              className="bg-[#b42243] text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#b42243]/30 hover:bg-[#9a1a36] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              {isSaving ? "MindMate is reflecting..." : "Save Entry"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
