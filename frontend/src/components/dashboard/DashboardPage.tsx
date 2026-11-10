import { useAuth } from "@/features/auth/AuthContext";
import { isSuperAdmin } from "@/features/auth/types";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { HomeDashboard } from "./HomeDashboard";

export function DashboardPage() {
  const { user } = useAuth();
  return isSuperAdmin(user) ? <AdminDashboard /> : <HomeDashboard />;
}
