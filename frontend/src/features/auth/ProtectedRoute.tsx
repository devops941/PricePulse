import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Skeleton } from '@/components/ui/FeedbackStates';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-shelf flex items-center justify-center p-6">
        <div className="bg-tile p-8 rounded-tile border border-hairline shadow-shelf max-w-sm w-full space-y-4 text-center">
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase())) {
    return (
      <div className="min-h-screen bg-shelf flex items-center justify-center p-6">
        <div className="bg-tile p-8 rounded-tile border border-hairline shadow-shelf max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[#FBEAE5] text-rise border border-[#F6D0C5] mx-auto flex items-center justify-center font-bold mb-3">
            !
          </div>
          <h2 className="font-serif text-2xl text-ink font-normal mb-2">Access Denied</h2>
          <p className="text-xs text-muted mb-4 font-sans">
            Your current role is <span className="font-semibold text-cocoa">{user.role}</span>. This section is restricted to: {allowedRoles.join(', ')}.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-cocoa text-white text-xs font-medium rounded-md hover:bg-cocoa-deep"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};
