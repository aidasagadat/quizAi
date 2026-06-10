import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '@/store/auth';

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, accessToken } = useAuthStore();
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'TEACHER' ? '/teacher' : '/student'} replace />;
  return <>{children}</>;
}
