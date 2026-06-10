import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore, applyTheme } from '@/store/theme';
import api from '@/lib/api';
import {
  LayoutDashboard, FileText, Sparkles, BookMarked, ListChecks,
  Users, ClipboardList, BarChart3, LogOut, Trophy, UserCircle2,
  Menu, X, Sun, Moon, Monitor,
} from 'lucide-react';
import clsx from 'clsx';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => { applyTheme(theme); }, []);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const teacherLinks = [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/sources', label: 'Sources', icon: FileText },
    { to: '/teacher/generate', label: 'Generate', icon: Sparkles },
    { to: '/teacher/questions', label: 'Question bank', icon: BookMarked },
    { to: '/teacher/tests', label: 'Tests', icon: ListChecks },
    { to: '/teacher/groups', label: 'Groups', icon: Users },
    { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const studentLinks = [
    { to: '/student', label: 'My quizzes', icon: ClipboardList, end: true },
    { to: '/student/groups', label: 'My groups', icon: Users },
    { to: '/student/history', label: 'History', icon: Trophy },
    { to: '/student/progress', label: 'Progress', icon: BarChart3 },
  ];

  const links = user?.role === 'TEACHER' ? teacherLinks : studentLinks;
  const profilePath = user?.role === 'TEACHER' ? '/teacher/profile' : '/student/profile';

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    logout(); nav('/login');
  }

  function Sidebar() {
    return (
      <div className="h-full flex flex-col p-4 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 px-2 mb-6">
          <Link to={user?.role === 'TEACHER' ? '/teacher' : '/student'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white grid place-items-center font-bold">Q</div>
            <div>
              <div className="font-semibold">QuizAI</div>
              <div className="text-xs text-slate-500">{user?.role === 'TEACHER' ? 'Teacher' : 'Student'}</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {links.map((l) => (
            <NavLink
              key={l.to} to={l.to} end={(l as any).end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-700/20 dark:text-brand-100'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <l.icon size={18} /> {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 space-y-3">
          <div className="px-2">
            <div className="text-xs text-slate-500 mb-1.5">Theme</div>
            <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {([['system', Monitor], ['light', Sun], ['dark', Moon]] as const).map(([t, Icon]) => (
                <button key={t} onClick={() => setTheme(t)}
                  className={clsx('flex-1 grid place-items-center rounded-md py-1.5 text-xs',
                    theme === t ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-slate-500')} title={t}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          <Link to={profilePath} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <UserCircle2 size={32} className="text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.displayName}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </Link>

          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex">
      <header className="md:hidden fixed inset-x-0 top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setOpen(true)} className="p-2 -m-2"><Menu size={20} /></button>
        <Link to={user?.role === 'TEACHER' ? '/teacher' : '/student'} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 text-white grid place-items-center font-bold text-sm">Q</div>
          <span className="font-semibold">QuizAI</span>
        </Link>
        <div className="w-8" />
      </header>

      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]">
            <Sidebar />
          </aside>
        </>
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        {user && user.emailVerified === false && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm flex items-center justify-between gap-3">
            <span className="text-amber-800 dark:text-amber-200">
              Your email isn't verified yet. Some features may be limited.
            </span>
            <Link to={user.role === 'TEACHER' ? '/verify-email' : '/student/verify-email'}
                  className="text-amber-900 dark:text-amber-100 font-medium hover:underline whitespace-nowrap">
              Verify now →
            </Link>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
