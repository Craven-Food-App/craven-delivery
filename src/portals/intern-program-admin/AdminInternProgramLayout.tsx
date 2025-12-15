import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchInternRoles, hasInternRole, InternRole } from "@/lib/internRbac";

const AdminInternProgramLayout: React.FC = () => {
  const { data: roles = [], isLoading } = useQuery<InternRole[]>({
    queryKey: ["intern-roles"],
    queryFn: fetchInternRoles,
  });

  if (isLoading) {
    return <div>Loading intern program admin...</div>;
  }

  const canAccess = hasInternRole(roles, "INTERN_PROGRAM_ADMIN");
  if (!canAccess) {
    return <div>Access denied.</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 hidden md:block">
        <h2 className="font-semibold mb-4">Intern Program Admin</h2>
        <nav className="space-y-2 text-sm">
          <div>
            <NavLink to="/admin/intern-program/dashboard">Dashboard</NavLink>
          </div>
          <div>
            <NavLink to="/admin/intern-program/roles-permissions">
              Roles &amp; Permissions
            </NavLink>
          </div>
          <div>
            <NavLink to="/admin/intern-program/templates">Templates</NavLink>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminInternProgramLayout;



