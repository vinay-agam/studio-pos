import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { type User } from "@/db/db";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: User['role'][];
    fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/" }: RoleGuardProps) {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
}
