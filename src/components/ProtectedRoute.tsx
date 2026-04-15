import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AppRole } from "@/types/database";

// Allowed admin emails - loaded from environment for security
const ALLOWED_ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, isLoading, isAdmin, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (requiredRoles.includes("admin")) {
      const userEmail = (user.email || profile?.email || "").toLowerCase();
      const isEmailAllowed = ALLOWED_ADMIN_EMAILS.includes(userEmail);
      
      // Debug logging for admin access issues (development only)
      if (import.meta.env.DEV) {
        console.log("Admin Access Check:", {
          userEmail,
          allowedEmails: ALLOWED_ADMIN_EMAILS,
          isEmailAllowed,
          isAdmin,
          userRoles: roles
        });
      }
      
      if (!isEmailAllowed || !isAdmin) {
        return <Navigate to="/dashboard" replace />;
      }
    } else {
      const hasRequiredRole = requiredRoles.some((role) => roles.includes(role)) || isAdmin;
      if (!hasRequiredRole) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}