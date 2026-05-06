'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { formatDateTime } from '../../../../lib/utils';

interface Resource {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  category: string;
  language: 'EN' | 'HI' | 'TE' | 'TA' | 'KN' | 'ML' | 'BN' | 'MR' | 'GU';
  coverImage?: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

interface Scheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  benefitSummary?: string | null;
  eligibility?: string | null;
  applyUrl?: string | null;
  states: string[];
  language: Resource['language'];
  updatedAt: string;
}

const LANGS: Resource['language'][] = ['EN', 'HI', 'TE', 'TA', 'KN', 'ML', 'BN', 'MR', 'GU'];

export default function AdminCms() {
  const [tab, setTab] = useState<'resources' | 'schemes'>('resources');

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Admin</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">Content management</h1>
        <p className="mt-2 text-sage-600">
          Resources (parent guides, articles) and government schemes shown in the public catalog.
        </p>
      </header>

      <AdminTabs current="cms" />

      <div className="flex gap-2">
        <button
          onClick={() => setTab('resources')}
          className={
            'chip ' +
            (tab === 'resources'
              ? 'bg-sage-600 text-cream-50'
              : 'bg-sage-100 text-sage-700 hover:bg-sage-200')
          }
        >
          Resources
        </button>
        <button
          onClick={() => setTab('schemes')}
          className={
            'chip ' +
            (tab === 'schemes'
              ? 'bg-sage-600 text-cream-50'
              : 'bg-sage-100 text-sage-700 hover:bg-sage-200')
          }
        >
          Government schemes
        </button>
      </div>

      {tab === 'resources' ? <ResourcesPanel /> : <SchemesPanel />}
    </div>
  );
}

