import React from 'react';

const ThankYou: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-slate-600">
          Your signature has been recorded. You may close this window.
        </p>
      </div>
    </div>
  );
};

export default ThankYou;


