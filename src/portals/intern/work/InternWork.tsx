import React from "react";

const InternWork: React.FC = () => {
  // Future: bind to tasks, deliverables, deliverable_files, activity_logs
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Work & Execution</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Your active tasks, submissions, and activity log.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Task board and deliverables list will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default InternWork;



