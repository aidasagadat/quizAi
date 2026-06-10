import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

export default function Tests() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tests'], queryFn: async () => (await api.get('/tests')).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/tests', { title, description: desc })).data,
    onSuccess: () => { toast.success('Test created'); setTitle(''); setDesc(''); qc.invalidateQueries({ queryKey: ['tests'] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/tests/${id}`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['tests'] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tests</h1>
      <p className="text-slate-500 mt-1">Combine accepted questions into a quiz, then assign it to groups.</p>

      <div className="card p-5 mt-6">
        <div className="font-medium flex items-center gap-2"><Plus size={18} /> New test</div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} className="btn-primary mt-3">
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>

      <div className="card mt-6">
        <div className="px-5 py-4 border-b font-medium">Your tests</div>
        {isLoading ? <div className="p-5 text-sm text-slate-500">Loading…</div>
          : !data?.length ? <div className="p-5 text-sm text-slate-500">No tests yet.</div>
          : <ul className="divide-y">
            {data.map((t: any) => (
              <li key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <Link to={`/teacher/tests/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                  <div className="text-xs text-slate-500">{t._count.questions} questions · {t._count.assignments} assignments</div>
                </div>
                <button onClick={() => del.mutate(t.id)} className="text-rose-600 hover:bg-rose-50 rounded-lg p-2" title="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>}
      </div>
    </div>
  );
}
