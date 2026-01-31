import { DemoAuthWrapper } from '@/components/demo/DemoAuthWrapper';
import { DemoMockProvider } from '@/contexts/DemoMockContext';
import FeederHub from './FeederHub';

export default function InvestorDemoDriver() {
  return (
    <DemoAuthWrapper 
      appName="Driver App Demo"
      appDescription="Experience the full driver/feeder app"
    >
      <DemoMockProvider>
        <FeederHub />
      </DemoMockProvider>
    </DemoAuthWrapper>
  );
}
