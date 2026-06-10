import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Trophy, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

export default function Result() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['result', attemptId], enabled: !!attemptId,
    queryFn: async () => (await api.get(`/attempts/${attemptId}/result`)).data,
  });

  if (isLoading || !data) return <div className="text-slate-500">Loading…</div>;

  const pct = Math.round((data.score || 0) * 100);
  const weakTopics: any[] = [];
  const topicMap: Record<string, { c: number; t: number }> = {};
  for (const a of data.answers) {
    const t = a.topic || 'general';
    topicMap[t] = topicMap[t] || { c: 0, t: 0 };
    topicMap[t].t++;
    if (a.status === 'CORRECT') topicMap[t].c++;
  }
  for (const [topic, v] of Object.entries(topicMap)) {
    const acc = v.c / v.t;
    if (acc < 0.7) weakTopics.push({ topic, acc, total: v.t });
  }
  const recs: string[] = weakTopics
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5)
    .map((w) => `Review "${w.topic}" — ${Math.round(w.acc * 100)}% correct.`);
  if (!recs.length) recs.push('Strong performance — keep practicing to stay sharp!');

  return (
    <div>
      <div className="card p-6 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full grid place-items-center ${pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
          <Trophy size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{data.testTitle}</h1>
          <div className="text-sm text-slate-500 mt-0.5">
            Score: <span className="font-medium">{data.earned}/{data.total}</span> · Time: {data.timeSpentSec}s
          </div>
        </div>
        <div className="text-3xl font-semibold">{pct}%</div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="font-medium flex items-center gap-2"><Lightbulb size={18} className="text-amber-500"/> Recommendations</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recs.map((r, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{r}</li>)}
        </ul>
      </div>

      <div className="mt-6 space-y-3">
        <h2 className="font-medium">Per-question review</h2>
        {data.answers.map((a: any, i: number) => (
          <div key={a.questionId} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {a.status === 'CORRECT' ? <CheckCircle2 className="text-emerald-600"/> : <XCircle className="text-rose-600"/>}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                  <span className="badge bg-slate-100 text-slate-700">{a.type}</span>
                  <span className="badge bg-blue-100 text-blue-800">{a.bloomLevel}</span>
                  {a.topic && <span className="badge bg-emerald-50 text-emerald-700">{a.topic}</span>}
                </div>
                <div className="font-medium">{i + 1}. {a.stem}</div>
                <ReviewAnswer a={a} />
                {a.explanation && <div className="text-xs text-slate-500 mt-2">💡 {a.explanation}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Link to="/student" className="btn-ghost">Back to my quizzes</Link>
        <Link to="/student/progress" className="btn-primary">View my progress</Link>
      </div>
    </div>
  );
}

function ReviewAnswer({ a }: { a: any }) {
  if (a.type === 'MULTIPLE_CHOICE') {
    const correctIdx = a.correctPayload?.correctIndex;
    const opts = a.correctPayload?.options || [];
    const selected = a.response?.selectedIndex;
    return (
      <ol className="mt-2 space-y-1 text-sm pl-5 list-[upper-alpha]">
        {opts.map((o: string, i: number) => {
          const isCorrect = i === correctIdx;
          const isSelected = i === selected;
          return (
            <li key={i} className={
              isCorrect ? 'text-emerald-700 font-medium' :
              (isSelected && !isCorrect) ? 'text-rose-700 line-through' : ''
            }>
              {o} {isCorrect ? '✓' : isSelected ? '✗ (your answer)' : ''}
            </li>
          );
        })}
      </ol>
    );
  }
  if (a.type === 'TRUE_FALSE') {
    const correct = a.correctPayload?.correct;
    return (
      <div className="mt-2 text-sm">
        Your answer: <b>{String(a.response?.value)}</b> · Correct: <b className="text-emerald-700">{String(correct)}</b>
      </div>
    );
  }
  return (
    <div className="mt-2 text-sm">
      Your answer: <b>{a.response?.text || '(blank)'}</b><br />
      Accepted: <span className="text-emerald-700">{(a.correctPayload?.acceptableAnswers || []).join(' / ')}</span>
    </div>
  );
}
