"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getChatMessages } from "@/lib/supabase";
import { Sparkles, Send, LogOut, Mic, MicOff, Volume2, VolumeX, Camera, Image as ImageIcon, X, RefreshCw } from "lucide-react";

interface Message {
  role: string;
  content: string;
  image?: string;
  suggestions?: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);

  // Live Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const getActiveToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("soul_link_id") || localStorage.getItem("soul_link_id");
  };

  useEffect(() => {
    const user = sessionStorage.getItem("soul_link_username") || localStorage.getItem("soul_link_username") || "";
    setUsername(user);

    async function fetchHistory() {
      const token = getActiveToken();
      if (!token) return;
      const history = await getChatMessages(token);
      if (history && history.length > 0) {
        setMessages(history.map((msg: any) => ({ role: msg.role, content: msg.content })));
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Hi! I am MindMate. How are you feeling today? I am here to listen.',
          suggestions: [] 
        }]);
      }
    }
    fetchHistory();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== "undefined" && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, selectedImage]);

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen, cameraStream]);

  const handleLockVault = () => {
    closeLiveCamera();
    if (recognitionRef.current) recognitionRef.current.stop();
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    sessionStorage.removeItem("soul_link_id");
    sessionStorage.removeItem("soul_link_username");
    localStorage.removeItem("soul_link_id");
    router.replace("/auth");
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Live Camera Controls
  const openLiveCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to file picker if browser doesn't support live webcam API
      cameraInputRef.current?.click();
      return;
    }

    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("Could not access live camera device:", err);
      setIsCameraOpen(false);
      // Fallback to file input if user denies or lacks webcam
      cameraInputRef.current?.click();
    }
  };

  const closeLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhotoSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
      }
    }
    closeLiveCamera();
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    openLiveCamera(nextFacing);
  };

  // Voice Recording
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      const baselineText = input;

      recognition.onresult = (event: any) => {
        let sessionTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }
        setInput((baselineText ? baselineText + " " : "") + sessionTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Speech Recognition initialization error:", err);
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      startRecording();
    }
  };

  // Text to Speech
  const toggleSpeak = (text: string, index: number) => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (playingMessageIndex === index) {
      window.speechSynthesis.cancel();
      setPlayingMessageIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    if (hasGujarati) {
      utterance.lang = 'gu-IN';
    } else if (hasHindi) {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setPlayingMessageIndex(null);
    utterance.onerror = () => setPlayingMessageIndex(null);

    setPlayingMessageIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (forcedUserMessage?: string) => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const userMsg = forcedUserMessage || input.trim();
    const imageToSend = selectedImage;

    if (!userMsg && !imageToSend) return;
    
    // Clear preview immediately
    setSelectedImage(null);
    if (!forcedUserMessage) setInput('');

    // Clear suggestions from the previous assistant message
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages[newMessages.length - 1].suggestions = undefined;
      }
      return [...newMessages, { 
        role: 'user', 
        content: userMsg, 
        image: imageToSend || undefined 
      }];
    });
    
    setLoading(true);

    try {
      const token = getActiveToken();
      const conversationHistory = messages.filter((m, idx) => {
        if (idx === 0 && m.role === 'assistant' && m.content.startsWith('Hi! I am MindMate')) {
          return false;
        }
        return true;
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          image: imageToSend,
          history: conversationHistory, 
          userId: token 
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply,
          suggestions: data.suggestions
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseMessageDisplay = (content: string, image?: string) => {
    let displayImg = image;
    let displayText = content;

    if (!displayImg && typeof displayText === 'string' && displayText.startsWith('[IMAGE:')) {
      const endIdx = displayText.indexOf(']');
      if (endIdx !== -1) {
        displayImg = displayText.substring(7, endIdx);
        displayText = displayText.substring(endIdx + 1).trim();
      }
    }

    return { displayImg, displayText };
  };

  const getDayTime = () => {
    const d = new Date();
    return `TODAY • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#FDF8F9] font-['Plus_Jakarta_Sans'] pb-6">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white/70 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FE005B] flex items-center justify-center text-white shadow-md shadow-[#FE005B]/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">MindMate</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLockVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 text-xs font-semibold shadow-sm transition-all"
            title="Back to Login"
          >
            <LogOut size={13} />
            Back to Login
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-36 max-w-2xl mx-auto w-full">
        <div className="text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
            {getDayTime()}
          </span>
        </div>

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isPlaying = playingMessageIndex === idx;
          const { displayImg, displayText } = parseMessageDisplay(m.content, m.image);

          return (
            <div key={idx} className="flex flex-col">
              <div className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className="shrink-0 mt-1">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-full bg-[#FE005B]/10 text-[#FE005B] font-bold text-xs flex items-center justify-center">
                      ME
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FE005B] flex items-center justify-center text-white shadow-sm">
                      <Sparkles size={16} />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed overflow-hidden ${
                    isUser
                      ? 'bg-[#FE005B] text-white rounded-tr-sm shadow-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {displayImg && (
                    <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-black/10 shadow-sm">
                      <img src={displayImg} alt="Shared memory" className="w-full max-h-72 object-cover rounded-2xl" />
                    </div>
                  )}
                  {displayText && <div className="break-words [overflow-wrap:anywhere]">{displayText}</div>}
                </div>
              </div>

              {/* Voice playback option for AI messages */}
              {!isUser && (
                <div className="flex items-center gap-2 mt-1.5 ml-11">
                  <button
                    onClick={() => toggleSpeak(displayText, idx)}
                    className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                      isPlaying
                        ? 'bg-pink-100 text-[#FE005B]'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={isPlaying ? "Stop audio" : "Listen aloud"}
                  >
                    {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isPlaying ? 'Stop' : 'Listen'}</span>
                  </button>
                </div>
              )}

              {/* Suggestions (only under assistant messages) */}
              {!isUser && m.suggestions && m.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-11">
                  {m.suggestions.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSend(s)}
                      className="text-xs bg-white border border-[#FE005B]/30 text-[#FE005B] hover:bg-pink-50 px-3.5 py-1.5 rounded-full font-semibold transition-all shadow-sm active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FE005B] flex items-center justify-center text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="bg-white p-4 rounded-3xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl overflow-hidden max-w-md w-full relative shadow-2xl border border-white/10 flex flex-col items-center slide-up-anim">
            {/* Camera Header */}
            <div className="w-full flex items-center justify-between p-4 bg-black/40 text-white z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
                <Camera size={16} className="text-[#FE005B]" /> Live Camera
              </span>
              <button
                type="button"
                onClick={closeLiveCamera}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                title="Close Camera"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Camera Controls */}
            <div className="w-full py-5 px-6 flex items-center justify-around bg-black/70">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
                title="Switch Camera (Front / Rear)"
              >
                <RefreshCw size={20} />
              </button>

              {/* Shutter Capture Button */}
              <button
                type="button"
                onClick={capturePhotoSnapshot}
                className="w-16 h-16 rounded-full border-4 border-white bg-[#FE005B] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FE005B]/40 flex items-center justify-center cursor-pointer"
                title="Snap Photo"
              >
                <div className="w-6 h-6 rounded-full bg-white/40" />
              </button>

              <div className="w-11" />
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 max-w-2xl mx-auto px-6 z-30">
        {/* Hidden File Fallback Inputs */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          className="hidden"
          onChange={handleImageFile}
        />
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          className="hidden"
          onChange={handleImageFile}
        />

        {/* Selected Image Preview Pill */}
        {selectedImage && (
          <div className="relative inline-flex items-center mb-2.5 ml-3 bg-white p-1.5 pr-3 rounded-2xl shadow-md border border-gray-100 slide-up-anim">
            <img src={selectedImage} alt="Selected preview" className="w-12 h-12 object-cover rounded-xl border border-gray-200" />
            <span className="text-xs font-semibold text-gray-600 ml-2.5">Photo attached</span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="ml-3 bg-gray-100 hover:bg-gray-200 text-gray-500 p-1 rounded-full transition-all"
              title="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className={`flex items-center gap-1.5 bg-white p-2 rounded-full shadow-lg border transition-all ${
            isRecording ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100'
          }`}
        >
          {/* Live Camera Button */}
          <button
            type="button"
            onClick={() => openLiveCamera()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FE005B] hover:bg-pink-50 transition-all"
            title="Open Camera Viewfinder"
          >
            <Camera size={18} />
          </button>

          {/* Gallery Button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FE005B] hover:bg-pink-50 transition-all"
            title="Upload from Gallery / Files"
          >
            <ImageIcon size={18} />
          </button>

          {/* Voice Input Mic Toggle */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30 ring-2 ring-red-200'
                : 'text-gray-400 hover:text-[#FE005B] hover:bg-pink-50'
            }`}
            title={isRecording ? "Listening... click to stop" : "Speak with voice"}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isRecording
                ? "Listening... speak now"
                : selectedImage
                ? "Add a caption or send photo..."
                : "Message, speak, or share a photo..."
            }
            className="flex-1 bg-transparent px-2 py-2 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || loading}
            className="w-10 h-10 rounded-full bg-[#FE005B] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#FE005B]/20 shrink-0"
            title="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
