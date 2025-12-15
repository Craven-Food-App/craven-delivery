import React from "react";

const InternProgramDashboard: React.FC = () => {
  // Future: bind to intern_offers, intern_assignments, conversion_eligibility
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Program Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-4">
        High-level view of all interns, statuses, and conversion pipeline.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Program-wide metrics and export tools will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default InternProgramDashboard;



