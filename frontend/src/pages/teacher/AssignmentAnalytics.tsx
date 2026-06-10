import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AssignmentAnalytics() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-assignment', id], enabled: !!id,
    queryFn: async () => (await api.get(`/analytics/assignments/${id}`)).data,
  });

  if (isLoading || !data) return <div className="text-slate-500">Loading…</div>;

  const distrib = (data.scoreDistribution.buckets as number[]).map((v, i) => ({
    range: data.scoreDistribution.labels[i], count: v,
  }));
  const perQ = data.perQuestion.map((q: any, i: number) => ({ name: `Q${i + 1}`, accuracy: Math.round(q.accuracy * 100), full: q.stem }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">{data.testTitle}</h1>
      <p className="text-slate-500 mt-1">Assignment analytics</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <Stat label="Submissions" value={`${data.submissions} / ${data.totalAssignees}`} />
        <Stat label="Completion" value={`${Math.round(data.completionRate * 100)}%`} />
        <Stat label="Average score" value={`${Math.round(data.averageScore * 100)}%`} />
        <Stat label="Avg time" value={`${Math.round(data.averageTimeSec)}s`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="card p-5">
          <h2 className="font-medium">Score distribution</h2>
          <div className="h-64 mt-3">
            <ResponsiveContainer><BarChart data={distrib}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#3b6cff" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Per-question accuracy (%)</h2>
          <div className="h-64 mt-3">
            <ResponsiveContainer><BarChart data={perQ}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => perQ.find((p: any) => p.name === l)?.full || l} />
              <Bar dataKey="accuracy" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <h2 className="font-medium">Per student</h2>
          {!data.perStudent.length ? <p className="text-sm text-slate-500 mt-2">No submissions yet.</p>
            : <ul className="mt-3 divide-y">
              {data.perStudent.map((s: any) => (
                <li key={s.studentId} className="py-2 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{Math.round((s.score || 0) * 100)}%</div>
                    <div className="text-xs text-slate-500">{s.timeSpentSec}s</div>
                  </div>
                </li>
              ))}
            </ul>}
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Weak topics across class</h2>
          {!data.weakTopics.length ? <p className="text-sm text-slate-500 mt-2">No data yet.</p>
            : <ul className="mt-3 space-y-2 text-sm">
              {data.weakTopics.slice(0, 8).map((t: any) => (
                <li key={t.topic} className="flex justify-between">
                  <span className="truncate">{t.topic}</span>
                  <span className={t.accuracy < 0.5 ? 'text-rose-600 font-medium' : 'text-slate-600'}>{Math.round(t.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
