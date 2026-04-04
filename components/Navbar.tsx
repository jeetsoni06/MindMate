import { Settings } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f8faf8]/80 backdrop-blur-2xl flex justify-between items-center w-full px-6 py-4">

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden">
                    <img src="https://lh3.googleusercontent.com/aida-public/..." className="w-full h-full object-cover" />
                </div>
                <h1 className="text-[#b42243] font-extrabold text-xl">
                    Mindful Space
                </h1>
            </div>

            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-200 transition-colors text-stone-600">
                <Settings size={22} />
            </button>

        </nav>
    );
}