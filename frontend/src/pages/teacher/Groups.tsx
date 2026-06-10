import { useState } from 'react';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, Trash2, UserMinus } from 'lucide-react';

export default function Groups() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['groups-teacher'], queryFn: async () => (await api.get('/groups')).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/groups', { name })).data,
    onSuccess: () => { toast.success('Group created'); setName(''); qc.invalidateQueries({ queryKey: ['groups-teacher'] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/groups/${id}`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['groups-teacher'] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Student groups</h1>
      <p className="text-slate-500 mt-1">Create a group, share the invite code, and assign quizzes to it.</p>

      <div className="card p-5 mt-6">
        <label className="label">Group name</label>
        <div className="flex gap-2">
          <input className="input" placeholder="e.g. 10-B Biology" value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="btn-primary whitespace-nowrap">Create</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <div className="text-slate-500 text-sm">Loading…</div>
          : !data?.length ? <div className="card p-6 text-sm text-slate-500">No groups yet.</div>
          : data.map((g: any) => <GroupCard key={g.id} g={g} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? null : g.id)} onDelete={() => del.mutate(g.id)} />)}
      </div>
    </div>
  );
}

function GroupCard({ g, open, onToggle, onDelete }: any) {
  const qc = useQueryClient();
  const { data: details } = useQuery({
    queryKey: ['group', g.id], enabled: open,
    queryFn: async () => (await api.get(`/groups/${g.id}`)).data,
  });

  const removeMember = useMutation({
    mutationFn: async (sid: string) => (await api.delete(`/groups/${g.id}/members/${sid}`)).data,
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['group', g.id] }); qc.invalidateQueries({ queryKey: ['groups-teacher'] }); },
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{g.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{g._count.members} member{g._count.members === 1 ? '' : 's'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-500">Invite code:</span>
            <span className="font-mono font-semibold">{g.inviteCode}</span>
            <button onClick={() => { navigator.clipboard.writeText(g.inviteCode); toast.success('Copied'); }} className="p-1 hover:bg-slate-200 rounded"><Copy size={14}/></button>
          </div>
          <button onClick={onToggle} className="btn-ghost">{open ? 'Hide' : 'Members'}</button>
          <button onClick={onDelete} className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"><Trash2 size={16}/></button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t pt-3">
          {!details?.members?.length ? <p className="text-sm text-slate-500">No members yet. Share the invite code so students can join.</p>
            : <ul className="space-y-2">
              {details.members.map((m: any) => (
                <li key={m.student.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{m.student.displayName}</div>
                    <div className="text-xs text-slate-500">{m.student.email}</div>
                  </div>
                  <button className="btn-ghost text-rose-600" onClick={() => removeMember.mutate(m.student.id)}><UserMinus size={14}/> Remove</button>
                </li>
              ))}
            </ul>}
        </div>
      )}
    </div>
  );
}
