import { useState } from 'react';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';

export default function StudentGroups() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-groups'], queryFn: async () => (await api.get('/groups/mine/list')).data,
  });

  const join = useMutation({
    mutationFn: async () => (await api.post('/groups/join', { code })).data,
    onSuccess: () => { toast.success('Joined'); setCode(''); qc.invalidateQueries({ queryKey: ['my-groups'] }); qc.invalidateQueries({ queryKey: ['my-assignments'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const leave = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/groups/mine/${id}`)).data,
    onSuccess: () => { toast.success('Left group'); qc.invalidateQueries({ queryKey: ['my-groups'] }); qc.invalidateQueries({ queryKey: ['my-assignments'] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">My groups</h1>
      <p className="text-slate-500 mt-1">Join a class with the invite code your teacher gave you.</p>

      <div className="card p-5 mt-6">
        <label className="label">Invite code</label>
        <div className="flex gap-2">
          <input className="input font-mono uppercase tracking-wider" placeholder="e.g. DEMO01" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button onClick={() => join.mutate()} disabled={!code.trim() || join.isPending} className="btn-primary whitespace-nowrap">Join</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <div className="text-slate-500 text-sm">Loading…</div>
          : !data?.length ? <div className="card p-6 text-sm text-slate-500">You haven't joined any groups yet.</div>
          : data.map((g: any) => (
            <div key={g.id} className="card p-5 flex items-center justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-slate-500">Teacher: {g.teacher?.displayName}</div>
              </div>
              <button onClick={() => leave.mutate(g.id)} className="btn-ghost text-rose-600"><LogOut size={14}/> Leave</button>
            </div>
          ))}
      </div>
    </div>
  );
}
