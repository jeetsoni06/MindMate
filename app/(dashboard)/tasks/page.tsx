"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Clock, MoreVertical, PlusCircle, Plus, Check, Sparkles, Edit3, Lock } from "lucide-react";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [username, setUsername] = useState('');
  
  const latestMood = 'Slightly Stressed'; 

  const imageMap: Record<string, string> = {
    nature: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=600&h=400&fit=crop",
    stretch: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    focus: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop",
    water: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&h=400&fit=crop",
    journal: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=400&fit=crop",
    coffee: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&h=400&fit=crop",
    rest: "https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=600&h=400&fit=crop",
  };

  const getActiveToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("soul_link_id") || localStorage.getItem("soul_link_id");
  };

  useEffect(() => {
    const user = sessionStorage.getItem("soul_link_username") || localStorage.getItem("soul_link_username") || "";
    setUsername(user);
    fetchTasks();
    fetchRecommendations();
  }, []);

  const handleLockVault = () => {
    sessionStorage.removeItem("soul_link_id");
    sessionStorage.removeItem("soul_link_username");
    localStorage.removeItem("soul_link_id");
    router.replace("/auth");
  };

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const token = getActiveToken();
      if (!token) return;
      const res = await fetch('/api/tasks/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: token })
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch(err) {
       console.error("error fetching recs", err);
    } finally {
       setLoadingRecs(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = getActiveToken();
      if (!token) return;
      const res = await fetch(`/api/tasks?userId=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (task: any) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    try {
      const token = getActiveToken();
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, currentStatus: task.is_completed, userId: token })
      });
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: task.is_completed } : t));
    }
  };

  const handleAddRec = async (rec: any) => {
    setIsAdding(true);
    try {
      const token = getActiveToken();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: rec.title, subtitle: rec.subtitle, icon_name: rec.icon, userId: token })
      });
      const data = await res.json();
      if (data.task) setTasks(prev => [...prev, data.task]);
    } catch(err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddManualTask = async () => {
    if(!newTaskTitle.trim()) return;
    setIsAdding(true);
    try {
      const token = getActiveToken();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle, subtitle: '', icon_name: 'Check', userId: token })
      });
      const data = await res.json();
      if(data.task) {
        setTasks(prev => [...prev, data.task]);
        setNewTaskTitle('');
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="flex flex-col pt-4 px-6 max-w-2xl mx-auto overflow-y-auto scrollbar-hide pb-20">
      {/* Top Header */}
      <header className="flex justify-between items-center py-4 mb-4">
        <div className="flex items-center gap-2 text-[#FE005B] font-bold tracking-tight">
          <Sparkles size={20} className="text-[#FE005B]" />
          <span className="text-base uppercase tracking-wider">Mindmate</span>
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <span className="text-xs font-semibold text-gray-500 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              Vault: {username}
            </span>
          )}
          <button
            onClick={handleLockVault}
            title="Lock Sanctuary Vault"
            className="flex items-center gap-1.5 text-xs font-bold text-[#b42243] bg-white border border-[#b42243]/20 px-3 py-1.5 rounded-full hover:bg-pink-50 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Daily Focus */}
      <div className="flex justify-between items-end mb-4 mt-2">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-gray-400 uppercase mb-1">Current Focus</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">Daily Focus</h1>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-3xl font-bold text-[#FE005B] leading-none mb-1">{completionPercentage}%</span>
          <p className="text-[10px] font-medium text-gray-500">Completed</p>
        </div>
      </div>

      <div className="w-full h-2.5 bg-[#FE005B]/10 rounded-full mb-10 overflow-hidden flex">
        <div 
          className="h-full bg-[#FE005B] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Today's Rituals */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Today's Rituals</h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Personal
        </span>
      </div>

      <div className="space-y-3 mb-10">
        {tasks.map(task => (
           <div key={task.id} 
             onClick={() => handleToggle(task)}
             className="bg-white p-4 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex items-center gap-4 cursor-pointer hover:shadow-md transition-all border border-gray-50"
           >
              {/* Checkbox */}
              {task.is_completed ? (
                 <div className="w-[26px] h-[26px] shrink-0 rounded-full bg-[#EAF6ED] flex items-center justify-center">
                    <Check size={14} className="text-[#166534] stroke-[3]" />
                 </div>
              ) : (
                 <div className="w-[26px] h-[26px] shrink-0 rounded-full border-2 border-[#FE005B] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent border-[1.5px] border-[#FE005B]"></div>
                 </div>
              )}
              
              <div className="flex-1">
                 <h3 className={`text-sm font-bold ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</h3>
                 {task.subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5">{task.subtitle}</p>}
              </div>
              
              <div className="text-gray-300">
                {task.icon_name === 'Clock' ? <Clock size={16} /> : task.icon_name === 'Edit' ? <Edit3 size={16} /> : <MoreVertical size={16} />}
              </div>
           </div>
        ))}
        {tasks.length === 0 && (
           <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
             <p className="text-gray-500 font-medium text-sm">No rituals setup yet.<br/>Add a recommendation below!</p>
           </div>
        )}
      </div>

      {/* Manual Input under tasks */}
      <div className="flex gap-2 items-center mb-10 bg-white p-2 pl-5 rounded-[1.25rem] shadow-sm border border-gray-100">
        <input 
          type="text" 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="+ Add a custom ritual..."
          className="flex-1 bg-transparent text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddManualTask()}
        />
        <button 
          onClick={handleAddManualTask}
          disabled={isAdding || !newTaskTitle.trim()}
          className="bg-[#FE005B] text-white w-9 h-9 rounded-[1rem] shrink-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      {/* AI Recommended */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 uppercase tracking-widest text-[#FE005B] font-bold text-[10px] mb-2">
           <Sparkles size={12} /> Personalized
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">AI Recommended for You</h2>
        <p className="text-xs text-gray-500 font-medium">Based on your mood check-in: <span className="text-[#FE005B] italic">"{latestMood}"</span></p>
      </div>

      <div className="space-y-4 pb-10">
        {loadingRecs ? (
          <>
            <div className="w-full h-[220px] rounded-[2rem] bg-gray-100 animate-pulse border border-gray-50 flex items-center justify-center">
               <Sparkles className="text-gray-300" size={32} />
            </div>
            <div className="w-full h-[220px] rounded-[2rem] bg-gray-100 animate-pulse delay-150 border border-gray-50 flex items-center justify-center">
               <Sparkles className="text-gray-300" size={32} />
            </div>
          </>
        ) : (
          recommendations.map((rec, i) => (
             <div key={i} className="relative w-full h-[220px] rounded-[2rem] overflow-hidden shadow-sm group">
                <img src={imageMap[rec.imageKeyword] || imageMap.nature} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={rec.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                
                <div className="absolute bottom-6 left-6 right-6">
                   <div className="bg-white/20 backdrop-blur-md w-fit px-2 py-1 rounded text-[9px] font-extrabold text-white uppercase tracking-wider mb-2">
                      {rec.tag}
                   </div>
                   <h3 className="text-white font-bold text-lg leading-tight mb-1">{rec.title}</h3>
                   <p className="text-white/80 text-xs font-medium mb-3">{rec.subtitle}</p>
                   
                   <button 
                     onClick={() => handleAddRec(rec)}
                     disabled={isAdding}
                     className="text-[#FE005B] font-bold text-[11px] flex items-center gap-1 hover:text-pink-400 transition-colors"
                   >
                      Add to Tasks <PlusCircle size={12} />
                   </button>
                </div>
             </div>
          ))
        )}
      </div>

    </div>
  );
}
