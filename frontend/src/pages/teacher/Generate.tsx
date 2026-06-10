import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const BLOOM = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
] as const;

const TYPES = [
  { v: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { v: "TRUE_FALSE", label: "True / False" },
  { v: "SHORT_ANSWER", label: "Short Answer" },
  { v: "FILL_BLANK", label: "Fill in the Blank" },
] as const;

const DIFFICULTIES = [
  { v: "EASY", label: "Easy", color: "bg-emerald-100 text-emerald-800" },
  { v: "MEDIUM", label: "Medium", color: "bg-amber-100 text-amber-800" },
  { v: "HARD", label: "Hard", color: "bg-rose-100 text-rose-800" },
] as const;

type QType = (typeof TYPES)[number]["v"];
type Difficulty = (typeof DIFFICULTIES)[number]["v"];

// counts[type][difficulty] = number
type CountGrid = Record<QType, Record<Difficulty, number>>;

function emptyGrid(): CountGrid {
  const grid = {} as CountGrid;
  for (const t of TYPES) {
    grid[t.v] = { EASY: 0, MEDIUM: 0, HARD: 0 };
  }
  return grid;
}

export default function Generate() {
  const qc = useQueryClient();
  const [sourceId, setSourceId] = useState("");
  const [rawText, setRawText] = useState("");
  const [counts, setCounts] = useState<CountGrid>(emptyGrid);
  const [bloomLevels, setBlooms] = useState<string[]>([
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
  ]);
  const [topicHint, setTopic] = useState("");
  const [generated, setGenerated] = useState<any[]>([]);

  const { data: sources } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => (await api.get("/sources")).data,
  });

  function toggleBloom(b: string) {
    setBlooms((curr) =>
      curr.includes(b) ? curr.filter((x) => x !== b) : [...curr, b]
    );
  }

  function setCount(type: QType, diff: Difficulty, val: number) {
    setCounts((prev) => ({
      ...prev,
      [type]: { ...prev[type], [diff]: Math.max(0, val) },
    }));
  }

  const totalCount = TYPES.reduce(
    (sum, t) => sum + DIFFICULTIES.reduce((s, d) => s + counts[t.v][d.v], 0),
    0
  );

  const gen = useMutation({
    mutationFn: async () => {
      if (!sourceId && !rawText.trim())
        throw new Error("Pick a source or paste text");
      if (totalCount === 0) throw new Error("Set at least one question count");
      if (!bloomLevels.length)
        throw new Error("Select at least one Bloom level");

      // Build one job per (type, difficulty) cell that has count > 0
      const jobs: Promise<any[]>[] = [];
      for (const t of TYPES) {
        for (const d of DIFFICULTIES) {
          const n = counts[t.v][d.v];
          if (n === 0) continue;
          jobs.push(
            api
              .post("/questions/generate", {
                type: t.v,
                count: n,
                bloomLevels,
                difficulty: d.v,
                topicHint: topicHint || undefined,
                ...(sourceId ? { sourceId } : { rawText: rawText.trim() }),
              })
              .then((r) => r.data)
          );
        }
      }

      const results = await Promise.all(jobs);
      return results.flat();
    },
    onSuccess: (data) => {
      setGenerated(data);
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success(
        `Generated ${data.length} draft question${data.length === 1 ? "" : "s"}`
      );
    },
    onError: (e: any) =>
      toast.error(
        e.response?.data?.message || e.message || "Generation failed"
      ),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Sparkles className="text-brand-600" /> AI Generation
      </h1>
      <p className="text-slate-500 mt-1">
        Set how many questions to generate per type and difficulty. All generate
        in one go.
      </p>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 card p-6 space-y-5">
          {/* Source */}
          <div>
            <label className="label">Source material</label>
            <select
              className="input"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">— Paste text below —</option>
              {sources?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.filename} ({s.type})
                </option>
              ))}
            </select>
          </div>
          {!sourceId && (
            <div>
              <label className="label">Paste text (≥ 50 chars)</label>
              <textarea
                className="input min-h-[120px]"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the chapter, lesson notes, or any text…"
              />
            </div>
          )}

          {/* Question count grid */}
          <div>
            <label className="label">Questions to generate</label>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-slate-500 font-medium">
                      Type
                    </th>
                    {DIFFICULTIES.map((d) => (
                      <th key={d.v} className="py-2 px-3 text-center">
                        <span className={`badge ${d.color}`}>{d.label}</span>
                      </th>
                    ))}
                    <th className="py-2 px-3 text-center text-slate-500 font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TYPES.map((t) => {
                    const rowTotal = DIFFICULTIES.reduce(
                      (s, d) => s + counts[t.v][d.v],
                      0
                    );
                    return (
                      <tr key={t.v} className="border-t border-slate-100">
                        <td className="py-2 pr-4 font-medium text-slate-700">
                          {t.label}
                        </td>
                        {DIFFICULTIES.map((d) => (
                          <td key={d.v} className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              className="input w-20 text-center"
                              value={counts[t.v][d.v]}
                              onChange={(e) =>
                                setCount(t.v, d.v, Number(e.target.value))
                              }
                            />
                          </td>
                        ))}
                        <td className="py-2 px-3 text-center font-semibold text-slate-700">
                          {rowTotal > 0 ? (
                            rowTotal
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-200">
                    <td className="py-2 pr-4 font-semibold text-slate-700">
                      Total
                    </td>
                    {DIFFICULTIES.map((d) => {
                      const colTotal = TYPES.reduce(
                        (s, t) => s + counts[t.v][d.v],
                        0
                      );
                      return (
                        <td
                          key={d.v}
                          className="py-2 px-3 text-center font-semibold text-slate-700"
                        >
                          {colTotal > 0 ? (
                            colTotal
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center font-bold text-brand-600 text-base">
                      {totalCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloom's Taxonomy */}
          <div>
            <label className="label">Bloom's Taxonomy levels</label>
            <div className="flex flex-wrap gap-2">
              {BLOOM.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBloom(b)}
                  className={`badge px-3 py-1 cursor-pointer ${
                    bloomLevels.includes(b)
                      ? "bg-brand-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pick one or more. Questions will be distributed across chosen
              levels.
            </p>
          </div>

          {/* Topic hint */}
          <div>
            <label className="label">Topic hint (optional)</label>
            <input
              className="input"
              value={topicHint}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. cell biology, World War II, photosynthesis…"
            />
          </div>

          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending || totalCount === 0 || !bloomLevels.length}
            className="btn-primary"
          >
            {gen.isPending
              ? `Generating ${totalCount} questions…`
              : `Generate ${totalCount} questions`}
          </button>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-medium">Tips</h3>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
            <li>Mix types freely — set any cell to 0 to skip it.</li>
            <li>Short, focused sources produce sharper questions.</li>
            <li>
              All generated questions are saved as <strong>Drafts</strong>.
            </li>
            <li>
              Go to the{" "}
              <Link
                to="/teacher/questions"
                className="text-brand-600 hover:underline"
              >
                Question Bank
              </Link>{" "}
              to review and accept them.
            </li>
            <li>
              When building a test, accepted questions are auto-selected by
              difficulty — no manual picking needed.
            </li>
          </ul>
          <hr />
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex gap-2">
              <span className="badge bg-emerald-100 text-emerald-800">
                Easy
              </span>{" "}
              Remember & Understand
            </div>
            <div className="flex gap-2">
              <span className="badge bg-amber-100 text-amber-800">Medium</span>{" "}
              Apply & Analyze
            </div>
            <div className="flex gap-2">
              <span className="badge bg-rose-100 text-rose-800">Hard</span>{" "}
              Evaluate & Create
            </div>
          </div>
        </div>
      </div>

      {generated.length > 0 && (
        <div className="card mt-8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Generated {generated.length} drafts
            </h2>
            <Link to="/teacher/questions" className="btn-ghost text-brand-600">
              Review in Question Bank →
            </Link>
          </div>

          <div className="flex gap-3 mt-3 flex-wrap">
            {DIFFICULTIES.map((d) => {
              const c = generated.filter((q) => q.difficulty === d.v).length;
              if (!c) return null;
              return (
                <span key={d.v} className={`badge ${d.color}`}>
                  {c} {d.label}
                </span>
              );
            })}
            {TYPES.map((t) => {
              const c = generated.filter((q) => q.type === t.v).length;
              if (!c) return null;
              return (
                <span key={t.v} className="badge bg-slate-200 text-slate-700">
                  {c} {t.label}
                </span>
              );
            })}
          </div>

          <ul className="mt-4 space-y-3">
            {generated.map((q, i) => (
              <li key={q.id} className="border rounded-xl p-4 bg-slate-50">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="badge bg-amber-100 text-amber-800">
                    DRAFT
                  </span>
                  <span
                    className={`badge ${
                      DIFFICULTIES.find((d) => d.v === q.difficulty)?.color ||
                      "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                  <span className="badge bg-slate-200 text-slate-700">
                    {q.type}
                  </span>
                  <span className="badge bg-blue-100 text-blue-800">
                    {q.bloomLevel}
                  </span>
                  {q.topic && (
                    <span className="badge bg-emerald-100 text-emerald-800">
                      {q.topic}
                    </span>
                  )}
                </div>
                <div className="font-medium">
                  {i + 1}. {q.stem}
                </div>
                <RenderPayload q={q} />
                {q.explanation && (
                  <div className="text-xs text-slate-500 mt-2">
                    💡 {q.explanation}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RenderPayload({ q }: { q: any }) {
  if (q.type === "MULTIPLE_CHOICE") {
    return (
      <ol className="mt-2 space-y-1 text-sm pl-5 list-[upper-alpha]">
        {q.payload.options.map((o: string, idx: number) => (
          <li
            key={idx}
            className={
              idx === q.payload.correctIndex
                ? "text-emerald-700 font-medium"
                : ""
            }
          >
            {o} {idx === q.payload.correctIndex && "✓"}
          </li>
        ))}
      </ol>
    );
  }
  if (q.type === "TRUE_FALSE")
    return (
      <div className="mt-2 text-sm text-emerald-700">
        Answer: {q.payload.correct ? "True" : "False"}
      </div>
    );
  return (
    <div className="mt-2 text-sm text-emerald-700">
      Accepted: {(q.payload.acceptableAnswers || []).join(" / ")}
    </div>
  );
}

// import { useState } from 'react';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import api from '@/lib/api';
// import toast from 'react-hot-toast';
// import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
// import { Link } from 'react-router-dom';

// const TYPES = [
//   { v: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
//   { v: 'TRUE_FALSE',      label: 'True / False' },
//   { v: 'SHORT_ANSWER',    label: 'Short answer' },
//   { v: 'FILL_BLANK',      label: 'Fill in the blank' },
// ] as const;

// const DIFFICULTIES = [
//   { v: 'EASY',   label: 'Easy',   color: 'bg-emerald-100 text-emerald-800', desc: 'Remember & Understand' },
//   { v: 'MEDIUM', label: 'Medium', color: 'bg-amber-100 text-amber-800',     desc: 'Apply & Analyze' },
//   { v: 'HARD',   label: 'Hard',   color: 'bg-rose-100 text-rose-800',       desc: 'Evaluate & Create' },
// ] as const;

// type Difficulty = typeof DIFFICULTIES[number]['v'];

// export default function Generate() {
//   const qc = useQueryClient();
//   const [sourceId, setSourceId] = useState<string>('');
//   const [rawText, setRawText] = useState('');
//   const [type, setType] = useState<typeof TYPES[number]['v']>('MULTIPLE_CHOICE');
//   const [counts, setCounts] = useState<Record<Difficulty, number>>({ EASY: 5, MEDIUM: 5, HARD: 0 });
//   const [topicHint, setTopic] = useState('');
//   const [generated, setGenerated] = useState<any[]>([]);

//   const { data: sources } = useQuery({
//     queryKey: ['sources'], queryFn: async () => (await api.get('/sources')).data,
//   });

//   const totalCount = counts.EASY + counts.MEDIUM + counts.HARD;

//   const gen = useMutation({
//     mutationFn: async () => {
//       if (!sourceId && !rawText.trim()) throw new Error('Pick a source or paste text');
//       if (totalCount === 0) throw new Error('Set at least one question count');

//       // Generate each difficulty in parallel (skip if count is 0)
//       const jobs = DIFFICULTIES.filter(d => counts[d.v] > 0).map(d =>
//         api.post('/questions/generate', {
//           type,
//           count: counts[d.v],
//           bloomLevels: d.v === 'EASY' ? ['REMEMBER', 'UNDERSTAND'] : d.v === 'MEDIUM' ? ['APPLY', 'ANALYZE'] : ['EVALUATE', 'CREATE'],
//           difficulty: d.v,
//           topicHint: topicHint || undefined,
//           ...(sourceId ? { sourceId } : { rawText: rawText.trim() }),
//         }).then(r => r.data)
//       );

//       const results = await Promise.all(jobs);
//       return results.flat();
//     },
//     onSuccess: (data) => {
//       setGenerated(data);
//       qc.invalidateQueries({ queryKey: ['questions'] });
//       toast.success(`Generated ${data.length} draft question${data.length === 1 ? '' : 's'}`);
//     },
//     onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Generation failed'),
//   });

//   return (
//     <div>
//       <h1 className="text-2xl font-semibold flex items-center gap-2">
//         <Sparkles className="text-brand-600" /> AI Generation
//       </h1>
//       <p className="text-slate-500 mt-1">
//         Choose how many easy, medium, and hard questions to generate. Questions go to your bank — review and accept them before adding to a test.
//       </p>

//       <div className="grid lg:grid-cols-3 gap-4 mt-6">
//         <div className="lg:col-span-2 card p-6 space-y-5">

//           {/* Source */}
//           <div>
//             <label className="label">Source material</label>
//             <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
//               <option value="">— Paste text below —</option>
//               {sources?.map((s: any) => (
//                 <option key={s.id} value={s.id}>{s.filename} ({s.type})</option>
//               ))}
//             </select>
//           </div>
//           {!sourceId && (
//             <div>
//               <label className="label">Paste text (≥ 50 chars)</label>
//               <textarea className="input min-h-[120px]" value={rawText} onChange={(e) => setRawText(e.target.value)}
//                 placeholder="Paste the chapter, lesson notes, or any text…" />
//             </div>
//           )}

//           {/* Question type */}
//           <div>
//             <label className="label">Question type</label>
//             <select className="input max-w-xs" value={type} onChange={(e) => setType(e.target.value as any)}>
//               {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
//             </select>
//           </div>

//           {/* Difficulty counts */}
//           <div>
//             <label className="label">How many questions per difficulty?</label>
//             <div className="grid sm:grid-cols-3 gap-3 mt-2">
//               {DIFFICULTIES.map(d => (
//                 <div key={d.v} className="border rounded-xl p-4">
//                   <div className="flex items-center justify-between mb-2">
//                     <span className={`badge ${d.color} font-medium`}>{d.label}</span>
//                     <span className="text-xs text-slate-500">{d.desc}</span>
//                   </div>
//                   <input
//                     type="number" min={0} max={50} className="input text-center text-lg font-semibold"
//                     value={counts[d.v]}
//                     onChange={(e) => setCounts(c => ({ ...c, [d.v]: Math.max(0, Number(e.target.value)) }))}
//                   />
//                 </div>
//               ))}
//             </div>
//             <p className="text-xs text-slate-500 mt-2">
//               Total: <strong>{totalCount}</strong> questions to generate
//             </p>
//           </div>

//           {/* Topic hint */}
//           <div>
//             <label className="label">Topic hint (optional)</label>
//             <input className="input" value={topicHint} onChange={(e) => setTopic(e.target.value)}
//               placeholder="e.g. cell biology, World War II, photosynthesis…" />
//           </div>

//           <button onClick={() => gen.mutate()} disabled={gen.isPending || totalCount === 0} className="btn-primary">
//             {gen.isPending ? `Generating ${totalCount} questions…` : `Generate ${totalCount} questions`}
//           </button>
//         </div>

//         <div className="card p-6 space-y-4">
//           <h3 className="font-medium">How it works</h3>
//           <ul className="text-sm text-slate-600 space-y-3">
//             <li className="flex gap-2"><span className="badge bg-emerald-100 text-emerald-800 shrink-0">Easy</span> Tests basic recall and comprehension.</li>
//             <li className="flex gap-2"><span className="badge bg-amber-100 text-amber-800 shrink-0">Medium</span> Tests application and analysis.</li>
//             <li className="flex gap-2"><span className="badge bg-rose-100 text-rose-800 shrink-0">Hard</span> Tests critical thinking and creation.</li>
//           </ul>
//           <hr />
//           <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
//             <li>All generated questions are saved as <strong>Drafts</strong>.</li>
//             <li>Go to the <Link to="/teacher/questions" className="text-brand-600 hover:underline">Question Bank</Link> to review and accept them.</li>
//             <li>When building a test, accepted questions are auto-selected by difficulty — no manual picking needed.</li>
//           </ul>
//         </div>
//       </div>

//       {generated.length > 0 && (
//         <div className="card mt-8 p-6">
//           <div className="flex items-center justify-between">
//             <h2 className="font-medium flex items-center gap-2">
//               <CheckCircle2 size={18} className="text-emerald-600" />
//               Generated {generated.length} drafts
//             </h2>
//             <Link to="/teacher/questions" className="btn-ghost text-brand-600">Review in Question Bank →</Link>
//           </div>

//           {/* Summary by difficulty */}
//           <div className="flex gap-3 mt-3 flex-wrap">
//             {DIFFICULTIES.map(d => {
//               const c = generated.filter(q => q.difficulty === d.v).length;
//               if (!c) return null;
//               return <span key={d.v} className={`badge ${d.color}`}>{c} {d.label}</span>;
//             })}
//           </div>

//           <ul className="mt-4 space-y-3">
//             {generated.map((q, i) => (
//               <li key={q.id} className="border rounded-xl p-4 bg-slate-50">
//                 <div className="flex flex-wrap items-center gap-2 mb-2">
//                   <span className="badge bg-amber-100 text-amber-800">DRAFT</span>
//                   <span className={`badge ${DIFFICULTIES.find(d => d.v === q.difficulty)?.color || 'bg-slate-200 text-slate-700'}`}>
//                     {q.difficulty}
//                   </span>
//                   <span className="badge bg-slate-200 text-slate-700">{q.type}</span>
//                   {q.topic && <span className="badge bg-blue-100 text-blue-800">{q.topic}</span>}
//                 </div>
//                 <div className="font-medium">{i + 1}. {q.stem}</div>
//                 <RenderPayload q={q} />
//                 {q.explanation && <div className="text-xs text-slate-500 mt-2">💡 {q.explanation}</div>}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

// function RenderPayload({ q }: { q: any }) {
//   if (q.type === 'MULTIPLE_CHOICE') {
//     return (
//       <ol className="mt-2 space-y-1 text-sm pl-5 list-[upper-alpha]">
//         {q.payload.options.map((o: string, idx: number) => (
//           <li key={idx} className={idx === q.payload.correctIndex ? 'text-emerald-700 font-medium' : ''}>
//             {o} {idx === q.payload.correctIndex && '✓'}
//           </li>
//         ))}
//       </ol>
//     );
//   }
//   if (q.type === 'TRUE_FALSE') return <div className="mt-2 text-sm text-emerald-700">Answer: {q.payload.correct ? 'True' : 'False'}</div>;
//   return <div className="mt-2 text-sm text-emerald-700">Accepted: {(q.payload.acceptableAnswers || []).join(' / ')}</div>;
// }
