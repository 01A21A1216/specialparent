'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthLayout } from '../../components/auth-layout';
import { useAuth } from '../../components/auth-provider';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PARENT' | 'THERAPIST' | 'TEACHER'>('PARENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup({ email: email.trim().toLowerCase(), fullName, password, role });
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for parents. No payment details required."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="fullName">Your name</label>
          <input
            id="fullName"
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Priya Iyer"
          />
        </div>

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

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className="label">I am a…</label>
          <div className="grid grid-cols-3 gap-2">
            {(['PARENT', 'THERAPIST', 'TEACHER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-2xl px-3 py-3 text-sm font-medium transition-colors border-2 ${
                  role === r
                    ? 'bg-sage-600 text-cream-50 border-sage-600'
                    : 'bg-white text-sage-700 border-sage-200 hover:border-sage-400'
                }`}
              >
                {r === 'PARENT' ? 'Parent' : r === 'THERAPIST' ? 'Therapist' : 'Teacher'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full text-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sage-600">
          Already have an account?{' '}
          <Link href="/login" className="text-sage-900 font-medium underline underline-offset-2 decoration-coral-400">
            Sign in
          </Link>
        </p>

        <p className="text-xs text-sage-500 text-center">
          By signing up you agree to our care principles. We never share your data.
        </p>
      </form>
    </AuthLayout>
  );
}
