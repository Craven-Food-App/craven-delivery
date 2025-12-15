import React from "react";

const InternDashboard: React.FC = () => {
  // Future: wire to tasks, training_progress, performance_reviews, conversion_eligibility
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Snapshot of your current status, KPIs, and next actions.
      </p>
      <div className="space-y-3">
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-1 text-sm">Status</h2>
          <p className="text-sm">Active</p>
        </div>
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-1 text-sm">Next Tasks</h2>
          <p className="text-sm">Task list integration coming here.</p>
        </div>
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-1 text-sm">Training Progress</h2>
          <p className="text-sm">Training progress integration coming here.</p>
        </div>
      </div>
    </div>
  );
};

export default InternDashboard;



