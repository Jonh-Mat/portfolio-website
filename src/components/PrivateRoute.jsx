import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-white-50">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if admin access required but user is not admin
  if (adminOnly && !isAdmin()) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white-50 mb-6">
            You don't have permission to access this page. Admin privileges
            required.
          </p>
          <Navigate to="/blog" replace />
        </div>
      </div>
    );
  }

  return children;
};
