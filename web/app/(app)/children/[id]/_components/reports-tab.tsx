'use client';

import { useState } from 'react';
import { api, apiDownload } from '../../../../../lib/api';
import { formatDate } from '../../../../../lib/utils';
import { ChildDetail } from './types';

export function ReportsTab({
  childId,
  reports,
  onChange,
}: {
  childId: string;
  reports: ChildDetail['diagnosticReports'];
  onChange: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Pick a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      if (description) fd.append('description', description);
      await api(`/children/${childId}/reports`, { method: 'POST', body: fd });
      setFile(null);
      setTitle('');
      setDescription('');
      // Clear the file input DOM element
      const el = document.getElementById('report-file') as HTMLInputElement | null;
      if (el) el.value = '';
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function view(r: ChildDetail['diagnosticReports'][number]) {
    setBusy(r.id);
    try {
      const blob = await apiDownload(`/reports/${r.id}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Give the new tab time to load, then release the blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open';
      alert(msg);
    } finally {
      setBusy(null);
    }
  }

  async function del(r: ChildDetail['diagnosticReports'][number]) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(r.id);
    try {
      await api(`/reports/${r.id}`, { method: 'DELETE' });
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete';
      alert(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={upload} className="card space-y-4">
        <div>
          <h3 className="font-display text-xl text-sage-900">Upload diagnostic report</h3>
          <p className="text-sm text-sage-600 mt-1">
            PDF, JPG, PNG, or WebP. Max 10 MB. Only caregivers can see these.
          </p>
        </div>
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="report-file">File</label>
          <input
            id="report-file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-sage-700 file:mr-3 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:bg-sage-100 file:text-sage-800 file:font-medium hover:file:bg-sage-200"
          />
        </div>
        <div>
          <label className="label">Title</label>
          <input
            required
            maxLength={200}
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Speech assessment at NIMHANS — Aug 2025"
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea
            rows={2}
            maxLength={1000}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Assessed by Dr. Rao; recommends 2x/week speech therapy."
          />
        </div>
        <button disabled={uploading || !file} className="btn-primary">
          {uploading ? 'Uploading…' : 'Upload report'}
        </button>
      </form>

      {reports.length === 0 ? (
        <div className="card text-center py-10 text-sage-500">
          No reports yet. Upload the first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card flex items-start gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-700 grid place-items-center text-xl flex-shrink-0">
                {r.mimeType === 'application/pdf' ? '📄' : '🖼️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sage-900">{r.title}</div>
                <div className="text-xs text-sage-500 mt-0.5 truncate">
                  {r.fileName} · {formatBytes(r.fileSize)} · uploaded{' '}
                  {formatDate(r.createdAt)}
                  {r.uploadedByName && ` by ${r.uploadedByName}`}
                </div>
                {r.description && (
                  <p className="text-sm text-sage-600 mt-2">{r.description}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => view(r)}
                  disabled={busy === r.id}
                  className="btn-ghost text-sm"
                >
                  {busy === r.id ? '…' : 'View'}
                </button>
                <button
                  onClick={() => del(r)}
                  disabled={busy === r.id}
                  className="btn-ghost text-sm text-coral-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
