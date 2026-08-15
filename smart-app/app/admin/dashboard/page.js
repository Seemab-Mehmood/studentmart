import { redirect } from "next/navigation";
import { isAdminRequest } from "../../../lib/adminSession";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  if (!isAdminRequest()) redirect("/admin");
  return <AdminDashboardClient />;
}
