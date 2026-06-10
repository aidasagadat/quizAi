import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Progress() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-progress'], queryFn: async () => (await api.get('/analytics/me/progress')).data,
  });

  if (isLoading || !data) return <div className="text-slate-500">Loading…</div>;

  const timeline = data.timeline.map((t: any, i: number) => ({
    name: `#${i + 1}`,
    score: Math.round((t.score || 0) * 100),
    title: t.testTitle,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">My progress</h1>
      <p className="text-slate-500 mt-1">Across all your graded attempts.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
        <Stat label="Attempts" value={String(data.attemptsCount)} />
        <Stat label="Average score" value={`${Math.round(data.averageScore * 100)}%`} />
        <Stat label="Strong topics" value={String(data.strongTopics.length)} />
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-medium">Score over time</h2>
        {!timeline.length ? <p className="text-sm text-slate-500 mt-2">No completed attempts yet.</p>
          : <div className="h-64 mt-3">
            <ResponsiveContainer><LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => timeline.find((t: any) => t.name === l)?.title || l} />
              <Line type="monotone" dataKey="score" stroke="#3b6cff" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart></ResponsiveContainer>
          </div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <h2 className="font-medium text-emerald-700">Strong topics</h2>
          {!data.strongTopics.length ? <p className="text-sm text-slate-500 mt-2">Keep practicing!</p>
            : <ul className="mt-3 space-y-2 text-sm">
              {data.strongTopics.map((t: any) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span><span className="text-emerald-700 font-medium">{Math.round(t.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>}
        </div>
        <div className="card p-5">
          <h2 className="font-medium text-rose-700">Topics to review</h2>
          {!data.weakTopics.length ? <p className="text-sm text-slate-500 mt-2">No weak topics — nice!</p>
            : <ul className="mt-3 space-y-2 text-sm">
              {data.weakTopics.map((t: any) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span><span className="text-rose-700 font-medium">{Math.round(t.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>}
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-medium">Bloom's Taxonomy breakdown</h2>
        {!data.bloomBreakdown.length ? <p className="text-sm text-slate-500 mt-2">—</p>
          : <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
            {data.bloomBreakdown.map((b: any) => (
              <li key={b.bloom} className="flex justify-between border rounded-lg px-3 py-2">
                <span>{b.bloom}</span>
                <span className={b.accuracy >= 0.7 ? 'text-emerald-700' : 'text-rose-700'}>{Math.round(b.accuracy * 100)}%</span>
              </li>
            ))}
          </ul>}
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
