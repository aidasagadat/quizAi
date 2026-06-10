import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (!token) { toast.error('Missing token'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Password reset. Please sign in.');
      nav('/login');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-full grid place-items-center p-6">
      <form onSubmit={handle} className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-slate-500 mt-1">Pick a new password.</p>

        <div className="mt-6">
          <label className="label">New password</label>
          <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="mt-4">
          <label className="label">Confirm password</label>
          <input className="input" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>

        <button disabled={loading} className="btn-primary w-full mt-6">{loading ? 'Resetting…' : 'Reset password'}</button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </main>
  );
}
