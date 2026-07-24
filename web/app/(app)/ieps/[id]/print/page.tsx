'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useApi } from '../../../../../lib/swr';
import { formatDate } from '../../../../../lib/utils';

// Print-friendly view of a single IEP. Uses standard browser print rather
// than a PDF library — nearly every browser today (and every mobile OS)
// can Save-as-PDF from the print dialog. No new deps, no server-side PDF
// generator to maintain, and the output stays styled by the same CSS
// that renders on screen.

type Domain =
  | 'COMMUNICATION' | 'SOCIAL' | 'EMOTIONAL' | 'MOTOR'
  | 'COGNITIVE' | 'DAILY_LIVING' | 'SENSORY';
type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'REGRESSED';
type IepStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

interface IepGoal {
  id: string;
  domain: Domain;
  title: string;
  description: string | null;
  measurableCriteria: string | null;
  targetDate: string | null;
  status: MilestoneStatus;
  progress: number;
}

interface IepReview {
  id: string;
  reviewDate: string;
  notes: string | null;
  participants: string[];
}

interface IepService {
  type: string;
  frequency: string;
  provider?: string;
  setting?: string;
}

interface IepDetail {
  id: string;
  schoolYear: string;
  title: string | null;
  status: IepStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  presentLevels: string | null;
  strengths: string | null;
  concerns: string | null;
  accommodations: string[];
  services: IepService[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  goals: IepGoal[];
  reviews: IepReview[];
}

const DOMAIN_LABEL: Record<Domain, string> = {
  COMMUNICATION: 'Communication',
  SOCIAL: 'Social',
  EMOTIONAL: 'Emotional',
  MOTOR: 'Motor',
  COGNITIVE: 'Cognitive',
  DAILY_LIVING: 'Daily living',
  SENSORY: 'Sensory',
};

export default function IepPrintPage() {
  const params = useParams<{ id: string }>();
  const { data: iep, isLoading } = useApi<IepDetail>(`/ieps/${params.id}`);

  // Auto-open the print dialog once the document is ready — a printable
  // "print view" that requires an extra click for every user is a rough
  // UX. If the user cancels, they can still Ctrl-P.
  useEffect(() => {
    if (!iep) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [iep]);

  if (isLoading || !iep) {
    return <div className="text-sage-500">Loading…</div>;
  }

  const title = iep.title || `${iep.schoolYear} IEP`;

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Neutralise the app shell so only the document prints */
          aside,
          header.lg\\:hidden,
          nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 18mm 16mm;
          }
        }
        .print-doc {
          font-family: Georgia, 'Times New Roman', serif;
          color: #1a1a1a;
          max-width: 780px;
          margin: 0 auto;
          padding: 24px;
          line-height: 1.5;
        }
        .print-doc h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        .print-doc h2 {
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #555;
          font-weight: 600;
          margin: 28px 0 8px 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
        }
        .print-doc h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 12px 0 4px 0;
        }
        .print-doc .kv {
          color: #555;
          font-size: 13px;
          margin: 2px 0;
        }
        .print-doc .goal {
          border: 1px solid #e5e5e5;
          padding: 10px 12px;
          border-radius: 6px;
          margin: 8px 0;
          page-break-inside: avoid;
        }
        .print-doc .goal-header {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .print-doc .goal-title {
          font-size: 14px;
          font-weight: 600;
        }
        .print-doc ul.accom {
          margin: 4px 0 0 0;
          padding-left: 18px;
        }
        .print-doc .service-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
          font-size: 13px;
          padding: 6px 0;
          border-bottom: 1px dotted #ddd;
        }
        .print-doc .service-row:first-of-type {
          font-weight: 600;
          border-bottom: 1px solid #999;
        }
        .print-doc .review {
          margin: 8px 0;
          padding: 8px 12px;
          border-left: 3px solid #999;
          page-break-inside: avoid;
        }
        .print-doc .signature-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 32px;
          margin-top: 48px;
        }
        .print-doc .signature-box {
          border-top: 1px solid #333;
          padding-top: 6px;
          font-size: 12px;
          color: #555;
        }
      `}</style>

      <div className="no-print mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary text-sm"
        >
          🖨 Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-ghost text-sm"
        >
          Back
        </button>
      </div>

      <article className="print-doc bg-white">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' }}>
            Individualized Education Program
          </div>
          <h1>{title}</h1>
          <div className="kv">
            School year {iep.schoolYear} · Status: {iep.status.toLowerCase()}
            {iep.effectiveFrom && ` · In effect ${formatDate(iep.effectiveFrom)}`}
            {iep.effectiveTo && ` to ${formatDate(iep.effectiveTo)}`}
          </div>
          {iep.createdByName && (
            <div className="kv">Authored by {iep.createdByName}</div>
          )}
        </div>

        {iep.presentLevels && (
          <>
            <h2>Present levels of performance</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{iep.presentLevels}</p>
          </>
        )}

        {(iep.strengths || iep.concerns) && (
          <>
            <h2>Strengths and concerns</h2>
            {iep.strengths && (
              <>
                <h3>Strengths</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{iep.strengths}</p>
              </>
            )}
            {iep.concerns && (
              <>
                <h3>Concerns</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{iep.concerns}</p>
              </>
            )}
          </>
        )}

        {iep.accommodations.length > 0 && (
          <>
            <h2>Accommodations</h2>
            <ul className="accom">
              {iep.accommodations.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </>
        )}

        {iep.services.length > 0 && (
          <>
            <h2>Related services</h2>
            <div className="service-row">
              <div>Type</div>
              <div>Frequency</div>
              <div>Provider</div>
              <div>Setting</div>
            </div>
            {iep.services.map((s, i) => (
              <div key={i} className="service-row">
                <div>{s.type}</div>
                <div>{s.frequency}</div>
                <div>{s.provider || '—'}</div>
                <div>{s.setting || '—'}</div>
              </div>
            ))}
          </>
        )}

        {iep.goals.length > 0 && (
          <>
            <h2>Annual goals ({iep.goals.length})</h2>
            {iep.goals.map((g) => (
              <div key={g.id} className="goal">
                <div className="goal-header">
                  {DOMAIN_LABEL[g.domain]} · {g.status.toLowerCase().replace('_', ' ')}
                  {g.targetDate && ` · Target ${formatDate(g.targetDate)}`}
                  {' · '}Progress {g.progress}%
                </div>
                <div className="goal-title">{g.title}</div>
                {g.description && (
                  <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>{g.description}</p>
                )}
                {g.measurableCriteria && (
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#555' }}>
                    <strong>Measurable:</strong> {g.measurableCriteria}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {iep.reviews.length > 0 && (
          <>
            <h2>Review history</h2>
            {iep.reviews.map((r) => (
              <div key={r.id} className="review">
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {formatDate(r.reviewDate)}
                </div>
                {r.participants.length > 0 && (
                  <div className="kv">With: {r.participants.join(', ')}</div>
                )}
                {r.notes && (
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {r.notes}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        <div className="signature-row">
          <div className="signature-box">Parent / guardian</div>
          <div className="signature-box">Special educator</div>
          <div className="signature-box">Therapist</div>
        </div>

        <div className="kv" style={{ marginTop: 24, textAlign: 'center' }}>
          Generated by SpecialParents.in · {formatDate(new Date().toISOString())}
        </div>
      </article>
    </>
  );
}
