import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/register', { email, password, displayName, role });
      setSession(r.data.user, r.data.accessToken, r.data.refreshToken);
      toast.success(`Welcome, ${r.data.user.displayName}`);
      nav(r.data.user.role === 'TEACHER' ? '/teacher' : '/student');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-full grid place-items-center p-6">
      <form onSubmit={handle} className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-slate-500 mt-1">Start generating quizzes in minutes.</p>

        <div className="mt-6">
          <label className="label">I am a…</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole('TEACHER')}
              className={`btn ${role === 'TEACHER' ? 'btn-primary' : 'btn-ghost'}`}>Teacher</button>
            <button type="button" onClick={() => setRole('STUDENT')}
              className={`btn ${role === 'STUDENT' ? 'btn-primary' : 'btn-ghost'}`}>Student</button>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Display name</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} />
        </div>
        <div className="mt-4">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mt-4">
          <label className="label">Password (min 8 chars)</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>

        <button disabled={loading} className="btn-primary w-full mt-6">{loading ? 'Creating…' : 'Create account'}</button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Already registered? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
