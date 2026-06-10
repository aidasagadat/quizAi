import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-full grid place-items-center p-6">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Forgot password</h1>

        {sent ? (
          <>
            <p className="text-sm text-slate-500 mt-4">
              If an account exists for <b>{email}</b>, a reset link has been sent.
            </p>
            <p className="text-xs text-slate-400 mt-3">
              (Dev mode: the link is printed to your backend console.)
            </p>
            <Link to="/login" className="btn-ghost w-full mt-6">Back to login</Link>
          </>
        ) : (
          <form onSubmit={handle}>
            <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send a reset link.</p>
            <div className="mt-6">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button disabled={loading} className="btn-primary w-full mt-6">{loading ? 'Sending…' : 'Send reset link'}</button>
            <p className="text-sm text-slate-500 mt-4 text-center">
              <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
