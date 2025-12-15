import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchInternRoles, hasInternRole } from "@/lib/internRbac";

const InternPortalLayout: React.FC = () => {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["intern-roles"],
    queryFn: fetchInternRoles,
  });

  if (isLoading) {
    return <div>Loading intern portal...</div>;
  }

  const isIntern = hasInternRole(roles, "INTERN");
  if (!isIntern) {
    return <div>Access denied.</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 hidden md:block">
        <h2 className="font-semibold mb-4">Intern Portal</h2>
        <nav className="space-y-2 text-sm">
          <div>
            <NavLink to="/intern/dashboard">Dashboard</NavLink>
          </div>
          <div>
            <NavLink to="/intern/training">Training</NavLink>
          </div>
          <div>
            <NavLink to="/intern/work">Work</NavLink>
          </div>
          <div>
            <NavLink to="/intern/performance">Performance</NavLink>
          </div>
          <div>
            <NavLink to="/intern/conversion">Conversion</NavLink>
          </div>
          <div>
            <NavLink to="/intern/exit">Exit</NavLink>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default InternPortalLayout;



