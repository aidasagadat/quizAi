import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function Analytics() {
  const { data: overview } = useQuery({
    queryKey: ['teacher-overview'], queryFn: async () => (await api.get('/analytics/overview')).data,
  });
  const { data: assignments } = useQuery({
    queryKey: ['assignments-teacher'], queryFn: async () => (await api.get('/assignments')).data,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
        {Object.entries(overview?.counts || {}).map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="text-xs uppercase text-slate-500">{k}</div>
            <div className="text-2xl font-semibold mt-1">{String(v)}</div>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <div className="px-5 py-4 border-b font-medium">Pick an assignment to see detailed analytics</div>
        {!assignments?.length ? <div className="p-5 text-sm text-slate-500">No assignments yet.</div>
          : <ul className="divide-y">
            {assignments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.test.title}</div>
                  <div className="text-xs text-slate-500">{a._count.attempts} attempts</div>
                </div>
                <Link to={`/teacher/analytics/assignments/${a.id}`} className="btn-ghost">Open →</Link>
              </li>
            ))}
          </ul>}
      </div>
    </div>
  );
}
