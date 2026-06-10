import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { CalendarClock, Play, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments'], queryFn: async () => (await api.get('/assignments/mine/list')).data,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">My quizzes</h1>
      <p className="text-slate-500 mt-1">Everything assigned to your groups.</p>

      {isLoading ? <div className="text-slate-500 text-sm mt-6">Loading…</div>
        : !data?.length ? (
          <div className="card p-6 mt-6 text-sm text-slate-500">
            No quizzes assigned yet. Join a group from the <Link to="/student/groups" className="text-brand-600 hover:underline">My groups</Link> page.
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {data.map((a: any) => {
              const submitted = a.attempts.find((at: any) => at.status === 'GRADED' || at.status === 'SUBMITTED');
              const overdue = new Date(a.deadline) < new Date() && !submitted;
              return (
                <div key={a.id} className="card p-5 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.test.title}</div>
                    {a.test.description && <div className="text-sm text-slate-500 mt-0.5">{a.test.description}</div>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><CalendarClock size={12}/> Due {new Date(a.deadline).toLocaleString()}</span>
                      <span>{a.test._count.questions} questions</span>
                      {a.timeLimitSec && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">⏱ {Math.round(a.timeLimitSec / 60)} min</span>}
                      <span>{a.groups.map((g: any) => g.group.name).join(', ')}</span>
                    </div>
                  </div>
                  <div>
                    {submitted ? (
                      <Link to={`/student/result/${submitted.id}`} className="btn-ghost text-emerald-700">
                        <CheckCircle2 size={14}/> Score: {Math.round((submitted.score || 0) * 100)}%
                      </Link>
                    ) : overdue ? (
                      <span className="badge bg-rose-100 text-rose-700">Overdue</span>
                    ) : (
                      <Link to={`/student/take/${a.id}`} className="btn-primary">
                        {a.attempts.length > 0 ? <><RotateCcw size={14}/> Resume</> : <><Play size={14}/> Start</>}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
