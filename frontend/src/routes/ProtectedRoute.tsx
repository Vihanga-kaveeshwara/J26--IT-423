import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5ED]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#286B45] border-t-transparent" />
          <p className="font-sans-ceylon text-sm font-medium text-[#202922]">
            Authenticating Ceylon Intelligence session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'Admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5ED] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm text-center">
          <h2 className="font-serif-ceylon text-xl font-bold text-red-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-[#778278]">
            Your current role (<span className="font-semibold">{user.role}</span>) does not have authorization to view this resource.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-[#286B45] px-4 py-2 text-sm font-medium text-white hover:bg-[#123D2B]"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
