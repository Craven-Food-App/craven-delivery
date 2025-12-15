import React from "react";

const InternConversion: React.FC = () => {
  // Future: bind to conversion_eligibility, conversion_offers, conversion_acceptances
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Conversion & Advancement</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Track your eligibility for Acting Executive and view any active offers.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Eligibility checklist and offer letter previews will appear here.
        </p>
      </div>
    </div>
  );
};

export default InternConversion;



