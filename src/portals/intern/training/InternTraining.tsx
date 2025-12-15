import React from "react";

const InternTraining: React.FC = () => {
  // Future: bind to training_modules, training_progress, training_quizzes
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Training & Onboarding</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Complete the required modules to unlock full work access.
      </p>
      <div className="border rounded p-3">
        <p className="text-sm">
          Training module list and progress tracking will appear here.
        </p>
      </div>
    </div>
  );
};

export default InternTraining;



