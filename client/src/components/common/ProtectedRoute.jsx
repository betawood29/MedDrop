// Protected route wrapper — redirects to login if user is not authenticated

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader fullscreen text="Checking login..." />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
