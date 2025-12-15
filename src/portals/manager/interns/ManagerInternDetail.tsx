import React from "react";
import { useParams } from "react-router-dom";

const ManagerInternDetail: React.FC = () => {
  const { internId } = useParams<{ internId: string }>();

  // Future: bind to intern_assignments, tasks, performance_reviews for this intern
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Intern Detail</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Deep dive into one intern&apos;s tasks, performance, and notes.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">Intern ID: {internId}</p>
        <p className="text-sm mt-2">
          Detailed task board, activity log, and review timeline will render here.
        </p>
      </div>
    </div>
  );
};

export default ManagerInternDetail;



