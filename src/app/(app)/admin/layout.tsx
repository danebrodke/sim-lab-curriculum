import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/api';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) redirect('/login');
  if (profile.role !== 'admin') redirect('/dashboard');

  return <>{children}</>;
}
