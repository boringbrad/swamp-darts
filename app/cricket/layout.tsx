import SessionLockGuard from '../components/SessionLockGuard';

export default function CricketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionLockGuard>{children}</SessionLockGuard>;
}
