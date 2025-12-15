import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchInternRoles, hasInternRole, InternRole } from "@/lib/internRbac";

const SponsorPortalLayout: React.FC = () => {
  const { data: roles = [], isLoading } = useQuery<InternRole[]>({
    queryKey: ["intern-roles"],
    queryFn: fetchInternRoles,
  });

  if (isLoading) {
    return <div>Loading sponsor portal...</div>;
  }

  const canAccess = hasInternRole(roles, ["INTERN_SPONSOR", "INTERN_PROGRAM_ADMIN"]);
  if (!canAccess) {
    return <div>Access denied.</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 hidden md:block">
        <h2 className="font-semibold mb-4">Executive Sponsor</h2>
        <nav className="space-y-2 text-sm">
          <div>
            <NavLink to="/executive-sponsor/pipeline">Pipeline</NavLink>
          </div>
          <div>
            <NavLink to="/executive-sponsor/approvals">Approvals</NavLink>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default SponsorPortalLayout;



