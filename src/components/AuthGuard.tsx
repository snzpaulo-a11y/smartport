import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Staff, StaffRole } from "@/lib/store";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: StaffRole[];
  requireStaff?: boolean;
}

function parseStaffSession(key: string): Staff | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id && parsed.role) return parsed as Staff;
    return null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export const AuthGuard = ({ children, allowedRoles, requireStaff = true }: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<Staff | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Check for staff auth in session
    // We check both "adminStaff" and "scanStaff" for flexibility
    const staff = parseStaffSession("adminStaff") || parseStaffSession("scanStaff");
    setAuthenticatedStaff(staff);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageSkeleton variant="dashboard" count={4} />
      </div>
    );
  }

  // If staff is required but not found
  if (requireStaff && !authenticatedStaff) {
    // If it's a scanner route, go to scan-login
    if (location.pathname.startsWith("/scanner") || location.pathname.startsWith("/scan-history")) {
      return <Navigate to="/scan-login" replace />;
    }
    // Default to admin login for other staff routes
    return <Navigate to="/admin-login" replace />;
  }

  // If role check is required
  if (authenticatedStaff && allowedRoles && !allowedRoles.includes(authenticatedStaff.role)) {
    // Unauthorized - redirect to a safe page (e.g., home or own dashboard)
    if (authenticatedStaff.role === "scanner") {
       return <Navigate to="/scanner" replace />;
    }
    if (authenticatedStaff.role === "admin" || authenticatedStaff.role === "super_admin") {
       return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
