import React from "react";

const InternPerformance: React.FC = () => {
  // Future: bind to performance_reviews, performance_scores
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Performance & Evaluation</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Weekly reviews, scorecards, and your self-assessments.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Performance review timeline and KPI dashboard will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default InternPerformance;



