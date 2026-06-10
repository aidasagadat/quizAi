import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

interface Question { id: string; type: string; stem: string; bloomLevel: string; topic?: string; payload: any; }
interface Snapshot {
  attemptId: string; status: string;
  assignment: { id: string; deadline: string; autoSave: boolean; timeLimitSec: number | null };
  test: { id: string; title: string; description?: string };
  questions: Question[];
  savedAnswers: { questionId: string; response: any }[];
  startedAt: string;
  remainingSec: number | null;
}

export default function TakeQuiz() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const nav = useNavigate();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastSaved = useRef<Record<string, string>>({});
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!assignmentId) return;
    api.post(`/attempts/start/${assignmentId}`).then((r) => {
      const data: Snapshot = r.data;
      setSnap(data);
      setRemaining(data.remainingSec);
      const init: Record<string, any> = {};
      for (const a of data.savedAnswers) init[a.questionId] = a.response;
      setResponses(init);
    }).catch((e) => { toast.error(e.response?.data?.message || 'Cannot start'); nav('/student'); });
  }, [assignmentId]);

  // Countdown tick
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining(r => (r === null ? null : Math.max(0, r - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [remaining !== null]);

  // Auto-submit when timer hits zero
  useEffect(() => {
    if (remaining === 0 && snap && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      toast('Time up — submitting your answers');
      setSubmitting(true);
      submit.mutate();
    }
  }, [remaining]);

  // Debounced auto-save
  useEffect(() => {
    if (!snap?.assignment.autoSave) return;
    const t = setTimeout(async () => {
      for (const [qid, resp] of Object.entries(responses)) {
        const key = JSON.stringify(resp);
        if (lastSaved.current[qid] === key) continue;
        try {
          await api.post(`/attempts/${snap.attemptId}/answer`, { questionId: qid, response: resp });
          lastSaved.current[qid] = key;
        } catch {}
      }
    }, 600);
    return () => clearTimeout(t);
  }, [responses, snap]);

  const submit = useMutation({
    mutationFn: async () => {
      const answers = Object.entries(responses).map(([qid, resp]) => ({ questionId: qid, response: resp }));
      return (await api.post(`/attempts/${snap!.attemptId}/submit`, { answers })).data;
    },
    onSuccess: (r) => { nav(`/student/result/${r.attemptId}`); },
    onError: (e: any) => { setSubmitting(false); toast.error(e.response?.data?.message || 'Submission failed'); },
  });

  if (!snap) return <div className="text-slate-500">Loading…</div>;
  const q = snap.questions[idx];
  const total = snap.questions.length;
  const answeredCount = Object.keys(responses).filter(k => responses[k] !== undefined && responses[k] !== null).length;

  function setResp(v: any) { setResponses((r) => ({ ...r, [q.id]: v })); }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{snap.test.title}</h1>
          <p className="text-sm text-slate-500">Question {idx + 1} of {total} · Answered {answeredCount}/{total}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {remaining !== null && (
            <div className={`px-3 py-1.5 rounded-lg font-mono font-semibold text-sm ${
              remaining < 60 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 animate-pulse'
              : remaining < 300 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}>
              ⏱ {formatTime(remaining)}
            </div>
          )}
          <div className="text-xs text-slate-500">Deadline: {new Date(snap.assignment.deadline).toLocaleString()}</div>
        </div>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
        <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <div className="card p-6 mt-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="badge bg-slate-100 text-slate-700">{q.type}</span>
          <span className="badge bg-blue-100 text-blue-800">{q.bloomLevel}</span>
          {q.topic && <span className="badge bg-emerald-50 text-emerald-700">{q.topic}</span>}
        </div>
        <div className="text-lg font-medium">{q.stem}</div>

        <div className="mt-5">
          {q.type === 'MULTIPLE_CHOICE' && (
            <ul className="space-y-2">
              {q.payload.options.map((opt: string, i: number) => (
                <li key={i}>
                  <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer hover:border-brand-500 ${responses[q.id]?.selectedIndex === i ? 'border-brand-500 bg-brand-50' : ''}`}>
                    <input type="radio" name={`q_${q.id}`} className="accent-brand-500"
                      checked={responses[q.id]?.selectedIndex === i}
                      onChange={() => setResp({ selectedIndex: i })} />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {q.type === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((v) => (
                <label key={String(v)} className={`flex items-center justify-center gap-2 border rounded-lg px-4 py-3 cursor-pointer hover:border-brand-500 ${responses[q.id]?.value === v ? 'border-brand-500 bg-brand-50' : ''}`}>
                  <input type="radio" name={`q_${q.id}`} className="accent-brand-500"
                    checked={responses[q.id]?.value === v}
                    onChange={() => setResp({ value: v })} />
                  {v ? 'True' : 'False'}
                </label>
              ))}
            </div>
          )}
          {(q.type === 'SHORT_ANSWER' || q.type === 'FILL_BLANK') && (
            <div>
              {q.type === 'FILL_BLANK' && q.payload?.template && (
                <div className="mb-2 text-sm text-slate-600 italic">{q.payload.template}</div>
              )}
              <input className="input" placeholder="Your answer…"
                value={responses[q.id]?.text || ''}
                onChange={(e) => setResp({ text: e.target.value })} />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}><ChevronLeft size={16}/> Previous</button>
        {idx < total - 1 ? (
          <button className="btn-primary" onClick={() => setIdx(i => i + 1)}>Next <ChevronRight size={16}/></button>
        ) : (
          <button className="btn-primary" disabled={submitting} onClick={() => { setSubmitting(true); submit.mutate(); }}>
            <Send size={16}/> {submitting ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {snap.questions.map((qq, i) => {
          const ans = responses[qq.id];
          const filled = ans !== undefined && ans !== null && (
            ans.selectedIndex !== undefined ||
            ans.value !== undefined ||
            (typeof ans.text === 'string' && ans.text.trim().length > 0)
          );
          return (
            <button key={qq.id} onClick={() => setIdx(i)}
              className={`w-9 h-9 rounded-lg text-xs font-medium ${i === idx ? 'bg-brand-500 text-white' : filled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
