"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Edit3, Sparkles, CheckSquare, Users } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center pt-3 pb-8 z-50">
      <Link href="/journal" className="flex flex-col items-center justify-center cursor-pointer transition-all w-20 hover:scale-105 active:scale-95">
        <div className={`mb-1 relative ${pathname === '/journal' ? 'text-[#FE005B]' : 'text-gray-400'}`}>
          <Edit3 size={20} strokeWidth={2.5} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${pathname === '/journal' ? 'text-[#FE005B]' : 'text-gray-400'}`}>Journal</span>
      </Link>
      <Link href="/chat" className="flex flex-col items-center justify-center cursor-pointer transition-all w-20 hover:scale-105 active:scale-95">
        <div className={`mb-1 ${pathname === '/chat' ? 'text-[#FE005B]' : 'text-gray-400'}`}>
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${pathname === '/chat' ? 'text-[#FE005B]' : 'text-gray-400'}`}>AI</span>
      </Link>
      <Link href="/tasks" className="flex flex-col items-center justify-center cursor-pointer transition-all w-20 hover:scale-105 active:scale-95">
        <div className={`mb-1 ${pathname === '/tasks' ? 'text-[#FE005B]' : 'text-gray-400'}`}>
          <CheckSquare size={20} strokeWidth={2.5} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${pathname === '/tasks' ? 'text-[#FE005B]' : 'text-gray-400'}`}>Tasks</span>
      </Link>
      <Link href="#" className="flex flex-col items-center justify-center cursor-pointer transition-all w-20 hover:scale-105 active:scale-95 opacity-50">
        <div className={`mb-1 ${pathname === '/community' ? 'text-[#FE005B]' : 'text-gray-400'}`}>
          <Users size={20} strokeWidth={2.5} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${pathname === '/community' ? 'text-[#FE005B]' : 'text-gray-400'}`}>Community</span>
      </Link>
    </nav>
  );
}