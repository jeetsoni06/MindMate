import Link from "next/link";
import { Sparkles, Edit3, MessageCircleHeart, Flame, Star, Compass } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-[#f8faf8] text-[#191c1b] min-h-screen selection:bg-[#ffdadc] selection:text-[#40000f] font-['Plus_Jakarta_Sans'] pb-20">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8faf8]/80 backdrop-blur-xl border-b border-[#e1e3e1]/50">
        <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tight text-[#b42243] flex items-center gap-2">
            <Sparkles size={24} />
            MindMate
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-[#594042] hover:bg-[#ffdadc]/50 transition-all px-4 py-2 rounded-full text-sm font-bold tracking-wide" href="#how-it-works">How It Works</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="bg-[#b42243] text-white px-7 py-2.5 rounded-full font-bold shadow-md shadow-[#b42243]/20 hover:bg-[#9a1a36] hover:scale-105 active:scale-95 transition-all text-sm md:text-base">Sign In</Link>
          </div>
        </nav>
      </header>
      
      <main className="overflow-x-hidden pt-32 px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center">
          <div className="absolute top-1/4 -left-12 w-64 h-64 bg-[#ff5c77]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-12 w-96 h-96 bg-[#aaf0b0]/15 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto space-y-8 relative z-10 pt-10">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#b42243] font-bold bg-[#ffdadc] px-5 py-2 rounded-full">YOUR JOURNAL</span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-[#191c1b]">
              Your Safe Space to <br/>
              <span className="text-[#b42243] italic">Reflect</span>, Relax, and Reconnect
            </h1>
            <p className="text-xl md:text-xl text-[#594042] max-w-2xl mx-auto leading-relaxed font-medium">
              Journal your thoughts, talk to your AI friend, and build a mindful routine that grows with you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10 p-5">
              <Link href="/auth" className="bg-[#b42243] hover:bg-[#ff5c77] text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-[#b42243]/20">
                Get Started
              </Link>
              <Link href="/auth" className="bg-white/50 backdrop-blur-md border border-[#e1bec0]/50 text-[#191c1b] px-10 py-4 rounded-full text-lg font-bold hover:bg-white transition-all shadow-sm">
                Try AI Friend
              </Link>
            </div>
          </div>
          
          <div className="mt-20 w-full max-w-6xl mx-auto px-4 pb-20">
            <div className="relative group rounded-3xl overflow-hidden border-8 border-[#f2f4f2] shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#b42243]/10 to-[#296b38]/10 blur-xl z-10 group-hover:opacity-0 transition duration-1000"></div>
              <img alt="Peaceful interior" className="w-full aspect-video md:aspect-[21/9] object-cover relative transform group-hover:scale-105 transition duration-1000" src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2000&auto=format&fit=crop" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Mindful Tools for Every Moment</h2>
              <p className="text-lg text-[#594042] font-medium leading-relaxed">Designed to be gentle, supportive, and completely private. Explore features that help you find your center.</p>
            </div>
            <div className="hidden md:block">
              <Compass size={64} className="text-[#ffb2b9]" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#f2f4f2] rounded-3xl p-10 hover:bg-[#ffdadc]/40 transition-colors group cursor-pointer border border-[#e1e3e1]/50">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <Edit3 size={40} className="text-[#b42243] mb-6" />
                  <h3 className="text-3xl font-bold mb-4 text-[#191c1b]">Smart Journaling</h3>
                  <p className="text-lg text-[#594042] font-medium max-w-md leading-relaxed">Write freely and track your thoughts in a private, secure space. Our intelligent prompts help you dive deeper when you're feeling stuck.</p>
                </div>
                <div className="mt-12 overflow-hidden rounded-2xl">
                  <img alt="Journaling" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1200" />
                </div>
              </div>
            </div>
            
            <div className="bg-[#aaf0b0]/20 rounded-3xl p-10 hover:bg-[#aaf0b0]/40 transition-colors group cursor-pointer border border-[#aaf0b0]/30 shadow-sm">
              <div className="flex flex-col h-full items-center text-center">
                <MessageCircleHeart size={48} className="text-[#296b38] mb-6" />
                <h3 className="text-2xl font-bold mb-4 text-[#191c1b]">AI Friend</h3>
                <p className="text-[#594042] font-medium leading-relaxed">Talk to a compassionate AI that listens without judgment, providing instant relief.</p>
                <div className="mt-auto pt-10">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform shadow-[#002109]/5">
                    <Sparkles className="text-[#296b38]" size={36} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#ffd9e2]/60 rounded-3xl p-10 hover:bg-[#ffd9e2] transition-colors group cursor-pointer">
              <div className="flex flex-col h-full">
                <Flame size={40} className="text-[#78555e] mb-6" />
                <h3 className="text-2xl font-bold mb-4 text-[#191c1b]">Daily Streak</h3>
                <p className="text-[#594042] font-medium leading-relaxed">Stay consistent and build healthy mental habits. Small daily steps lead to lasting peace.</p>
                <div className="mt-auto bg-white/60 rounded-2xl p-6 backdrop-blur-sm border border-white mt-8">
                  <div className="flex gap-2 justify-between items-end h-16">
                    {[100, 80, 100, 50, 100, 90, 100].map((h, i) => (
                      <div key={i} className="w-4 bg-[#78555e] rounded-full opacity-80" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 bg-[#e6e9e7] rounded-3xl p-10 hover:bg-[#e1e3e1] transition-colors flex flex-col md:flex-row gap-10 cursor-pointer">
              <div className="flex-1">
                <Star size={40} className="text-[#b42243] mb-6" />
                <h3 className="text-3xl font-bold mb-4 text-[#191c1b]">Favorites & Insights</h3>
                <p className="text-lg text-[#594042] font-medium leading-relaxed">Save meaningful entries and reflect on your journey. See patterns in your mood over time.</p>
              </div>
              <div className="flex-1 relative rounded-2xl overflow-hidden min-h-[160px]">
                <img alt="Mindful reflection" className="absolute inset-0 h-full object-cover w-full opacity-90 group-hover:scale-105 transition-transform duration-500" src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 overflow-hidden">
          <div className="max-w-5xl mx-auto bg-[#b42243] rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-[#b42243]/20 flex flex-col items-center justify-center min-h-[360px]">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={200} className="text-white" />
            </div>
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Create Your Daily Journal
              </h2>
              <p className="text-[#ffdadc]/90 text-xl sm:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
                Over thinking? start writing your thoughts in your own way here
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-12 border-t border-[#e1e3e1]/40 mt-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="font-extrabold text-[#b42243] text-2xl mb-1 tracking-tight">MindMate</span>
            <p className="text-[#8d7072] text-sm font-medium tracking-wide">Made for mental wellness</p>
          </div>
          <div className="flex gap-8">
            <a className="text-[#594042] hover:text-[#b42243] text-sm font-bold tracking-wide transition-all uppercase" href="#">Privacy</a>
            <a className="text-[#594042] hover:text-[#b42243] text-sm font-bold tracking-wide transition-all uppercase" href="#">Terms</a>
            <a className="text-[#594042] hover:text-[#b42243] text-sm font-bold tracking-wide transition-all uppercase" href="#">Contact</a>
          </div>
          <div className="text-[#8d7072] text-xs font-bold tracking-widest uppercase">
             © 2026 MindMate. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
