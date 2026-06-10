import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function History() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-history'], queryFn: async () => (await api.get('/attempts/mine/history')).data,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">History</h1>
      <p className="text-slate-500 mt-1">All your past attempts.</p>

      {isLoading ? <div className="text-slate-500 text-sm mt-6">Loading…</div>
        : !data?.length ? <div className="card p-6 mt-6 text-sm text-slate-500">No attempts yet.</div>
        : <div className="card mt-6 divide-y">
          {data.map((a: any) => (
            <Link key={a.id} to={`/student/result/${a.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
              <div>
                <div className="font-medium">{a.assignment.test.title}</div>
                <div className="text-xs text-slate-500">{new Date(a.submittedAt).toLocaleString()} · {a.timeSpentSec}s</div>
              </div>
              <div className="text-lg font-semibold">{Math.round((a.score || 0) * 100)}%</div>
            </Link>
          ))}
        </div>}
    </div>
  );
}
