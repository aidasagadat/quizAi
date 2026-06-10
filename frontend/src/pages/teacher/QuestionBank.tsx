import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Check, X, Pencil, Trash2 } from 'lucide-react';

export default function QuestionBank() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'DRAFT' | 'ACCEPTED' | 'DISCARDED' | ''>('');
  const [type, setType] = useState('');
  const [bloom, setBloom] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftPatch, setDraftPatch] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ['questions', status, type, bloom, difficulty],
    queryFn: async () => {
      const r = await api.get('/questions', { params: { status: status || undefined, type: type || undefined, bloom: bloom || undefined, difficulty: difficulty || undefined } });
      return r.data;
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) =>
      (await api.patch(`/questions/${id}`, patch)).data,
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['questions'] }); setEditing(null); setDraftPatch({}); },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/questions/${id}`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['questions'] }); },
  });

  function accept(id: string) { updateMut.mutate({ id, patch: { status: 'ACCEPTED' } }); }
  function discard(id: string) { updateMut.mutate({ id, patch: { status: 'DISCARDED' } }); }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Question bank</h1>
      <p className="text-slate-500 mt-1">Review and edit AI-generated drafts. Accept the ones you'd like to use.</p>

      <div className="card p-4 mt-6 flex flex-wrap gap-3">
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="DISCARDED">Discarded</option>
        </select>
        <select className="input max-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="MULTIPLE_CHOICE">MCQ</option>
          <option value="TRUE_FALSE">True/False</option>
          <option value="SHORT_ANSWER">Short answer</option>
          <option value="FILL_BLANK">Fill blank</option>
        </select>
        <select className="input max-w-[180px]" value={bloom} onChange={(e) => setBloom(e.target.value)}>
          <option value="">All Bloom levels</option>
          {['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="input max-w-[180px]" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <div className="text-slate-500 text-sm">Loading…</div>
          : !data?.length ? <div className="card p-6 text-sm text-slate-500">No questions match.</div>
          : data.map((q: any) => (
            <div key={q.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`badge ${q.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{q.status}</span>
                {q.difficulty === 'EASY' && <span className="badge bg-emerald-100 text-emerald-800">Easy</span>}
                {q.difficulty === 'MEDIUM' && <span className="badge bg-amber-100 text-amber-800">Medium</span>}
                {q.difficulty === 'HARD' && <span className="badge bg-rose-100 text-rose-800">Hard</span>}
                <span className="badge bg-slate-100 text-slate-700">{q.type}</span>
                <span className="badge bg-blue-100 text-blue-800">{q.bloomLevel}</span>
                {q.topic && <span className="badge bg-emerald-50 text-emerald-700">{q.topic}</span>}
              </div>

              {editing === q.id ? (
                <EditForm q={q} patch={draftPatch} onPatch={setDraftPatch}
                         onSave={() => updateMut.mutate({ id: q.id, patch: draftPatch })}
                         onCancel={() => { setEditing(null); setDraftPatch({}); }} />
              ) : (
                <>
                  <div className="font-medium">{q.stem}</div>
                  <Preview q={q} />
                  {q.explanation && <div className="text-xs text-slate-500 mt-2">💡 {q.explanation}</div>}
                </>
              )}

              {editing !== q.id && (
                <div className="flex gap-2 mt-3">
                  {q.status !== 'ACCEPTED' && (
                    <button onClick={() => accept(q.id)} className="btn-ghost text-emerald-700"><Check size={14}/> Accept</button>
                  )}
                  {q.status !== 'DISCARDED' && (
                    <button onClick={() => discard(q.id)} className="btn-ghost text-slate-600"><X size={14}/> Discard</button>
                  )}
                  <button onClick={() => { setEditing(q.id); setDraftPatch({ stem: q.stem, payload: q.payload, explanation: q.explanation, topic: q.topic, bloomLevel: q.bloomLevel }); }} className="btn-ghost"><Pencil size={14}/> Edit</button>
                  <button onClick={() => delMut.mutate(q.id)} className="btn-ghost text-rose-600"><Trash2 size={14}/> Delete</button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function Preview({ q }: { q: any }) {
  if (q.type === 'MULTIPLE_CHOICE') return (
    <ol className="mt-2 space-y-1 text-sm pl-5 list-[upper-alpha]">
      {q.payload.options.map((o: string, idx: number) => (
        <li key={idx} className={idx === q.payload.correctIndex ? 'text-emerald-700 font-medium' : ''}>{o} {idx === q.payload.correctIndex && '✓'}</li>
      ))}
    </ol>
  );
  if (q.type === 'TRUE_FALSE') return <div className="mt-2 text-sm text-emerald-700">Answer: {q.payload.correct ? 'True' : 'False'}</div>;
  return <div className="mt-2 text-sm text-emerald-700">Accepted: {(q.payload.acceptableAnswers || []).join(' / ')}</div>;
}

function EditForm({ q, patch, onPatch, onSave, onCancel }: any) {
  const setField = (k: string, v: any) => onPatch({ ...patch, [k]: v });
  const setPayload = (k: string, v: any) => onPatch({ ...patch, payload: { ...q.payload, ...patch.payload, [k]: v } });

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Question stem</label>
        <textarea className="input min-h-[70px]" value={patch.stem ?? q.stem} onChange={(e) => setField('stem', e.target.value)} />
      </div>
      {q.type === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          {(patch.payload?.options ?? q.payload.options).map((o: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input type="radio" checked={(patch.payload?.correctIndex ?? q.payload.correctIndex) === idx} onChange={() => setPayload('correctIndex', idx)} />
              <input className="input" value={o} onChange={(e) => {
                const opts = [...(patch.payload?.options ?? q.payload.options)]; opts[idx] = e.target.value; setPayload('options', opts);
              }} />
            </div>
          ))}
        </div>
      )}
      {q.type === 'TRUE_FALSE' && (
        <div className="flex gap-3">
          <label className="flex items-center gap-2"><input type="radio" checked={(patch.payload?.correct ?? q.payload.correct) === true} onChange={() => setPayload('correct', true)} /> True</label>
          <label className="flex items-center gap-2"><input type="radio" checked={(patch.payload?.correct ?? q.payload.correct) === false} onChange={() => setPayload('correct', false)} /> False</label>
        </div>
      )}
      {(q.type === 'SHORT_ANSWER' || q.type === 'FILL_BLANK') && (
        <div>
          <label className="label">Acceptable answers (one per line)</label>
          <textarea className="input min-h-[80px]" value={(patch.payload?.acceptableAnswers ?? q.payload.acceptableAnswers).join('\n')}
                    onChange={(e) => setPayload('acceptableAnswers', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
          {q.type === 'FILL_BLANK' && (
            <>
              <label className="label mt-2">Template (use ___ for the blank)</label>
              <input className="input" value={patch.payload?.template ?? q.payload.template} onChange={(e) => setPayload('template', e.target.value)} />
            </>
          )}
        </div>
      )}
      <div>
        <label className="label">Topic</label>
        <input className="input" value={patch.topic ?? q.topic ?? ''} onChange={(e) => setField('topic', e.target.value)} />
      </div>
      <div>
        <label className="label">Explanation</label>
        <textarea className="input" value={patch.explanation ?? q.explanation ?? ''} onChange={(e) => setField('explanation', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="btn-primary">Save</button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
