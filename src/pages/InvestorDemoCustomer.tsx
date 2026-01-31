import { DemoAuthWrapper } from '@/components/demo/DemoAuthWrapper';
import { DemoMockProvider } from '@/contexts/DemoMockContext';
import Restaurants from './Restaurants';

export default function InvestorDemoCustomer() {
  return (
    <DemoAuthWrapper 
      appName="Customer App Demo"
      appDescription="Experience the full customer ordering experience"
    >
      <DemoMockProvider>
        <Restaurants />
      </DemoMockProvider>
    </DemoAuthWrapper>
  );
}
