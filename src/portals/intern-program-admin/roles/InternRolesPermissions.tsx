import React from "react";

const InternRolesPermissions: React.FC = () => {
  // Future: bind to roles catalog, user_roles, and audit_events
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Roles &amp; Permissions</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Manage which users are interns, managers, sponsors, and program admins.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Role assignment UI (backed by user_roles and roles catalog) will go here.
        </p>
      </div>
    </div>
  );
};

export default InternRolesPermissions;



