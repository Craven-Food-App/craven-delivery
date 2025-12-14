import React from 'react';
import { CraveMorePaywall } from '@/components/cravemore/CraveMorePaywall';
import Footer from '@/components/Footer';

const CraveMore: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <CraveMorePaywall source="home" />
      </div>
      <Footer />
    </div>
  );
};

export default CraveMore;
