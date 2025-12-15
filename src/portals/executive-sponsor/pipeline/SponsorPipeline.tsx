import React from "react";

const SponsorPipeline: React.FC = () => {
  // Future: bind to conversion_eligibility, performance_reviews
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Conversion Pipeline</h1>
      <p className="text-sm text-muted-foreground mb-4">
        View all interns approaching eligibility for Acting Executive.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Eligibility pipeline and risk flags will be displayed here.
        </p>
      </div>
    </div>
  );
};

export default SponsorPipeline;



