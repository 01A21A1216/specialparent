'use client';

import { formatDateTime } from '../../../../../lib/utils';
import { ChildDetail } from './types';

export function SessionsTab({ sessions }: { sessions: ChildDetail['therapySessions'] }) {
  if (sessions.length === 0) {
    return <div className="card text-center text-sage-500 py-10">No sessions yet.</div>;
  }
  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div key={s.id} className="card">
          <div className="flex justify-between gap-4 items-start flex-wrap">
            <div>
              <h3 className="font-display text-xl text-sage-900">{sessionLabel(s.type)}</h3>
              <p className="text-sm text-sage-600 mt-1">
                {formatDateTime(s.scheduledAt)} · {s.durationMins} min
                {s.therapist && ` · ${s.therapist.fullName}`}
              </p>
            </div>
            <span
              className={`chip ${
                s.status === 'COMPLETED'
                  ? 'bg-sage-200 text-sage-800'
                  : s.status === 'SCHEDULED'
                    ? 'bg-mist-100 text-mist-700'
                    : 'bg-coral-100 text-coral-700'
              }`}
            >
              {s.status.toLowerCase()}
            </span>
          </div>
          {s.notes && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sage-700 font-medium">Session notes</summary>
              <p className="mt-2 text-sage-700 whitespace-pre-wrap">{s.notes}</p>
            </details>
          )}
          {s.aiSummary && (
            <div className="mt-3 rounded-2xl bg-lavender-50 border border-lavender-100 p-4">
              <div className="text-xs text-lavender-500 uppercase tracking-wider font-medium">
                ✨ AI summary
              </div>
              <p className="mt-1 text-sage-800 whitespace-pre-wrap text-sm">{s.aiSummary}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function sessionLabel(type: string) {
  return ({
    SPEECH: 'Speech therapy',
    OCCUPATIONAL: 'Occupational therapy',
    PHYSIO: 'Physiotherapy',
    BEHAVIORAL: 'Behavioral therapy',
    ABA: 'ABA',
    SPECIAL_EDUCATION: 'Special education',
    OTHER: 'Session',
  } as Record<string, string>)[type] ?? type;
}
