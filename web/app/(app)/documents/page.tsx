'use client';

import { useState } from 'react';
import { api, apiDownload } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';
import { formatDate } from '../../../lib/utils';

type DocType =
  | 'UDID'
  | 'DISABILITY_CERT'
  | 'NIRAMAYA'
  | 'MEDICAL_REPORT'
  | 'SCHOOL_REPORT'
  | 'IEP_SNAPSHOT'
  | 'IDENTITY'
  | 'OTHER';

interface FamilyDocument {
  id: string;
  ownerId: string;
  childId: string | null;
  child?: { id: string; fullName: string } | null;
  owner?: { id: string; fullName: string };
  type: DocType;
  title: string;
  notes: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: string | null;
  createdAt: string;
}

interface ChildBrief {
  id: string;
  fullName: string;
}

const TYPE_META: Record<DocType, { label: string; emoji: string; note?: string }> = {
  UDID: { label: 'UDID card', emoji: '🪪', note: 'Unique Disability ID card issued under the RPWD Act' },
  DISABILITY_CERT: { label: 'Disability certificate', emoji: '📜' },
  NIRAMAYA: { label: 'Niramaya card', emoji: '🩹', note: 'National Trust health insurance policy' },
  MEDICAL_REPORT: { label: 'Medical report / letter', emoji: '🩺' },
  SCHOOL_REPORT: { label: 'School report', emoji: '📘' },
  IEP_SNAPSHOT: { label: 'IEP snapshot (PDF)', emoji: '📄' },
  IDENTITY: { label: 'Identity document', emoji: '👤' },
  OTHER: { label: 'Other document', emoji: '📎' },
};

const TYPE_ORDER: DocType[] = [
  'UDID',
  'DISABILITY_CERT',
  'NIRAMAYA',
  'MEDICAL_REPORT',
  'SCHOOL_REPORT',
  'IEP_SNAPSHOT',
  'IDENTITY',
  'OTHER',
];

export default function DocumentsPage() {
  const { data: docs = [], isLoading, error, mutate } = useApi<FamilyDocument[]>(
    '/documents',
  );
  const { data: children = [] } = useApi<ChildBrief[]>('/children');
  const [showUpload, setShowUpload] = useState(false);

  // Expiring-soon banner: any doc with expiresAt within the next 30 days.
  const soon = docs.filter(
    (d) =>
      d.expiresAt &&
      new Date(d.expiresAt).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000 &&
      new Date(d.expiresAt).getTime() > Date.now(),
  );

  // Group by type for display.
  const byType = TYPE_ORDER.map((t) => ({
    type: t,
    items: docs.filter((d) => d.type === t),
  })).filter((g) => g.items.length > 0);

  async function download(doc: FamilyDocument) {
    try {
      const blob = await apiDownload(`/documents/${doc.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed');
    }
  }

  async function remove(doc: FamilyDocument) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await api(`/documents/${doc.id}`, { method: 'DELETE' });
    await mutate();
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sage-500 text-sm uppercase tracking-wider">Vault</p>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
            Family documents
          </h1>
          <p className="text-sage-600 mt-2 max-w-2xl">
            One place for UDID, Niramaya, disability certificates, medical letters,
            and school reports. Shared with anyone you've added as a caregiver.
          </p>
        </div>
        <button onClick={() => setShowUpload((v) => !v)} className="btn-primary">
          {showUpload ? 'Cancel' : '+ Add document'}
        </button>
      </header>

      {soon.length > 0 && (
        <div className="card bg-coral-50 border-coral-200 text-coral-900">
          <div className="font-medium">
            ⏰ {soon.length} document{soon.length === 1 ? '' : 's'} expiring in the next 30 days
          </div>
          <ul className="text-sm mt-1.5 space-y-1">
            {soon.map((d) => (
              <li key={d.id}>
                <strong>{d.title}</strong> — expires {formatDate(d.expiresAt!)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showUpload && (
        <UploadForm
          children_={children}
          onDone={async () => {
            setShowUpload(false);
            await mutate();
          }}
        />
      )}

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={docs.length === 0}
        emptyTitle="No documents yet."
        emptyBody="Add your child's UDID or disability certificate first — they're the ones you need most often at appointments and schools."
        onRetry={() => mutate()}
      >
        <div className="space-y-6">
          {byType.map((g) => (
            <section key={g.type}>
              <h2 className="font-display text-2xl text-sage-900 mb-3 flex items-center gap-3">
                <span aria-hidden>{TYPE_META[g.type].emoji}</span>
                {TYPE_META[g.type].label}
                <span className="text-sm text-sage-500 font-normal">({g.items.length})</span>
              </h2>
              {TYPE_META[g.type].note && (
                <p className="text-xs text-sage-500 mb-3">{TYPE_META[g.type].note}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {g.items.map((d) => (
                  <article key={d.id} className="card">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sage-900 truncate">{d.title}</div>
                        <div className="text-xs text-sage-500 mt-0.5">
                          {(d.fileSize / 1024).toFixed(0)} KB · {d.mimeType}
                          {d.child && ` · for ${d.child.fullName}`}
                        </div>
                        {d.expiresAt && (
                          <div className="text-xs text-sage-500 mt-0.5">
                            Expires {formatDate(d.expiresAt)}
                          </div>
                        )}
                        {d.notes && (
                          <p className="text-sm text-sage-700 mt-2 line-clamp-2">
                            {d.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => download(d)}
                          className="btn-ghost text-xs"
                          title="Download"
                        >
                          ⬇
                        </button>
                        <button
                          onClick={() => remove(d)}
                          className="btn-ghost text-xs text-coral-700"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ApiState>
    </div>
  );
}

function UploadForm({
  children_,
  onDone,
}: {
  children_: ChildBrief[];
  onDone: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocType>('UDID');
  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErr('Please choose a file.');
      return;
    }
    if (!title.trim()) {
      setErr('Please give the document a title.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('title', title.trim());
      if (childId) fd.append('childId', childId);
      if (notes.trim()) fd.append('notes', notes.trim());
      if (expiresAt) fd.append('expiresAt', new Date(expiresAt).toISOString());
      await api('/documents', { method: 'POST', body: fd });
      await onDone();
    } catch (e: any) {
      setErr(e?.message ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 max-w-2xl">
      {err && (
        <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-3 text-sm">
          {err}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as DocType)}
          >
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].emoji} {TYPE_META[t].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">For which child? (optional)</label>
          <select
            className="input"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            <option value="">— My documents (not tied to a child) —</option>
            {children_.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Aanya's UDID card 2024"
          required
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Expiry date (optional)</label>
          <input
            type="date"
            className="input"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-sage-500 mt-1">
            You'll get a reminder 30 days before this date.
          </p>
        </div>
        <div>
          <label className="label">File (PDF or image, max 10 MB)</label>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="block w-full text-sm text-sage-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border file:border-sage-200 file:bg-cream-50 file:text-sage-800 hover:file:bg-sage-100"
          />
        </div>
      </div>
      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input min-h-[70px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Renewed at the district office in Bengaluru. Original with Amma."
        />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Uploading…' : 'Save document'}
        </button>
      </div>
    </form>
  );
}
