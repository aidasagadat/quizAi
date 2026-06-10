import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, Download, Trash2, Wand2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const DIFFICULTIES = [
  { v: 'EASY',   label: 'Easy',   color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
  { v: 'MEDIUM', label: 'Medium', color: 'bg-amber-100 text-amber-800',     border: 'border-amber-200' },
  { v: 'HARD',   label: 'Hard',   color: 'bg-rose-100 text-rose-800',       border: 'border-rose-200' },
] as const;

type Difficulty = typeof DIFFICULTIES[number]['v'];

export default function TestEditor() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const token = useAuthStore(s => s.accessToken);

  // Auto-select state
  const [autoMode, setAutoMode] = useState<'auto' | 'manual'>('auto');
  const [selCounts, setSelCounts] = useState<Record<Difficulty, number>>({ EASY: 0, MEDIUM: 5, HARD: 3 });
  const [filterSourceId, setFilterSourceId] = useState('');
  const [autoWarnings, setAutoWarnings] = useState<string[]>([]);

  const { data: test } = useQuery({
    queryKey: ['test', id], enabled: !!id,
    queryFn: async () => (await api.get(`/tests/${id}`)).data,
  });

  const { data: sources } = useQuery({
    queryKey: ['sources'], queryFn: async () => (await api.get('/sources')).data,
  });

  // For manual mode: show accepted questions
  const { data: bank } = useQuery({
    queryKey: ['questions', 'ACCEPTED'],
    enabled: autoMode === 'manual',
    queryFn: async () => (await api.get('/questions', { params: { status: 'ACCEPTED' } })).data,
  });

  const selectedIds = (test?.questions || []).map((tq: any) => tq.question.id);

  const saveMut = useMutation({
    mutationFn: async (ids: string[]) => (await api.put(`/tests/${id}/questions`, { questionIds: ids })).data,
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['test', id] }); },
  });

  const autoSelectMut = useMutation({
    mutationFn: async () => (await api.post(`/tests/${id}/auto-select`, {
      easyCount: selCounts.EASY,
      mediumCount: selCounts.MEDIUM,
      hardCount: selCounts.HARD,
      ...(filterSourceId ? { sourceId: filterSourceId } : {}),
    })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['test', id] });
      setAutoWarnings(data.warnings || []);
      const total = data.test.questions.length;
      toast.success(`Added ${total} question${total === 1 ? '' : 's'} to the test`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Auto-select failed'),
  });

  function removeQuestion(qid: string) { saveMut.mutate(selectedIds.filter((x: string) => x !== qid)); }
  function move(qid: string, dir: -1 | 1) {
    const idx = selectedIds.indexOf(qid); if (idx < 0) return;
    const newIdx = idx + dir; if (newIdx < 0 || newIdx >= selectedIds.length) return;
    const arr = [...selectedIds]; [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    saveMut.mutate(arr);
  }

  // Manual add/remove
  function addManual(qid: string) { if (!selectedIds.includes(qid)) saveMut.mutate([...selectedIds, qid]); }

  async function downloadExport(format: 'pdf' | 'docx', answers = false) {
    if (!id) return;
    const url = `/api/v1/exports/tests/${id}/${format}${answers ? '?answers=1' : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { toast.error('Export failed'); return; }
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${test?.title || 'quiz'}.${format}`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function previewGoogleForms() {
    if (!id) return;
    const r = await api.get(`/exports/tests/${id}/google-forms`);
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${test?.title || 'quiz'}.google-forms.json`; a.click();
    toast.success('Google Forms JSON downloaded');
  }

  if (!test) return <div className="text-slate-500">Loading…</div>;

  const totalSel = selCounts.EASY + selCounts.MEDIUM + selCounts.HARD;

  // Group current questions by difficulty for display
  const questionsByDiff = (test.questions || []).reduce((acc: any, tq: any) => {
    const diff = tq.question.difficulty || 'MEDIUM';
    if (!acc[diff]) acc[diff] = [];
    acc[diff].push(tq);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{test.title}</h1>
      {test.description && <p className="text-slate-500 mt-1">{test.description}</p>}

      {/* Export buttons */}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn-ghost" onClick={() => downloadExport('pdf')}><Download size={14}/> PDF (no answers)</button>
        <button className="btn-ghost" onClick={() => downloadExport('pdf', true)}><Download size={14}/> PDF + answer key</button>
        <button className="btn-ghost" onClick={() => downloadExport('docx')}><Download size={14}/> DOCX</button>
        <button className="btn-ghost" onClick={() => downloadExport('docx', true)}><Download size={14}/> DOCX + answers</button>
        <button className="btn-ghost" onClick={previewGoogleForms}><Download size={14}/> Google Forms JSON</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        {/* Left: current test questions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Questions in test ({test.questions.length})</h2>
            {test.questions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {DIFFICULTIES.map(d => {
                  const c = (questionsByDiff[d.v] || []).length;
                  if (!c) return null;
                  return <span key={d.v} className={`badge ${d.color}`}>{c} {d.label}</span>;
                })}
              </div>
            )}
          </div>

          {!test.questions.length ? (
            <p className="text-sm text-slate-500">Use the panel on the right to add questions →</p>
          ) : (
            <ul className="space-y-2 max-h-[600px] overflow-y-auto">
              {test.questions.map((tq: any, idx: number) => {
                const diff = DIFFICULTIES.find(d => d.v === tq.question.difficulty);
                return (
                  <li key={tq.question.id} className={`border rounded-lg p-3 bg-slate-50 ${diff?.border || ''}`}>
                    <div className="flex items-center gap-2 text-xs">
                      {diff && <span className={`badge ${diff.color}`}>{diff.label}</span>}
                      <span className="badge bg-slate-200 text-slate-700">{tq.question.type}</span>
                      {tq.question.topic && <span className="badge bg-blue-50 text-blue-700">{tq.question.topic}</span>}
                    </div>
                    <div className="text-sm font-medium mt-1">{idx + 1}. {tq.question.stem}</div>
                    <div className="flex gap-1 mt-2">
                      <button className="btn-ghost p-1" onClick={() => move(tq.question.id, -1)}><ChevronUp size={14}/></button>
                      <button className="btn-ghost p-1" onClick={() => move(tq.question.id, 1)}><ChevronDown size={14}/></button>
                      <button className="btn-ghost p-1 text-rose-600" onClick={() => removeQuestion(tq.question.id)}><Trash2 size={14}/></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: add questions panel */}
        <div className="card p-5">
          {/* Mode toggle */}
          <div className="flex border rounded-lg overflow-hidden mb-4">
            <button
              onClick={() => setAutoMode('auto')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${autoMode === 'auto' ? 'bg-brand-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
              <Wand2 size={14} className="inline mr-1" /> Auto-select
            </button>
            <button
              onClick={() => setAutoMode('manual')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${autoMode === 'manual' ? 'bg-brand-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
              Manual pick
            </button>
          </div>

          {autoMode === 'auto' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Specify how many easy, medium, and hard questions to add. Questions are randomly picked from your accepted question bank.
              </p>

              {/* Source filter */}
              {sources?.length > 0 && (
                <div>
                  <label className="label">Filter by source (optional)</label>
                  <select className="input" value={filterSourceId} onChange={e => setFilterSourceId(e.target.value)}>
                    <option value="">All sources</option>
                    {sources.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.filename}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Difficulty counts */}
              <div className="space-y-3">
                {DIFFICULTIES.map(d => (
                  <div key={d.v} className="flex items-center gap-3">
                    <span className={`badge ${d.color} w-20 justify-center`}>{d.label}</span>
                    <input
                      type="number" min={0} max={50} className="input w-24 text-center"
                      value={selCounts[d.v]}
                      onChange={e => setSelCounts(c => ({ ...c, [d.v]: Math.max(0, Number(e.target.value)) }))}
                    />
                    <span className="text-xs text-slate-500">questions</span>
                  </div>
                ))}
              </div>

              {/* Warnings from previous auto-select */}
              {autoWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  {autoWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-800 flex items-center gap-1">
                      <AlertTriangle size={12} /> {w}
                    </p>
                  ))}
                  <p className="text-xs text-amber-700 mt-1">Generate more questions in the <a href="/teacher/generate" className="underline">AI Generation</a> page.</p>
                </div>
              )}

              <button
                onClick={() => autoSelectMut.mutate()}
                disabled={autoSelectMut.isPending || totalSel === 0}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {autoSelectMut.isPending
                  ? <><RefreshCw size={14} className="animate-spin" /> Selecting…</>
                  : <><Wand2 size={14} /> Add {totalSel} question{totalSel === 1 ? '' : 's'} to test</>}
              </button>

              <p className="text-xs text-slate-500 text-center">
                This replaces the current test questions.
              </p>
            </div>
          ) : (
            /* Manual mode: classic bank picker */
            <div>
              <p className="text-sm text-slate-500 mb-3">
                Manually pick questions from your accepted bank. Click + to add.
              </p>
              {!bank?.length ? (
                <p className="text-sm text-slate-500">No accepted questions yet. <a href="/teacher/generate" className="text-brand-600 hover:underline">Generate some first.</a></p>
              ) : (
                <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                  {bank.filter((q: any) => !selectedIds.includes(q.id)).map((q: any) => {
                    const diff = DIFFICULTIES.find(d => d.v === q.difficulty);
                    return (
                      <li key={q.id} className="border rounded-lg p-3 flex items-start gap-2">
                        <button className="btn-ghost p-1.5 mt-0.5 text-brand-600 font-bold" onClick={() => addManual(q.id)} title="Add">+</button>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 text-xs flex-wrap">
                            {diff && <span className={`badge ${diff.color}`}>{diff.label}</span>}
                            <span className="badge bg-slate-200 text-slate-700">{q.type}</span>
                            {q.topic && <span className="badge bg-blue-50 text-blue-700">{q.topic}</span>}
                          </div>
                          <div className="text-sm mt-1">{q.stem}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
