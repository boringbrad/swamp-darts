import SessionLockGuard from '../components/SessionLockGuard';

export default function GolfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionLockGuard>{children}</SessionLockGuard>;
}
