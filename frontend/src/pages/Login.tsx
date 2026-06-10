import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('teacher@demo.com');
  const [password, setPassword] = useState('Teacher#1234');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email, password });
      setSession(r.data.user, r.data.accessToken, r.data.refreshToken);
      toast.success(`Welcome, ${r.data.user.displayName}`);
      nav(r.data.user.role === 'TEACHER' ? '/teacher' : '/student');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-full grid place-items-center p-6">
      <form onSubmit={handle} className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back to QuizAI.</p>

        <div className="mt-6">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mt-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>

        <button disabled={loading} className="btn-primary w-full mt-6">{loading ? 'Signing in…' : 'Sign in'}</button>

        <div className="flex justify-end mt-4 text-sm">
          <Link to="/register" className="text-brand-600 hover:underline">Create account</Link>
        </div>
      </form>
    </main>
  );
}
