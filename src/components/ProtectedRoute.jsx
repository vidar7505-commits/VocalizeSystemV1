import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ allowedRole }) => {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  console.log('ProtectedRoute - render:', { 
    hasUser: !!user, 
    isGuest, 
    loading, 
    allowedRole,
    pathname: location.pathname 
  });

  useEffect(() => {
    console.log('ProtectedRoute - useEffect:', { 
      loading, 
      hasUser: !!user, 
      isGuest,
      allowedRole 
    });
    
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading, user, isGuest]);

  if (loading || isLoading) {
    console.log('ProtectedRoute - showing loader');
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const isAuthenticated = !!user || isGuest;
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('ProtectedRoute - not authenticated, redirecting to /');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Determine user role
  let userRole = 'customer';
  
  if (isGuest) {
    userRole = 'customer';
    console.log('ProtectedRoute - guest user, role:', userRole);
  } else if (user?.user_metadata?.user_type) {
    userRole = user.user_metadata.user_type;
    console.log('ProtectedRoute - authenticated user, role:', userRole);
  }

  // Check role access
  if (allowedRole && userRole !== allowedRole) {
    console.log('ProtectedRoute - role mismatch:', { userRole, allowedRole });
    
    if (userRole === 'customer') {
      console.log('ProtectedRoute - redirecting customer to /customer-panel');
      return <Navigate to="/customer-panel" replace />;
    }
    if (userRole === 'manager') {
      console.log('ProtectedRoute - redirecting manager to /admin-panel');
      return <Navigate to="/admin-panel" replace />;
    }
    
    console.log('ProtectedRoute - unknown role, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute - access granted, rendering outlet');
  return <Outlet />;
};

export default ProtectedRoute;