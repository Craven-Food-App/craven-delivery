import { useLocation } from 'react-router-dom';
import BusinessAuth from '@/pages/BusinessAuth';
import Auth from '@/pages/Auth';

/**
 * Wrapper component that checks if we should show BusinessAuth or customer Auth
 * based on URL parameters
 */
const BusinessAuthWrapper = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Check if hq=true is in URL - this indicates business/employee login
  const isBusinessAuth = searchParams.get('hq') === 'true';
  
  if (isBusinessAuth) {
    return <BusinessAuth />;
  }
  
  // Default to customer Auth
  return <Auth />;
};

export default BusinessAuthWrapper;

