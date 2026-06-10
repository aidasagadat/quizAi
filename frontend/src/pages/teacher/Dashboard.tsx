import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { FileText, Sparkles, BookMarked, Users, ClipboardList, ListChecks } from 'lucide-react';

export default function TeacherDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-overview'],
    queryFn: async () => (await api.get('/analytics/overview')).data,
  });

  const tiles = [
    { to: '/teacher/generate',  icon: Sparkles,     title: 'Generate a quiz',     desc: 'From PDF, DOCX, or pasted text.' },
    { to: '/teacher/sources',   icon: FileText,     title: 'Sources',             desc: 'Upload and manage materials.' },
    { to: '/teacher/questions', icon: BookMarked,   title: 'Question bank',       desc: 'Review, edit, accept drafts.' },
    { to: '/teacher/tests',     icon: ListChecks,   title: 'Tests',               desc: 'Assemble quizzes from questions.' },
    { to: '/teacher/groups',    icon: Users,        title: 'Student groups',      desc: 'Create classes and invite students.' },
    { to: '/teacher/assignments', icon: ClipboardList, title: 'Assignments',      desc: 'Push quizzes to your groups.' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-500 mt-1">Quick overview of your activity.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        {Object.entries(data?.counts || {}).map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{k}</div>
            <div className="text-2xl font-semibold mt-1">{isLoading ? '…' : String(v)}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {tiles.map((t) => (
          <Link to={t.to} key={t.to} className="card p-5 hover:border-brand-500 transition">
            <t.icon className="text-brand-600" />
            <div className="font-medium mt-3">{t.title}</div>
            <p className="text-sm text-slate-600 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card mt-8 p-5">
        <h2 className="font-medium">Recent submissions</h2>
        {!data?.recentSubmissions?.length ? (
          <p className="text-sm text-slate-500 mt-2">No submissions yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {data.recentSubmissions.map((s: any) => (
              <li key={s.id} className="py-3 flex justify-between text-sm">
                <div>
                  <div className="font-medium">{s.studentName}</div>
                  <div className="text-slate-500">{s.testTitle}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{Math.round((s.score || 0) * 100)}%</div>
                  <div className="text-slate-500 text-xs">{new Date(s.submittedAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
