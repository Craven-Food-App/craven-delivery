import React from "react";

const ManagerDashboard: React.FC = () => {
  // Future: bind to intern_assignments, tasks, performance_reviews
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Manager Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Roster, status, and risk flags for your assigned interns.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Intern list with Green / Yellow / Red indicators will appear here.
        </p>
      </div>
    </div>
  );
};

export default ManagerDashboard;



