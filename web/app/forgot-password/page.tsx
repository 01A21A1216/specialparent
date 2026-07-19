'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '../../components/auth-layout';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Backend always returns 200 — do not disclose whether the email exists.
      await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
        auth: false,
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox."
        subtitle="If an account exists for that email, we've sent a link to reset your password."
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-sage-50 border border-sage-100 p-5 text-sage-700 text-sm">
            The link is valid for 1 hour. If it doesn't arrive within a few minutes, check spam or
            try again with a different address.
          </div>
          <Link href="/login" className="btn-primary w-full text-center block">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password."
      subtitle="Enter the email on your SpecialParent.in account and we'll send you a link."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full text-lg disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-center text-sage-600 text-sm">
          Remembered it?{' '}
          <Link
            href="/login"
            className="text-sage-900 font-medium underline underline-offset-2 decoration-coral-400"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
