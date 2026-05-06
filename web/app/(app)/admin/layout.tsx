'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../../components/auth-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[40vh] grid place-items-center text-sage-500">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
