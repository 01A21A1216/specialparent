'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { formatDate } from '../../../../../lib/utils';
import { ChildDetail, DOMAIN_LABEL, STATUS_TONE } from './types';

export function MilestonesTab({
  childId,
  milestones,
  onChange,
}: {
  childId: string;
  milestones: ChildDetail['milestones'];
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [domain, setDomain] = useState('COMMUNICATION');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/milestones', {
        method: 'POST',
        body: { childId, domain, title },
      });
      setTitle('');
      setAdding(false);
      await onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/milestones/${id}`, { method: 'PATCH', body: { status } });
    await onChange();
  }

  const grouped = milestones.reduce<Record<string, typeof milestones>>((acc, m) => {
    (acc[m.domain] ??= []).push(m);
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sage-600">Track development across communication, social, motor, and more.</p>
        <button onClick={() => setAdding((a) => !a)} className="btn-secondary">
          {adding ? 'Cancel' : '+ Add milestone'}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="card space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="label">Domain</label>
              <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
                {Object.entries(DOMAIN_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title</label>
              <input
                className="input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Uses 2-symbol AAC requests"
              />
            </div>
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Add milestone'}
          </button>
        </form>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center text-sage-500 py-10">No milestones yet.</div>
      ) : (
        Object.entries(grouped).map(([d, items]) => (
          <div key={d}>
            <h3 className="font-display text-xl text-sage-900 mb-3">{DOMAIN_LABEL[d] || d}</h3>
            <div className="card divide-y divide-sage-100">
              {items.map((m) => (
                <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sage-900">{m.title}</div>
                    {m.description && <p className="text-sm text-sage-500">{m.description}</p>}
                    {m.achievedAt && (
                      <p className="text-xs text-sage-500 mt-1">
                        🎉 Achieved {formatDate(m.achievedAt)}
                      </p>
                    )}
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) => setStatus(m.id, e.target.value)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border-0 ${STATUS_TONE[m.status]}`}
                  >
                    <option value="NOT_STARTED">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="ACHIEVED">Achieved</option>
                    <option value="REGRESSED">Regressed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
