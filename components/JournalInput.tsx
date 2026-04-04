"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Camera, Smile, Sparkles } from "lucide-react";

export default function JournalInput({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (text: string, file: File | null) => Promise<void> }) {
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

  const handleSave = async () => {
    if (!text.trim() && !selectedFile) return;
    setIsSaving(true);
    await onSave(text, selectedFile);
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
      <div className="bg-[#FDF8F9] w-full max-w-md md:max-w-xl h-[90vh] md:h-auto md:min-h-[600px] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)] slide-up-anim overflow-hidden">
        
        <header className="flex justify-between items-center px-6 py-5 border-b border-gray-100/50">
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-200/50 p-2 pl-0 rounded-full transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
          <span className="font-bold text-base text-[#FE005B]">Reflect</span>
          <button onClick={handleSave} disabled={isSaving || (!text.trim() && !selectedFile)} className="font-bold text-[13px] text-[#FE005B] opacity-90 hover:opacity-100 disabled:opacity-50">
            Save
          </button>
        </header>
        
        <div className="p-6 pt-5 pb-8 flex-1 overflow-y-auto flex flex-col relative">
          <span className="text-[10px] font-extrabold tracking-widest text-[#166534] uppercase mb-3">
            New Journal Entry
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none mb-6">
            What's on your mind today?
          </h1>

          <div className="flex-1 bg-gray-50/60 rounded-3xl p-5 mb-6 relative flex flex-col">
            <textarea 
              className="w-full flex-1 bg-transparent text-lg text-gray-800 leading-relaxed font-medium resize-none placeholder-gray-300 outline-none pb-12" 
              placeholder="What's on your mind, Jay?"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSaving}
            ></textarea>

            {previewUrl && (
              <div className="relative inline-block w-24 h-24 mb-4 ml-1">
                <img src={previewUrl} className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" alt="Preview" />
                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute -top-2 -right-2 bg-white text-gray-500 shadow-md p-1 rounded-full hover:bg-gray-50 transition-all">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <button onClick={toggleRecording} className={`p-2 rounded-full transition-all ${isRecording ? 'bg-pink-100 text-[#FE005B] animate-pulse ring-2 ring-[#FE005B] ring-offset-1' : 'text-gray-400 hover:bg-gray-200/60 hover:text-gray-600'}`}>
                <Mic size={20} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 transition-all">
                <Camera size={20} />
              </button>
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 transition-all">
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-100 shadow-xl rounded-xl p-2 flex gap-1 z-20 w-max slide-up-anim">
                    {['😀','🥰','😌','😭','😡','✨','🌱','🧘'].map(emoji => (
                      <button key={emoji} onClick={() => { setText(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-xl hover:bg-gray-100 p-2 rounded-lg transition-all">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="absolute bottom-6 right-5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-300">
              Journaling focus active <Sparkles size={12} />
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#78555e] mb-3">Quick tags</h3>
            <div className="flex flex-wrap gap-2">
              <span onClick={() => setText(t => t + " Feeling calm.")} className="cursor-pointer px-4 py-1.5 bg-[#aaf0b0] text-[#002109] text-xs font-bold rounded-full hover:shadow-md transition-all">Calm</span>
              <span onClick={() => setText(t => t + " Feeling anxious.")} className="cursor-pointer px-4 py-1.5 bg-[#ffd9e2] text-[#40000f] text-xs font-bold rounded-full hover:shadow-md transition-all">Anxious</span>
              <span onClick={() => setText(t => t + " Feeling inspired.")} className="cursor-pointer px-4 py-1.5 bg-[#ffd9e2] text-[#40000f] text-xs font-bold rounded-full hover:shadow-md transition-all">Inspired</span>
              <span onClick={() => setText(t => t + " Feeling grateful.")} className="cursor-pointer px-4 py-1.5 bg-gray-200/60 text-gray-600 text-xs font-bold rounded-full hover:shadow-md transition-all">Grateful</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <button onClick={onClose} className="text-[#FE005B] font-bold text-xs uppercase tracking-widest px-4 py-3 hover:bg-pink-50 rounded-full transition-all">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || (!text.trim() && !selectedFile)}
              className="bg-[#FE005B] text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#FE005B]/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              {isSaving ? "MindMate is reflecting..." : "Save Entry"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
