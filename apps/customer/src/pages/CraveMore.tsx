import React from 'react';
import { CraveMorePaywall } from '@/components/cravemore/CraveMorePaywall';
import Footer from '@/components/Footer';

const CraveMore: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="container mx-auto px-4"
        style={{
          // Ensure content starts well below any fixed headers in the mobile app
          paddingTop: 'calc(140px + env(safe-area-inset-top, 0px))',
          paddingBottom: '3rem',
        }}
      >
        <CraveMorePaywall source="home" />
      </div>
      <Footer />
    </div>
  );
};

export default CraveMore;
