"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit3, 
  Search, 
  RefreshCw, 
  Lock, 
  ExternalLink,
  AlertTriangle,
  X,
  Save,
  Check,
  Users,
  UserX,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Hourglass,
  BookOpen,
  LineChart,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface StoryItem {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorIcon: string;
  category: string;
  originalCategory?: string;
  isApproved: boolean;
  createdAt?: string;
  timeAgo?: string;
}

interface DailyUsagePoint {
  date: string;
  label: string;
  minutes: number;
  seconds: number;
}

interface UserItem {
  id: string;
  username: string;
  createdAt: string;
  dateJoinedFormatted: string;
  isBlocked: boolean;
  isRealtimeActive: boolean;
  lastActiveText: string;
  timeSpentSeconds: number;
  formattedTimeSpent: string;
  dailyUsage: DailyUsagePoint[];
}

type SortField = 'username' | 'createdAt' | 'timeSpentSeconds';
type SortOrder = 'asc' | 'desc';

export default function AdminPage() {
  // Admin auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Main Section: 'stories' | 'users'
  const [mainSection, setMainSection] = useState<'stories' | 'users'>('stories');

  // Story management state
  const [activeStoryTab, setActiveStoryTab] = useState<'pending' | 'approved'>('pending');
  const [pendingStories, setPendingStories] = useState<StoryItem[]>([]);
  const [approvedStories, setApprovedStories] = useState<StoryItem[]>([]);
  const [storyCounts, setStoryCounts] = useState({ pending: 0, approved: 0, total: 0 });
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storySearchQuery, setStorySearchQuery] = useState('');

  // User management state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userCounts, setUserCounts] = useState({ total: 0, activeNow: 0, blocked: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('timeSpentSeconds');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // Default least to most as requested

  // Toast / feedback message
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Story Edit Modal state
  const [editingStory, setEditingStory] = useState<StoryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [isApproveOnSave, setIsApproveOnSave] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Story Delete confirmation modal
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  // User Action Confirmation Modal (Block / Unblock / Delete)
  const [userConfirmModal, setUserConfirmModal] = useState<{
    type: 'block' | 'unblock' | 'delete';
    user: UserItem;
  } | null>(null);
  const [processingUserAction, setProcessingUserAction] = useState(false);

  // Time Graph Modal state
  const [graphUser, setGraphUser] = useState<UserItem | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('mindmate_admin_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
      fetchStories();
      fetchUsers();
    }
  }, []);

  // Poll realtime user activity every 15s when viewing admin panel
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim().toLowerCase();
    if (clean === 'admin' || clean === 'mindmate@admin' || clean === 'mindmate') {
      setIsAuthenticated(true);
      sessionStorage.setItem('mindmate_admin_auth', 'true');
      setAuthError('');
      fetchStories();
      fetchUsers();
    } else {
      setAuthError('Incorrect admin passcode. Try "admin" or "mindmate@admin".');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mindmate_admin_auth');
  };

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(''), 3500);
  };

  // -------------------------------------------------------------
  // STORIES DATA & ACTIONS
  // -------------------------------------------------------------
  const fetchStories = async () => {
    try {
      setStoriesLoading(true);
      const res = await fetch('/api/admin/stories');
      const data = await res.json();
      if (data.pending) setPendingStories(data.pending);
      if (data.approved) setApprovedStories(data.approved);
      if (data.counts) setStoryCounts(data.counts);
    } catch (err) {
      console.error("Failed to load stories", err);
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleQuickApprove = async (story: StoryItem) => {
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: story.id,
          action: 'approve',
          title: story.title,
          content: story.content,
          category: story.category === 'pending_review' ? 'general' : story.category
        })
      });

      if (res.ok) {
        triggerToast(`"${story.title}" has been approved and is now live on the community feed!`);
        await fetchStories();
      }
    } catch (err) {
      console.error("Error approving story", err);
    }
  };

  const openEditStoryModal = (story: StoryItem, approveOnSave: boolean = false) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditContent(story.content);
    setEditCategory(story.category === 'pending_review' ? 'general' : (story.category || 'general'));
    setIsApproveOnSave(approveOnSave);
  };

  const handleSaveStoryEdit = async () => {
    if (!editingStory) return;
    setSavingEdit(true);

    try {
      const res = await fetch('/api/admin/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStory.id,
          action: isApproveOnSave ? 'approve' : 'edit',
          title: editTitle,
          content: editContent,
          category: editCategory
        })
      });

      if (res.ok) {
        triggerToast(
          isApproveOnSave 
            ? 'Story edited & approved! It is now live on the community page.'
            : 'Story updated successfully!'
        );
        setEditingStory(null);
        await fetchStories();
      }
    } catch (err) {
      console.error("Failed to save story edit", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/stories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast('Story permanently removed from the community feed.');
        setDeletingStoryId(null);
        await fetchStories();
      }
    } catch (err) {
      console.error("Failed to delete story", err);
    }
  };

  // -------------------------------------------------------------
  // USERS DATA & ACTIONS
  // -------------------------------------------------------------
  const fetchUsers = async (showLoading: boolean = true) => {
    try {
      if (showLoading) setUsersLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.counts) setUserCounts(data.counts);
      // Update graphUser reference if currently opened
      if (graphUser) {
        const updated = (data.users || []).find((u: UserItem) => u.id === graphUser.id);
        if (updated) setGraphUser(updated);
      }
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      if (showLoading) setUsersLoading(false);
    }
  };

  const handleExecuteUserAction = async () => {
    if (!userConfirmModal) return;
    const { type, user } = userConfirmModal;
    setProcessingUserAction(true);

    try {
      if (type === 'block' || type === 'unblock') {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            action: type
          })
        });

        if (res.ok) {
          triggerToast(
            type === 'block'
              ? `User "${user.username}" has been blocked from accessing the application.`
              : `User "${user.username}" has been unblocked.`
          );
          setUserConfirmModal(null);
          await fetchUsers();
        }
      } else if (type === 'delete') {
        const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          triggerToast(`User "${user.username}" was permanently deleted.`);
          setUserConfirmModal(null);
          if (graphUser?.id === user.id) setGraphUser(null);
          await fetchUsers();
        }
      }
    } catch (err) {
      console.error("Error executing user action", err);
    } finally {
      setProcessingUserAction(false);
    }
  };

  // Sort toggle helper
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // For time spent, default to ascending (least to most as requested)
      setSortOrder(field === 'timeSpentSeconds' ? 'asc' : 'asc');
    }
  };

  // Sort and filter users
  const sortedAndFilteredUsers = [...users]
    .filter(u => {
      const q = userSearchQuery.toLowerCase();
      return u.username.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'username') {
        comparison = a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
      } else if (sortField === 'createdAt') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'timeSpentSeconds') {
        comparison = a.timeSpentSeconds - b.timeSpentSeconds;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Filter stories
  const currentStoryList = activeStoryTab === 'pending' ? pendingStories : approvedStories;
  const filteredStories = currentStoryList.filter(s => {
    const q = storySearchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || 
           s.content.toLowerCase().includes(q) || 
           s.authorName.toLowerCase().includes(q) ||
           s.category.toLowerCase().includes(q);
  });

  // -------------------------------------------------------------
  // SHARE-MARKET STYLE LINE CHART GENERATOR
  // -------------------------------------------------------------
  const renderStockMarketChart = (dataPoints: DailyUsagePoint[]) => {
    const width = 520;
    const height = 200;
    const paddingX = 40;
    const paddingTop = 25;
    const paddingBottom = 35;

    const values = dataPoints.map(p => p.minutes);
    const maxVal = Math.max(10, Math.ceil(Math.max(...values) * 1.25));
    const minVal = 0;

    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingTop - paddingBottom;

    // Calculate (x, y) coordinates for each point
    const points = dataPoints.map((p, index) => {
      const x = paddingX + (index / (dataPoints.length - 1)) * plotWidth;
      const normalizedY = (p.minutes - minVal) / (maxVal - minVal);
      const y = paddingTop + (1 - normalizedY) * plotHeight;
      return { x, y, minutes: p.minutes, label: p.label, seconds: p.seconds };
    });

    // Create smooth SVG path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Closed path for gradient fill underneath (Share market style area)
    const lastP = points[points.length - 1];
    const firstP = points[0];
    const fillD = `${pathD} L ${lastP.x} ${height - paddingBottom} L ${firstP.x} ${height - paddingBottom} Z`;

    // Horizontal grid line values
    const gridLines = [0, Math.round(maxVal / 2), maxVal];

    return (
      <div className="relative w-full overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Share Market Green/Cyan Glow Gradient Area */}
            <linearGradient id="marketAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            {/* Glowing stroke filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Dotted horizontal grid lines */}
          {gridLines.map((val, idx) => {
            const y = paddingTop + (1 - (val - minVal) / (maxVal - minVal)) * plotHeight;
            return (
              <g key={idx}>
                <line 
                  x1={paddingX} 
                  y1={y} 
                  x2={width - paddingX} 
                  y2={y} 
                  stroke="#e5e7eb" 
                  strokeDasharray="4 4" 
                  strokeWidth="1" 
                />
                <text 
                  x={paddingX - 8} 
                  y={y + 3} 
                  fill="#9ca3af" 
                  fontSize="10" 
                  textAnchor="end" 
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {val}m
                </text>
              </g>
            );
          })}

          {/* Area under the line (stock-market filled chart) */}
          <path d={fillD} fill="url(#marketAreaGradient)" />

          {/* Share Market Line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Interactive Data Dots & Hover Crosshairs */}
          {points.map((pt, idx) => {
            const isHovered = hoveredPointIndex === idx;
            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                className="cursor-pointer"
              >
                {/* Vertical hover crosshair line */}
                {isHovered && (
                  <line 
                    x1={pt.x} 
                    y1={paddingTop} 
                    x2={pt.x} 
                    y2={height - paddingBottom} 
                    stroke="#10b981" 
                    strokeDasharray="2 2" 
                    strokeWidth="1" 
                  />
                )}

                {/* Outer halo */}
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={isHovered ? 7 : 4} 
                  fill="#ffffff" 
                  stroke="#10b981" 
                  strokeWidth={isHovered ? "3" : "2"}
                  className="transition-all duration-150"
                />

                {/* X-axis date labels */}
                <text 
                  x={pt.x} 
                  y={height - paddingBottom + 16} 
                  fill={isHovered ? "#111827" : "#6b7280"} 
                  fontSize="10" 
                  textAnchor="middle" 
                  fontWeight={isHovered ? "bold" : "500"}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Hover Tooltip Card */}
        {hoveredPointIndex !== null && points[hoveredPointIndex] && (
          <div 
            className="absolute bg-gray-900 text-white text-xs py-1.5 px-3 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all"
            style={{ 
              left: `${(points[hoveredPointIndex].x / width) * 100}%`,
              top: `${(points[hoveredPointIndex].y / height) * 100 - 6}%` 
            }}
          >
            <p className="font-extrabold text-emerald-400 flex items-center gap-1">
              <Zap size={11} /> {points[hoveredPointIndex].minutes} mins
            </p>
            <p className="text-[10px] text-gray-300 font-medium">
              {points[hoveredPointIndex].label}
            </p>
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FDF8F9] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="bg-white max-w-md w-full rounded-[32px] p-8 shadow-xl border border-pink-100 text-center">
          <div className="w-16 h-16 bg-[#b42243]/10 text-[#b42243] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <ShieldCheck size={36} />
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
            MindMate Admin Panel
          </h1>
          <p className="text-sm text-gray-500 font-medium mb-6">
            Enter admin passcode to moderate stories and view realtime user activity.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Passcode (e.g. admin)"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b42243]/20 focus:border-[#b42243]/40 text-gray-800 font-medium placeholder-gray-400 text-center"
                  autoFocus
                  required
                />
                <Lock size={18} className="absolute left-4 top-4 text-gray-400" />
              </div>
              {authError && (
                <p className="text-xs text-red-500 font-semibold mt-2">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#b42243] hover:bg-[#9a1a36] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#b42243]/20 transition-all cursor-pointer active:scale-95"
            >
              Access Admin Panel
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Passcode: <strong className="text-gray-600">admin</strong></span>
            <Link href="/community" className="text-[#b42243] hover:underline flex items-center gap-1">
              Public Feed <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FDF8F9] px-6 py-10 font-['Plus_Jakarta_Sans']">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#b42243]/10 text-[#b42243] text-xs font-extrabold uppercase rounded-full tracking-wider">
                Admin Control Room
              </span>
              <span className="text-xs text-gray-400 font-medium">MindMate Operations</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              {mainSection === 'stories' ? 'Community Stories Moderation' : 'Realtime Users & Analytics'}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {mainSection === 'stories'
                ? 'Review user-submitted stories before publishing, or edit and delete existing stories.'
                : 'Monitor realtime online users, lifetime usage time, and share-market style activity graphs.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/community"
              target="_blank"
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              Public Feed <ExternalLink size={14} />
            </Link>
            <button
              onClick={() => {
                fetchStories();
                fetchUsers();
              }}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw size={16} className={(storiesLoading || usersLoading) ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Lock Panel
            </button>
          </div>
        </header>

        {/* Global Toast Notification */}
        {actionSuccessMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-sm animate-in fade-in">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Top-Level Section Switcher Tabs: Stories vs Users */}
        <div className="flex items-center gap-3 p-1.5 bg-white rounded-2xl border border-gray-200 w-fit mb-8 shadow-sm">
          <button
            onClick={() => setMainSection('stories')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              mainSection === 'stories'
                ? 'bg-[#b42243] text-white shadow-md shadow-[#b42243]/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={16} />
            Community Stories ({storyCounts.pending} Pending)
          </button>

          <button
            onClick={() => setMainSection('users')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              mainSection === 'users'
                ? 'bg-[#b42243] text-white shadow-md shadow-[#b42243]/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            User Management ({userCounts.total} Users)
          </button>
        </div>

        {/* ========================================================= */}
        {/* SECTION 1: USER MANAGEMENT & REALTIME ACTIVITY            */}
        {/* ========================================================= */}
        {mainSection === 'users' && (
          <div className="space-y-6">
            
            {/* User Metric Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Registered</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{userCounts.total}</h3>
                  <p className="text-xs text-gray-500 mt-1">Sanctuary Vault accounts</p>
                </div>
                <div className="w-12 h-12 bg-pink-50 text-[#b42243] rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Online Right Now
                  </p>
                  <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{userCounts.activeNow}</h3>
                  <p className="text-xs text-gray-500 mt-1">Realtime active users</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Activity size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suspended Accounts</p>
                  <h3 className="text-3xl font-extrabold text-red-600 mt-1">{userCounts.blocked}</h3>
                  <p className="text-xs text-gray-500 mt-1">Blocked by admin</p>
                </div>
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                  <UserX size={24} />
                </div>
              </div>
            </div>

            {/* Note about counting starting at 8:30 PM */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center gap-3 text-xs text-amber-800 font-medium">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Lifetime Time Spent:</strong> Reset to 0. Lifetime time tracking officially begins counting today from <strong>8:30 PM IST (Nov 14, 2026)</strong> based on live user heartbeat sessions.
              </span>
            </div>

            {/* User Controls: Search & Sorting Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user by username or ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#b42243]/20 focus:border-[#b42243]/40"
                />
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              </div>

              {/* Sorting Controls Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Sort by:</span>

                {/* Alphabetical Sort */}
                <button
                  onClick={() => handleSortToggle('username')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortField === 'username'
                      ? 'bg-[#b42243]/10 text-[#b42243] border-[#b42243]/30'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Sort Alphabetically A-Z or Z-A"
                >
                  <span>Alphabetical</span>
                  {sortField === 'username' ? (
                    sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} className="text-gray-400" />
                  )}
                </button>

                {/* Date Joined Sort */}
                <button
                  onClick={() => handleSortToggle('createdAt')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortField === 'createdAt'
                      ? 'bg-[#b42243]/10 text-[#b42243] border-[#b42243]/30'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Sort by Date Joined"
                >
                  <Calendar size={13} />
                  <span>Date Joined</span>
                  {sortField === 'createdAt' ? (
                    sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} className="text-gray-400" />
                  )}
                </button>

                {/* Time Spent on App Sort (Least to Most) */}
                <button
                  onClick={() => handleSortToggle('timeSpentSeconds')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortField === 'timeSpentSeconds'
                      ? 'bg-[#b42243] text-white border-[#b42243] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Sort by Time Spent: Least to Most"
                >
                  <Hourglass size={13} />
                  <span>Time Spent {sortField === 'timeSpentSeconds' && (sortOrder === 'asc' ? '(Least → Most)' : '(Most → Least)')}</span>
                  {sortField === 'timeSpentSeconds' ? (
                    sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} className="text-gray-400" />
                  )}
                </button>
              </div>

            </div>

            {/* Table Format for Users */}
            {usersLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <RefreshCw size={28} className="animate-spin text-[#b42243] mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading user accounts...</p>
              </div>
            ) : sortedAndFilteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                <Users size={32} className="text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-800">No Users Found</h3>
                <p className="text-xs text-gray-400 mt-1">No registered users matched your search criteria.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">
                        <th className="py-4 px-6">
                          <button
                            onClick={() => handleSortToggle('username')}
                            className="flex items-center gap-1.5 hover:text-gray-900 cursor-pointer"
                          >
                            Username
                            {sortField === 'username' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        </th>
                        <th className="py-4 px-6">Realtime Activity</th>
                        <th className="py-4 px-6">
                          <button
                            onClick={() => handleSortToggle('createdAt')}
                            className="flex items-center gap-1.5 hover:text-gray-900 cursor-pointer"
                          >
                            Date Joined
                            {sortField === 'createdAt' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        </th>
                        <th className="py-4 px-6">
                          <button
                            onClick={() => handleSortToggle('timeSpentSeconds')}
                            className="flex items-center gap-1.5 hover:text-gray-900 cursor-pointer"
                          >
                            Time Spent (from 8:30 PM)
                            {sortField === 'timeSpentSeconds' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        </th>
                        <th className="py-4 px-6">Usage Graph</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {sortedAndFilteredUsers.map((user) => (
                        <tr 
                          key={user.id}
                          className="hover:bg-gray-50/60 transition-colors"
                        >
                          {/* Username */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 text-[#b42243] font-extrabold flex items-center justify-center text-sm shadow-sm border border-pink-100">
                                {user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-900 tracking-tight leading-tight">
                                  {user.username}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  {user.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Realtime Activity Status */}
                          <td className="py-4 px-6">
                            {user.isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Blocked
                              </span>
                            ) : user.isRealtimeActive ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-pulse">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                Active Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                {user.lastActiveText}
                              </span>
                            )}
                          </td>

                          {/* Date Joined */}
                          <td className="py-4 px-6 text-gray-600 font-medium text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400" />
                              <span>{user.dateJoinedFormatted}</span>
                            </div>
                          </td>

                          {/* Time Spent on Application (Lifetime from 8:30 PM) */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-gray-100 rounded-xl font-bold text-xs text-gray-800 flex items-center gap-1.5">
                                <Hourglass size={12} className="text-[#b42243]" />
                                {user.formattedTimeSpent}
                              </div>
                            </div>
                          </td>

                          {/* Time Graph Button */}
                          <td className="py-4 px-6">
                            <button
                              onClick={() => setGraphUser(user)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="View stock-market style daily time graph"
                            >
                              <TrendingUp size={13} /> Time Graph
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {user.isBlocked ? (
                                <button
                                  onClick={() => setUserConfirmModal({ type: 'unblock', user })}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  title="Unblock this user"
                                >
                                  <UserCheck size={13} /> Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => setUserConfirmModal({ type: 'block', user })}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  title="Block this user"
                                >
                                  <UserX size={13} /> Block
                                </button>
                              )}

                              <button
                                onClick={() => setUserConfirmModal({ type: 'delete', user })}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                title="Permanently delete user"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer info */}
                <div className="py-3.5 px-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span>Showing {sortedAndFilteredUsers.length} user accounts</span>
                  <span>Sorted by: <strong className="text-gray-600 capitalize">{sortField} ({sortOrder === 'asc' ? 'Least to Most' : 'Most to Least'})</strong></span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: STORIES MODERATION                             */}
        {/* ========================================================= */}
        {mainSection === 'stories' && (
          <div className="space-y-6">
            
            {/* Metric Cards for Stories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Review</p>
                  <h3 className="text-3xl font-extrabold text-[#b42243] mt-1">{storyCounts.pending}</h3>
                  <p className="text-xs text-gray-500 mt-1">Awaiting your approval</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live on Universal Feed</p>
                  <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{storyCounts.approved}</h3>
                  <p className="text-xs text-gray-500 mt-1">Visible to all users</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Submissions</p>
                  <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{storyCounts.total}</h3>
                  <p className="text-xs text-gray-500 mt-1">Lifetime community posts</p>
                </div>
                <div className="w-12 h-12 bg-pink-50 text-[#b42243] rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
              </div>
            </div>

            {/* Controls Bar: Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                <button
                  onClick={() => setActiveStoryTab('pending')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    activeStoryTab === 'pending'
                      ? 'bg-white text-[#b42243] shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Clock size={15} />
                  Pending Stories ({storyCounts.pending})
                </button>

                <button
                  onClick={() => setActiveStoryTab('approved')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    activeStoryTab === 'approved'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Check size={15} />
                  Live Stories ({storyCounts.approved})
                </button>
              </div>

              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="Search by title, story, or category..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#b42243]/20 focus:border-[#b42243]/40 shadow-sm"
                />
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            {/* Stories Listing */}
            {storiesLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <RefreshCw size={28} className="animate-spin text-[#b42243] mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading stories...</p>
              </div>
            ) : filteredStories.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeStoryTab === 'pending' ? <CheckCircle size={32} /> : <Search size={32} />}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {activeStoryTab === 'pending' ? 'All Caught Up!' : 'No Live Stories Found'}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {activeStoryTab === 'pending'
                    ? 'There are no pending stories awaiting review.'
                    : 'No approved stories match your filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg uppercase tracking-wider ${
                          story.isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {story.isApproved ? 'Live on Feed' : 'Pending Review'}
                        </span>
                        <span className="px-2.5 py-1 text-[11px] font-semibold bg-gray-50 text-gray-600 rounded-lg">
                          Category: {story.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {story.timeAgo || 'Recently'}
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                        {story.title}
                      </h3>

                      <p className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
                        {story.content}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                        <span>Submitted by: <strong className="text-gray-600">{story.authorName}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-gray-400">ID: {story.id}</span>
                      </div>
                    </div>

                    {/* Action Controls for Story */}
                    <div className="flex md:flex-col items-center gap-2 shrink-0 md:min-w-[140px]">
                      {!story.isApproved && (
                        <>
                          <button
                            onClick={() => handleQuickApprove(story)}
                            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Check size={14} /> Quick Approve
                          </button>

                          <button
                            onClick={() => openEditStoryModal(story, true)}
                            className="w-full px-4 py-2.5 bg-[#b42243] hover:bg-[#9a1a36] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Edit3 size={14} /> Edit & Approve
                          </button>
                        </>
                      )}

                      {story.isApproved && (
                        <button
                          onClick={() => openEditStoryModal(story, false)}
                          className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={14} /> Edit Story
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingStoryId(story.id)}
                        className="w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SHARE-MARKET STYLE TIME GRAPH MODAL             */}
      {/* ========================================================= */}
      {graphUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-7 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300 font-['Plus_Jakarta_Sans']">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center text-base shadow-sm border border-emerald-100">
                  <LineChart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                    {graphUser.username}&apos;s Daily Time Graph
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Daily app usage timeline with share-market style trend curve.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setGraphUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stock Market Style Metric Tickers */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lifetime Time</p>
                <p className="text-lg font-extrabold text-gray-900 mt-0.5">{graphUser.formattedTimeSpent}</p>
                <span className="text-[10px] font-semibold text-emerald-600">From 8:30 PM</span>
              </div>

              <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/60">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Realtime Status</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {graphUser.isRealtimeActive ? (
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Active Now
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-500">
                      {graphUser.isBlocked ? 'Blocked' : graphUser.lastActiveText}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Joined</p>
                <p className="text-xs font-extrabold text-gray-800 mt-1">{graphUser.dateJoinedFormatted}</p>
              </div>
            </div>

            {/* Line Chart Area */}
            <div className="bg-gradient-to-b from-gray-50/70 to-white p-4 rounded-2xl border border-gray-200/80 shadow-inner mb-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  7-Day Usage Trend (Minutes)
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  Hover points to inspect
                </span>
              </div>

              {/* The SVG Line Graph */}
              {renderStockMarketChart(graphUser.dailyUsage)}
            </div>

            {/* Explanatory Footer */}
            <div className="text-center pt-2">
              <p className="text-[11px] text-gray-400 font-medium">
                ⏱️ Counting started from 8:30 PM IST today (Nov 14, 2026). Active screen time increments live every 30 seconds.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: USER OPERATION CONFIRMATION POPUP               */}
      {/* ========================================================= */}
      {userConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] p-7 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300 text-center font-['Plus_Jakarta_Sans']">
            
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              userConfirmModal.type === 'delete'
                ? 'bg-red-50 text-red-600'
                : userConfirmModal.type === 'block'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {userConfirmModal.type === 'delete' && <Trash2 size={30} />}
              {userConfirmModal.type === 'block' && <UserX size={30} />}
              {userConfirmModal.type === 'unblock' && <UserCheck size={30} />}
            </div>

            {/* Title */}
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
              {userConfirmModal.type === 'block' && `Block "${userConfirmModal.user.username}"?`}
              {userConfirmModal.type === 'unblock' && `Unblock "${userConfirmModal.user.username}"?`}
              {userConfirmModal.type === 'delete' && `Delete "${userConfirmModal.user.username}"?`}
            </h3>

            {/* Explanatory Confirmation Text */}
            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6">
              {userConfirmModal.type === 'block' && (
                <>Are you sure you want to block <strong>{userConfirmModal.user.username}</strong>? They will be immediately locked out and prevented from accessing their sanctuary vault.</>
              )}
              {userConfirmModal.type === 'unblock' && (
                <>Are you sure you want to unblock <strong>{userConfirmModal.user.username}</strong>? Their access to the application will be restored immediately.</>
              )}
              {userConfirmModal.type === 'delete' && (
                <>Are you sure you want to permanently delete <strong>{userConfirmModal.user.username}</strong>? This user account and all their data will be purged.</>
              )}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUserConfirmModal(null)}
                disabled={processingUserAction}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteUserAction}
                disabled={processingUserAction}
                className={`flex-1 py-3.5 text-white font-bold text-xs rounded-2xl shadow-lg transition-all cursor-pointer ${
                  userConfirmModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : userConfirmModal.type === 'block'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {processingUserAction ? 'Processing...' : (
                  userConfirmModal.type === 'block' ? 'Yes, Block User' :
                  userConfirmModal.type === 'unblock' ? 'Yes, Unblock User' : 'Yes, Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIT STORY MODAL                                */}
      {/* ========================================================= */}
      {editingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-[20px] duration-300">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {isApproveOnSave ? 'Edit & Approve Story' : 'Edit Live Story'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {isApproveOnSave 
                    ? 'Review and revise text before publishing to the universal feed.' 
                    : 'Modify the existing title, category, or content.'}
                </p>
              </div>
              <button
                onClick={() => setEditingStory(null)}
                className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b42243]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b42243]/20"
                >
                  <option value="general">General Inspiration</option>
                  <option value="healing">Healing & Recovery</option>
                  <option value="anxiety">Anxiety & Calm</option>
                  <option value="growth">Personal Growth</option>
                  <option value="gratitude">Gratitude & Peace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Story Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#b42243]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="px-5 py-3 text-gray-500 font-bold text-xs rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStoryEdit}
                  disabled={savingEdit || !editTitle.trim() || !editContent.trim()}
                  className={`px-6 py-3 font-bold text-xs rounded-xl text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    isApproveOnSave 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-[#b42243] hover:bg-[#9a1a36] shadow-[#b42243]/20'
                  }`}
                >
                  <Save size={15} />
                  {savingEdit ? 'Saving...' : isApproveOnSave ? 'Approve & Publish Story' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DELETE STORY CONFIRMATION POPUP                 */}
      {/* ========================================================= */}
      {deletingStoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Delete Story?</h3>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">
              Are you sure you want to delete this story? It will be permanently removed from the community feed.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeletingStoryId(null)}
                className="flex-1 py-3 text-gray-600 font-bold text-xs bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStory(deletingStoryId)}
                className="flex-1 py-3 text-white font-bold text-xs bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
