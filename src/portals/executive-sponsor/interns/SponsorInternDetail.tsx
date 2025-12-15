import React from "react";
import { useParams } from "react-router-dom";

const SponsorInternDetail: React.FC = () => {
  const { internId } = useParams<{ internId: string }>();

  // Future: bind to intern_assignments, performance_reviews, conversion_offers
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Detail (Sponsor View)</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Full performance history and conversion readiness for this intern.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">Intern ID: {internId}</p>
        <p className="text-sm mt-2">
          Sponsor-focused performance summary and approval actions will appear here.
        </p>
      </div>
    </div>
  );
};

export default SponsorInternDetail;



