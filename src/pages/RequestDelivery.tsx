import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Laptop, Calendar, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RequestDelivery = () => {
  const navigate = useNavigate();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleRequestDelivery = () => {
    if (!agreedToTerms) {
      alert("Please agree to the Drive On-Demand Merchant Terms and Conditions");
      return;
    }
    // Handle delivery request
    console.log("Delivery requested");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Request deliveries with Drive On-Demand</h1>
          <p className="text-muted-foreground">
            Fill out a form to tap into the Feeder network and request deliveries whenever you need them.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* How it works section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-8">How Drive On-Demand works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pay as you go */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <div className="relative">
                  <Laptop className="w-16 h-16 text-primary" />
                  <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded"></div>
                  </div>
                </div>
              </div>
              <h3 className="font-bold mb-2">Pay as you go</h3>
              <p className="text-sm text-muted-foreground">
                Pay a flat fee per delivery with no additional charges. You can track deliveries with the Merchant dashboard or in your POS system provider.
              </p>
            </div>

            {/* Use Feeders on your schedule */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-orange-50 flex items-center justify-center">
                <div className="flex gap-2">
                  <div className="w-12 h-16 bg-orange-400 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-12 h-16 bg-orange-300 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="font-bold mb-2">Use Feeders on your schedule</h3>
              <p className="text-sm text-muted-foreground">
                Request a Feeder for now, later, or whenever you have an order to go.
              </p>
            </div>

            {/* Direct from you */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="relative">
                  <Smartphone className="w-16 h-16 text-gray-700" />
                  <div className="absolute top-1/2 -right-8 w-12 h-8 bg-gray-600 rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold mb-2">Direct from you</h3>
              <p className="text-sm text-muted-foreground">
                Customers order delivery from your website or phone. You control the customer service and payment.
              </p>
            </div>
          </div>
        </div>

        {/* Terms and conditions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-6">Terms and conditions</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-medium">Commission or signup fees</span>
                <span className="text-muted-foreground">None</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-medium">Delivery fee (x)</span>
                <span className="font-semibold">$7.99 per order / show tip</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-medium">Delivery radius</span>
                <span className="font-semibold">5 miles</span>
              </div>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                I understand and agree to the{" "}
                <a 
                  href="/drive-on-demand-merchant-terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Drive On-Demand Merchant Terms and Conditions
                </a>
                .
              </label>
            </div>

            <Button
              onClick={handleRequestDelivery}
              disabled={!agreedToTerms}
              className="w-full md:w-auto bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-white px-8"
            >
              Request your first delivery
            </Button>
          </CardContent>
        </Card>

        {/* Additional info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> By requesting a delivery, you agree to pay the delivery fee. 
            A Feeder will be assigned to pick up and deliver your order. You can track the delivery 
            status in real-time through your merchant dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RequestDelivery;
