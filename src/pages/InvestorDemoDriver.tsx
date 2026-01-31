import { DemoAuthWrapper } from '@/components/demo/DemoAuthWrapper';
import { DemoMockProvider } from '@/contexts/DemoMockContext';
import { MobileDriverDashboard } from '@/components/mobile/MobileDriverDashboard';

export default function InvestorDemoDriver() {
  return (
    <DemoAuthWrapper 
      appName="Driver Mobile App Demo"
      appDescription="Experience the full mobile driver delivery app"
    >
      <DemoMockProvider>
        <MobileDriverDashboard />
      </DemoMockProvider>
    </DemoAuthWrapper>
  );
}
