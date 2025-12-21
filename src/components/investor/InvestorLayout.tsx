import React from 'react';
import InvestorSidebar from './InvestorSidebar';

interface InvestorLayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean; // For pages that need full-screen black backgrounds
}

const InvestorLayout: React.FC<InvestorLayoutProps> = ({ children, fullScreen = false }) => {
  if (fullScreen) {
    // For full-screen pages (like pitch deck), sidebar overlays on the left
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <InvestorSidebar />
        <div className="ml-64 h-full overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  // For regular pages, use flex layout
  return (
    <div className="flex h-screen w-full bg-background">
      <InvestorSidebar />
      <main className="flex-1 overflow-auto ml-64">
        {children}
      </main>
    </div>
  );
};

export default InvestorLayout;

