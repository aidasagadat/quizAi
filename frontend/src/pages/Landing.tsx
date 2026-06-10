import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, FileText } from 'lucide-react';

export default function Landing() {
  const features = [
    { icon: Sparkles, title: 'AI-generated questions', desc: 'MCQ, true/false, short answer, fill-in-the-blank — aligned to Bloom\'s Taxonomy.' },
    { icon: FileText, title: 'Upload PDF or DOCX', desc: 'Drop in your teaching material and generate a quiz in seconds.' },
    { icon: ShieldCheck, title: 'You\'re always in control', desc: 'Every AI question is a draft until you accept it.' },
    { icon: BarChart3, title: 'Built-in analytics', desc: 'Group-level scores, per-question difficulty, weak topics.' },
  ];

  return (
    <main className="min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-500 text-white grid place-items-center font-bold">Q</div>
          <span className="text-xl font-semibold">QuizAI</span>
        </div>

        <h1 className="text-5xl font-semibold tracking-tight leading-tight">
          Turn any teaching material<br />into a great quiz, in seconds.
        </h1>
        <p className="text-slate-600 mt-4 max-w-xl text-lg">
          AI-powered quiz generation for teachers, with a built-in student module for online testing, results, and recommendations.
        </p>

        <div className="mt-8 flex gap-3">
          <Link to="/register" className="btn-primary">Get started</Link>
          <Link to="/login" className="btn-ghost">Sign in</Link>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.title} className="card p-5">
              <f.icon className="text-brand-600" />
              <div className="font-medium mt-3">{f.title}</div>
              <p className="text-sm text-slate-600 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-sm text-slate-500">
          Demo accounts after running <code className="bg-slate-100 rounded px-1.5 py-0.5">pnpm db:seed</code> (or npm equivalent):{' '}
          <span className="font-mono">teacher@demo.com / Teacher#1234</span> ·{' '}
          <span className="font-mono">student@demo.com / Student#1234</span>
        </div>
      </div>
    </main>
  );
}
