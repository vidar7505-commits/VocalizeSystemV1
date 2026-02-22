import * as React from 'react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ allowedRole }) => {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading, user, isGuest]);

  if (loading || isLoading) {

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const isAuthenticated = !!user || isGuest;


  if (!isAuthenticated) {

    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Determine user role
  let userRole = 'customer';

  if (isGuest) {
    userRole = 'customer';

  } else if (user?.user_metadata?.user_type) {
    userRole = user.user_metadata.user_type;

  }

  // Check role access
  if (allowedRole && userRole !== allowedRole) {


    if (userRole === 'customer') {

      return <Navigate to="/customer-panel" replace />;
    }
    if (userRole === 'manager') {

      return <Navigate to="/admin-panel" replace />;
    }


    return <Navigate to="/" replace />;
  }


  return <Outlet />;
};

export default ProtectedRoute;