// ─── Resources panel ───────────────────────────────────────
function ResourcesPanel() {
  const [items, setItems] = useState<Resource[]>([]);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await api<Resource[]>('/admin/resources'));
    } catch (e: any) {
      setErr(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(form: any) {
    setErr(null);
    try {
      await api<Resource>('/admin/resources', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Save failed.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this resource permanently?')) return;
    try {
      await api(`/admin/resources/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Delete failed.');
    }
  }

  if (editing) {
    return (
      <ResourceForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={save}
        err={err}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sage-600 text-sm">
          {items.length} resource{items.length === 1 ? '' : 's'} total
        </p>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: '',
              slug: '',
              title: '',
              body: '',
              category: 'autism-guides',
              language: 'EN',
              publishedAt: null,
              updatedAt: '',
            })
          }
          className="btn-primary text-sm"
        >
          + New resource
        </button>
      </div>

      {err && <div className="card bg-coral-50 border-coral-200 text-coral-800">{err}</div>}

      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : items.length === 0 ? (
        <div className="card text-sage-500 text-center py-10">No resources yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-sage-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Lang</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-100">
              {items.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-sage-900">{r.title}</div>
                    <div className="text-xs text-sage-500 truncate max-w-[16rem]">/{r.slug}</div>
                  </td>
                  <td className="py-3 pr-4 text-sage-700 capitalize">{r.category.replace('-', ' ')}</td>
                  <td className="py-3 pr-4 text-sage-700">{r.language}</td>
                  <td className="py-3 pr-4">
                    {r.publishedAt ? (
                      <span className="chip bg-sage-100 text-sage-800 text-xs">Published</span>
                    ) : (
                      <span className="chip bg-cream-200 text-sage-700 text-xs">Draft</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sage-600">{formatDateTime(r.updatedAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(r)} className="btn-ghost text-xs">Edit</button>
                      <Link href={`/resources/${r.slug}`} target="_blank" className="btn-ghost text-xs">View</Link>
                      <button onClick={() => remove(r.id)} className="btn-coral text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ResourceForm({
  initial,
  onCancel,
  onSave,
  err,
}: {
  initial: Resource;
  onCancel: () => void;
  onSave: (form: any) => Promise<void>;
  err: string | null;
}) {
  const [form, setForm] = useState({
    slug: initial.slug,
    title: initial.title,
    excerpt: initial.excerpt ?? '',
    body: initial.body,
    category: initial.category,
    language: initial.language,
    coverImage: initial.coverImage ?? '',
    publish: !!initial.publishedAt,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        excerpt: form.excerpt || undefined,
        coverImage: form.coverImage || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-display text-2xl text-sage-900">
        {initial.id ? 'Edit resource' : 'New resource'}
      </h2>
      {err && <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <input className="input" value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required pattern="[a-z0-9-]+" placeholder="autism-101"
            disabled={!!initial.id}
          />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="autism-guides, home-therapy…" required />
        </div>
        <div>
          <label className="label">Language</label>
          <select className="input" value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as any })}>
            {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Excerpt (optional, shows on cards)</label>
        <input className="input" value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={500} />
      </div>

      <div>
        <label className="label">Body (markdown)</label>
        <textarea
          className="input font-mono text-sm"
          rows={14}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          placeholder={'# Heading\n\nLorem ipsum…\n\n- bullet\n- bullet\n'}
        />
      </div>

      <label className="flex items-center gap-3 text-sage-700 select-none">
        <input
          type="checkbox"
          checked={form.publish}
          onChange={(e) => setForm({ ...form, publish: e.target.checked })}
          className="w-5 h-5 rounded border-sage-300"
        />
        Publish (visible to public)
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

// ─── Schemes panel ─────────────────────────────────────────
function SchemesPanel() {
  const [items, setItems] = useState<Scheme[]>([]);
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await api<Scheme[]>('/admin/schemes'));
    } catch (e: any) {
      setErr(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(form: any) {
    setErr(null);
    try {
      await api<Scheme>('/admin/schemes', { method: 'POST', body: JSON.stringify(form) });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Save failed.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this scheme?')) return;
    try {
      await api(`/admin/schemes/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Delete failed.');
    }
  }

  if (editing) {
    return (
      <SchemeForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={save}
        err={err}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sage-600 text-sm">{items.length} scheme{items.length === 1 ? '' : 's'} listed</p>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: '',
              slug: '',
              name: '',
              description: '',
              states: [],
              language: 'EN',
              updatedAt: '',
            })
          }
          className="btn-primary text-sm"
        >
          + New scheme
        </button>
      </div>

      {err && <div className="card bg-coral-50 border-coral-200 text-coral-800">{err}</div>}

      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : items.length === 0 ? (
        <div className="card text-sage-500 text-center py-10">No schemes yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg text-sage-900">{s.name}</h3>
                <span className="chip bg-sage-50 text-sage-700 text-xs">{s.language}</span>
              </div>
              {s.benefitSummary && (
                <p className="text-sm text-sage-700 mt-2 line-clamp-2">{s.benefitSummary}</p>
              )}
              {s.states.length > 0 && (
                <p className="text-xs text-sage-500 mt-2">
                  {s.states.length === 1 && s.states[0] === 'ALL'
                    ? 'All India'
                    : s.states.join(', ')}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditing(s)} className="btn-ghost text-xs">Edit</button>
                <button onClick={() => remove(s.id)} className="btn-coral text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemeForm({
  initial,
  onCancel,
  onSave,
  err,
}: {
  initial: Scheme;
  onCancel: () => void;
  onSave: (form: any) => Promise<void>;
  err: string | null;
}) {
  const [form, setForm] = useState({
    slug: initial.slug,
    name: initial.name,
    description: initial.description,
    benefitSummary: initial.benefitSummary ?? '',
    eligibility: initial.eligibility ?? '',
    applyUrl: initial.applyUrl ?? '',
    states: initial.states.join(', '),
    language: initial.language,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        benefitSummary: form.benefitSummary || undefined,
        eligibility: form.eligibility || undefined,
        applyUrl: form.applyUrl || undefined,
        states: form.states.split(',').map((s) => s.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-display text-2xl text-sage-900">
        {initial.id ? 'Edit scheme' : 'New scheme'}
      </h2>
      {err && <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required pattern="[a-z0-9-]+" disabled={!!initial.id} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div>
          <label className="label">Benefit summary</label>
          <input className="input" value={form.benefitSummary}
            onChange={(e) => setForm({ ...form, benefitSummary: e.target.value })} />
        </div>
        <div>
          <label className="label">Eligibility</label>
          <input className="input" value={form.eligibility}
            onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
        </div>
        <div>
          <label className="label">Apply URL (https://…)</label>
          <input className="input" value={form.applyUrl}
            onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
            type="url" />
        </div>
        <div>
          <label className="label">States (comma-separated, or "ALL")</label>
          <input className="input" value={form.states}
            onChange={(e) => setForm({ ...form, states: e.target.value })}
            placeholder="Karnataka, Tamil Nadu" />
        </div>
        <div>
          <label className="label">Language</label>
          <select className="input" value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as any })}>
            {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

function AdminTabs({ current }: { current: string }) {
  const tabs = [
    { id: 'overview', label: 'Overview', href: '/admin' },
    { id: 'users', label: 'Users', href: '/admin/users' },
    { id: 'moderation', label: 'Moderation', href: '/admin/moderation' },
    { id: 'cms', label: 'CMS', href: '/admin/cms' },
  ];
  return (
    <nav className="flex gap-1 border-b border-sage-100 -mb-2 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (active
                ? 'border-coral-500 text-sage-900'
                : 'border-transparent text-sage-600 hover:text-sage-900')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
