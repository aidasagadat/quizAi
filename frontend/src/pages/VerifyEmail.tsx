import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

export default function VerifyEmail() {
  const { user, updateUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const nav = useNavigate();

  async function send() {
    if (!user) return;
    setSending(true);
    try {
      await api.post('/auth/otp/request', { email: user.email });
      toast.success('Code sent — check backend console in dev mode');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setVerifying(true);
    try {
      await api.post('/auth/otp/verify', { email: user.email, otp });
      updateUser({ emailVerified: true });
      toast.success('Email verified!');
      nav(user.role === 'TEACHER' ? '/teacher' : '/student');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Invalid code');
    } finally { setVerifying(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8 mt-4">
        <MailCheck className="text-brand-500 mb-2" size={32} />
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="text-sm text-slate-500 mt-1">
          We'll send a 6-digit code to <b>{user?.email}</b>.
        </p>

        <button onClick={send} disabled={sending} className="btn-ghost mt-4">
          {sending ? 'Sending…' : 'Send code'}
        </button>

        <form onSubmit={verify} className="mt-6">
          <label className="label">Verification code</label>
          <input className="input text-center text-lg font-mono tracking-widest" maxLength={6}
                 value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                 placeholder="••••••" />
          <button disabled={verifying || otp.length !== 6} className="btn-primary w-full mt-4">
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-4">
          In dev mode the code appears in your backend terminal. Production setup uses real email.
        </p>
      </div>
    </div>
  );
}
