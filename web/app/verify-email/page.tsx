'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthLayout } from '../../components/auth-layout';
import { AuthPageFallback } from '../../components/auth-page-fallback';
import { api } from '../../lib/api';

type State = 'verifying' | 'ok' | 'error' | 'no-token';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>(token ? 'verifying' : 'no-token');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api('/auth/verify-email', {
          method: 'POST',
          body: { token },
          auth: false,
        });
        if (!cancelled) setState('ok');
      } catch (err: any) {
        if (!cancelled) {
          setMsg(err?.message ?? 'Verification failed.');
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'no-token') {
    return (
      <AuthLayout title="Nothing to verify." subtitle="Open the link from your inbox again.">
        <Link href="/login" className="btn-primary w-full text-center block">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }
  if (state === 'verifying') {
    return (
      <AuthLayout title="Verifying your email…" subtitle="One moment.">
        <div />
      </AuthLayout>
    );
  }
  if (state === 'ok') {
    return (
      <AuthLayout title="Email verified." subtitle="Thanks — that's one less thing to worry about.">
        <Link href="/dashboard" className="btn-primary w-full text-center block">
          Continue to dashboard
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title="That link didn't work."
      subtitle={msg ?? 'It may have expired or been used already.'}
    >
      <Link href="/dashboard" className="btn-primary w-full text-center block">
        Continue and resend from your profile
      </Link>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<AuthPageFallback title="Verifying your email…" subtitle="One moment." />}
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
