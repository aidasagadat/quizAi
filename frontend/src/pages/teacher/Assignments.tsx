import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, BarChart3 } from 'lucide-react';

export default function Assignments() {
  const qc = useQueryClient();
  const [testId, setTestId] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 16);
  });
  const [allowRetakes, setAllowRetakes] = useState(false);
  const [timeLimitMin, setTimeLimitMin] = useState<number | ''>('');

  const { data: tests } = useQuery({ queryKey: ['tests'], queryFn: async () => (await api.get('/tests')).data });
  const { data: groups } = useQuery({ queryKey: ['groups-teacher'], queryFn: async () => (await api.get('/groups')).data });
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments-teacher'], queryFn: async () => (await api.get('/assignments')).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/assignments', {
      testId, groupIds, deadline: new Date(deadline).toISOString(),
      timeLimitSec: timeLimitMin === '' ? null : Number(timeLimitMin) * 60,
      allowRetakes, autoSave: true,
    })).data,
    onSuccess: () => {
      toast.success('Assigned');
      setTestId(''); setGroupIds([]); setTimeLimitMin('');
      qc.invalidateQueries({ queryKey: ['assignments-teacher'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/assignments/${id}`)).data,
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['assignments-teacher'] }); },
  });

  function toggleGroup(id: string) {
    setGroupIds(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Assignments</h1>
      <p className="text-slate-500 mt-1">Push a quiz to one or more groups with a deadline.</p>

      <div className="card p-5 mt-6 space-y-3">
        <div>
          <label className="label">Test</label>
          <select className="input" value={testId} onChange={(e) => setTestId(e.target.value)}>
            <option value="">Pick a test…</option>
            {tests?.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t._count.questions} q)</option>)}
          </select>
        </div>
        <div>
          <label className="label">Groups</label>
          <div className="flex flex-wrap gap-2">
            {!groups?.length ? <span className="text-sm text-slate-500">No groups yet.</span>
              : groups.map((g: any) => (
                <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                  className={`badge px-3 py-1 ${groupIds.includes(g.id) ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {g.name}
                </button>
              ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Deadline</label>
            <input type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <label className="label">Time limit</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={300} className="input"
                placeholder="No limit"
                value={timeLimitMin}
                onChange={(e) => setTimeLimitMin(e.target.value === '' ? '' : Number(e.target.value))} />
              <span className="text-sm text-slate-500 whitespace-nowrap">min</span>
              {timeLimitMin !== '' && (
                <button type="button" onClick={() => setTimeLimitMin('')} className="text-xs text-slate-500 underline">clear</button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Leave empty for no time limit.</p>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowRetakes} onChange={(e) => setAllowRetakes(e.target.checked)} />
          Allow retakes
        </label>
        <button disabled={!testId || !groupIds.length || create.isPending} onClick={() => create.mutate()} className="btn-primary">
          {create.isPending ? 'Assigning…' : 'Assign'}
        </button>
      </div>

      <div className="card mt-6">
        <div className="px-5 py-4 border-b font-medium">Active assignments</div>
        {isLoading ? <div className="p-5 text-sm text-slate-500">Loading…</div>
          : !assignments?.length ? <div className="p-5 text-sm text-slate-500">No assignments yet.</div>
          : <ul className="divide-y">
            {assignments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.test.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.groups.map((g: any) => g.group.name).join(', ')} · Deadline {new Date(a.deadline).toLocaleString()} · {a._count.attempts} attempts
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/teacher/analytics/assignments/${a.id}`} className="btn-ghost"><BarChart3 size={14}/> Analytics</Link>
                  <button onClick={() => del.mutate(a.id)} className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"><Trash2 size={16}/></button>
                </div>
              </li>
            ))}
          </ul>}
      </div>
    </div>
  );
}
