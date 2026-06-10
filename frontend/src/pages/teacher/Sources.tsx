import { useRef, useState } from 'react';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, FileText, Trash2 } from 'lucide-react';

export default function Sources() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => (await api.get('/sources')).data,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return (await api.post('/sources/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => { toast.success('Uploaded'); qc.invalidateQueries({ queryKey: ['sources'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Upload failed'),
  });

  const pasteMut = useMutation({
    mutationFn: async () => (await api.post('/sources/text', { text })).data,
    onSuccess: () => { toast.success('Saved'); setText(''); qc.invalidateQueries({ queryKey: ['sources'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Save failed'),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/sources/${id}`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['sources'] }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Sources</h1>
      <p className="text-slate-500 mt-1">Upload PDF/DOCX or paste text to use as input for AI generation.</p>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="card p-6">
          <div className="font-medium flex items-center gap-2"><Upload size={18} /> Upload PDF or DOCX</div>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="mt-3 block w-full text-sm" />
          <button
            onClick={() => { const f = fileRef.current?.files?.[0]; if (f) uploadMut.mutate(f); else toast.error('Pick a file'); }}
            className="btn-primary mt-3" disabled={uploadMut.isPending}>
            {uploadMut.isPending ? 'Uploading…' : 'Upload'}
          </button>
          <p className="text-xs text-slate-500 mt-2">Max 15 MB.</p>
        </div>

        <div className="card p-6">
          <div className="font-medium flex items-center gap-2"><FileText size={18} /> Paste text</div>
          <textarea className="input mt-3 min-h-[140px]" placeholder="Paste a lesson, chapter, or notes…"
                    value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary mt-3" disabled={!text.trim() || pasteMut.isPending}
                  onClick={() => pasteMut.mutate()}>
            {pasteMut.isPending ? 'Saving…' : 'Save text'}
          </button>
        </div>
      </div>

      <div className="card mt-6">
        <div className="px-5 py-4 border-b font-medium">Your sources</div>
        {isLoading ? (
          <div className="p-5 text-slate-500 text-sm">Loading…</div>
        ) : !data?.length ? (
          <div className="p-5 text-slate-500 text-sm">No sources yet.</div>
        ) : (
          <ul className="divide-y">
            {data.map((s: any) => (
              <li key={s.id} className="flex justify-between items-center px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">{s.filename}</div>
                  <div className="text-slate-500 text-xs">{s.type} · {s.charCount} chars · {new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <button className="text-rose-600 hover:bg-rose-50 rounded-lg p-2" onClick={() => delMut.mutate(s.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
