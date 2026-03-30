import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AppRole } from "@/types/database";

<<<<<<< HEAD
=======
// Allowed admin emails - extra security layer
const ALLOWED_ADMIN_EMAILS = [
  "stanleyvic13@gmail.com",
  "olamideazeez774@gmail.com"
];

>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
<<<<<<< HEAD
  const { user, roles, isLoading, isAdmin } = useAuth();
=======
  const { user, roles, isLoading, isAdmin, profile } = useAuth();
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
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

  // If specific roles are required, check for them
  if (requiredRoles && requiredRoles.length > 0) {
<<<<<<< HEAD
    // Admin role is checked via isAdmin which comes from database roles
    if (requiredRoles.includes("admin")) {
      if (!isAdmin) {
=======
    // Extra security for admin role - check email allowlist
    if (requiredRoles.includes("admin")) {
      const userEmail = user.email || profile?.email || "";
      const isEmailAllowed = ALLOWED_ADMIN_EMAILS.includes(userEmail.toLowerCase());
      
      if (!isEmailAllowed || !isAdmin) {
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
        // Silently redirect to dashboard - don't reveal admin route exists
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
