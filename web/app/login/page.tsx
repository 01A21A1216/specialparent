'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthLayout } from '../../components/auth-layout';
import { useAuth } from '../../components/auth-provider';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('parent@specialparent.in');
  const [password, setPassword] = useState('Demo1234!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace(next);
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to your SpecialParent.in account."
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

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full text-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="rounded-2xl bg-sage-50 border border-sage-100 p-4 text-sm text-sage-700">
          <strong className="text-sage-900">Demo accounts</strong> (password{' '}
          <code className="bg-white px-1.5 py-0.5 rounded text-xs">Demo1234!</code>):
          <ul className="mt-2 space-y-1">
            <li>· parent@specialparent.in</li>
            <li>· therapist@specialparent.in</li>
            <li>· teacher@specialparent.in</li>
            <li>· school@specialparent.in</li>
            <li>· admin@specialparent.in</li>
          </ul>
        </div>

        <p className="text-center text-sage-600">
          New here?{' '}
          <Link href="/signup" className="text-sage-900 font-medium underline underline-offset-2 decoration-coral-400">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  );
}
