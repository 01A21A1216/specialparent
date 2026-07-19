'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthLayout } from '../../components/auth-layout';
import { AuthPageFallback } from '../../components/auth-page-fallback';
import { api } from '../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingToken = !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: password },
        auth: false,
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  }

  if (missingToken) {
    return (
      <AuthLayout title="Link is missing a token." subtitle="Open the link from your email again.">
        <Link href="/forgot-password" className="btn-primary w-full text-center block">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated."
        subtitle="Redirecting you to sign in with your new password…"
      >
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Pick a new password." subtitle="Use at least 8 characters, with a letter and a number.">
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full text-lg disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageFallback
          title="Pick a new password."
          subtitle="Use at least 8 characters, with a letter and a number."
        />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
