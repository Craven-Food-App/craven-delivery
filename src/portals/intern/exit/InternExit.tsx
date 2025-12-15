import React from "react";

const InternExit: React.FC = () => {
  // Future: bind to offboarding_cases, offboarding_steps
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Exit & Offboarding</h1>
      <p className="text-sm text-muted-foreground mb-4">
        If your internship is ending, follow the offboarding checklist here.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Offboarding steps, IP reaffirmation, and access revocation receipts
          will be displayed here.
        </p>
      </div>
    </div>
  );
};

export default InternExit;



