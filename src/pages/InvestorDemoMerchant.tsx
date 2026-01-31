import { DemoAuthWrapper } from '@/components/demo/DemoAuthWrapper';
import { DemoMockProvider } from '@/contexts/DemoMockContext';
import MerchantPortal from './MerchantPortal';

export default function InvestorDemoMerchant() {
  return (
    <DemoAuthWrapper 
      appName="Merchant Portal Demo"
      appDescription="Experience the full merchant dashboard"
    >
      <DemoMockProvider>
        <MerchantPortal />
      </DemoMockProvider>
    </DemoAuthWrapper>
  );
}
