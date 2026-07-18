'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { formatDate } from '../../../../../lib/utils';
import { ChildDetail } from './types';

export function GoalsTab({
  childId,
  goals,
  onChange,
}: {
  childId: string;
  goals: ChildDetail['goals'];
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/goals', {
        method: 'POST',
        body: { childId, title, targetDate: target || undefined },
      });
      setTitle('');
      setTarget('');
      setAdding(false);
      await onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function setProgress(id: string, progress: number) {
    await api(`/goals/${id}`, { method: 'PATCH', body: { progress } });
    await onChange();
  }

  return (
    <section className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sage-600">Outcome-focused goals for your child.</p>
        <button onClick={() => setAdding((a) => !a)} className="btn-secondary">
          {adding ? 'Cancel' : '+ Add goal'}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="card space-y-4">
          <div>
            <label className="label">Goal</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Target date (optional)</label>
            <input type="date" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Add goal'}
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="card text-center text-sage-500 py-10">No goals yet.</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="card">
              <div className="flex justify-between gap-4 items-start flex-wrap">
                <div>
                  <h3 className="font-medium text-sage-900">{g.title}</h3>
                  {g.targetDate && (
                    <p className="text-sm text-sage-500">Target: {formatDate(g.targetDate)}</p>
                  )}
                </div>
                <span className={`chip ${g.status === 'ACHIEVED' ? 'bg-sage-200 text-sage-800' : 'bg-mist-100 text-mist-700'}`}>
                  {g.status.toLowerCase()}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-sage-600">Progress</span>
                  <span className="text-sage-900 font-medium">{g.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={g.progress}
                  onMouseUp={(e) => setProgress(g.id, parseInt((e.target as HTMLInputElement).value, 10))}
                  onTouchEnd={(e) => setProgress(g.id, parseInt((e.target as HTMLInputElement).value, 10))}
                  className="w-full accent-sage-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
