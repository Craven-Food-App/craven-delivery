import React from 'react';
import { CheckCircle, ArrowRight, X } from 'lucide-react';

// --- MOCK UI COMPONENTS (Replaces Shadcn/UI/External imports) ---

// Replicating a stylized header for context
const AppHeader = ({ title, onBack, showHelp = true }) => {
  return (
    <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg p-4 flex justify-between items-center h-16 sticky top-0 z-20 safe-area-top">
      <button 
        onClick={onBack} 
        className="p-2 -ml-2 rounded-full hover:bg-white/10 transition"
        aria-label="Back"
      >
        <X size={24} />
      </button>
      <h1 className="text-xl font-bold tracking-wide">{title}</h1>
      <div className="w-10">
        {/* Help button space - kept here for structure */}
        {showHelp && (
            <button className="text-sm font-semibold opacity-0" aria-hidden="true">
                Help
            </button>
        )}
      </div>
    </header>
  );
};

const Card = ({
  children,
  className = ''
}) => <div className={`bg-white rounded-xl shadow-2xl border border-gray-200 ${className}`}>
    {children}
  </div>;
  
const CardContent = ({
  children,
  className = 'p-4'
}) => <div className={className}>{children}</div>;

const Button = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  size = 'lg',
  disabled = false
}) => {
  const baseClasses = "flex items-center justify-center font-semibold rounded-xl transition duration-150 active:scale-[0.98] shadow-md hover:shadow-lg";
  let sizeClasses = '';
  let variantClasses = '';
  
  switch (size) {
    case 'lg':
      sizeClasses = 'h-14 px-6 text-base';
      break;
    case 'sm':
      sizeClasses = 'h-8 px-3 text-sm';
      break;
    default:
      sizeClasses = 'h-10 px-4 text-sm';
      break;
  }
  
  switch (variant) {
    case 'outline':
      variantClasses = 'bg-white text-orange-600 border border-orange-600';
      break;
    case 'secondary':
        variantClasses = 'bg-gray-100 text-gray-800';
        break;
    case 'ghost':
        variantClasses = 'bg-transparent text-gray-700 hover:bg-gray-50 shadow-none';
        break;
    default:
      variantClasses = 'bg-orange-600 text-white hover:bg-orange-700';
      break;
  }

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className} ${disabledClasses}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// --- MAIN COMPONENT ---

interface TestCompletionModalProps {
  orderDetails: {
    restaurant_name: string;
    pickup_address: string;
    dropoff_address: string;
    payout_cents: number;
    estimated_time: number;
    isTestOrder: boolean;
  };
  onCompleteDelivery: () => void;
}

/**
 * Renders the screen for completing a system test order.
 * This component focuses only on the final, successful completion state.
 */
const TestOrderCompletionFlow = ({ orderDetails, onCompleteDelivery }: TestCompletionModalProps) => {

  const handleNextOpportunity = () => {
    console.log("Navigating to the next opportunity (dashboard/home screen).");
    onCompleteDelivery();
  };

  const renderTestCompletionScreen = () => (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      
      {/* Centered Completion Card */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-lg mx-auto transform transition-all duration-300">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Success Icon */}
            <CheckCircle className="text-green-500" size={64} />
            
            {/* Main Message */}
            <h2 className="text-3xl font-extrabold text-gray-800">
              Test Order Completed!
            </h2>
            
            {/* Thank You Note */}
            <p className="text-lg text-gray-600 leading-relaxed">
              Thank you for participating in a **random systems test**. 
              Your quick and efficient completion of this order is vital to maintaining our system stability and reliability.
              <br className="my-2"/>
              You're all set!
            </p>

            {/* Simulated Earnings/Bonus Area */}
            <div className="bg-green-50 border border-green-200 text-green-700 font-bold p-3 rounded-xl w-full">
                Test Bonus Added: <span className="text-xl ml-2">$5.00</span>
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              (This action will not affect your real-world delivery metrics.)
            </p>

          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Action Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white p-4 pt-2 shadow-2xl">
        <Button 
          onClick={handleNextOpportunity} 
          className="w-full"
        >
          <span>Go to Next Opportunity</span>
          <ArrowRight size={20} className="ml-2" />
        </Button>
      </div>

    </div>
  );

  return (
    <div className="absolute inset-0 z-10 bg-gray-50 flex flex-col font-sans">
      {/* Fixed Header */}
      <AppHeader 
        title="Test Complete" 
        onBack={() => console.log("Back/Cancel flow disabled in completion view")} 
        showHelp={false} 
      />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {renderTestCompletionScreen()}
      </div>
    </div>
  );
};

export default TestOrderCompletionFlow;
