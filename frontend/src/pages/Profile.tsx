import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { UserCircle2, MailCheck, KeyRound } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(r => {
      setDisplayName(r.data.displayName);
      setBio(r.data.bio || '');
      updateUser({ displayName: r.data.displayName, bio: r.data.bio, emailVerified: r.data.emailVerified });
    }).catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.patch('/users/me', { displayName, bio });
      updateUser({ displayName: r.data.displayName, bio: r.data.bio });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    if (next.length < 8) { toast.error('At least 8 characters'); return; }
    setPwLoading(true);
    try {
      await api.post('/users/me/change-password', { currentPassword: current, newPassword: next });
      toast.success('Password changed. Other sessions have been signed out.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Change failed');
    } finally { setPwLoading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="text-slate-500 mt-1">Manage your account.</p>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <form onSubmit={saveProfile} className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle2 size={40} className="text-slate-400" />
            <div>
              <div className="font-medium">{user?.displayName}</div>
              <div className="text-xs text-slate-500">{user?.email} · {user?.role}</div>
            </div>
          </div>

          <div>
            <label className="label">Display name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} required />
          </div>
          <div className="mt-3">
            <label className="label">Bio</label>
            <textarea className="input min-h-[100px]" maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)}
                      placeholder="A short description about you…" />
            <div className="text-xs text-slate-400 mt-1">{bio.length}/1000</div>
          </div>
          <button disabled={saving} className="btn-primary mt-4">{saving ? 'Saving…' : 'Save'}</button>
        </form>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <MailCheck size={18} className={user?.emailVerified ? 'text-emerald-600' : 'text-amber-600'} />
              <h2 className="font-medium">Email verification</h2>
            </div>
            {user?.emailVerified ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">Your email is verified.</p>
            ) : (
              <>
                <p className="text-sm text-slate-500 mt-2">Your email isn't verified yet.</p>
                <Link to={user?.role === 'TEACHER' ? '/verify-email' : '/student/verify-email'} className="btn-primary mt-3">Verify now</Link>
              </>
            )}
          </div>

          <form onSubmit={changePw} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} />
              <h2 className="font-medium">Change password</h2>
            </div>
            <div>
              <label className="label">Current password</label>
              <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="mt-3">
              <label className="label">New password</label>
              <input className="input" type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="mt-3">
              <label className="label">Confirm new password</label>
              <input className="input" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button disabled={pwLoading} className="btn-primary mt-4">{pwLoading ? 'Changing…' : 'Change password'}</button>
            <p className="text-xs text-slate-400 mt-2">Other devices will be signed out.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
