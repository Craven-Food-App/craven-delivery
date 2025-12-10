import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FeederPrivacyPolicy = () => {
  const navigate = useNavigate();
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('feeder_privacy_policy_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          // If column doesn't exist (400/42703 error), use default
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            setPrivacyPolicyUrl(null);
            return;
          }
          console.error('Error fetching privacy policy:', error);
          return;
        }

        if (data?.feeder_privacy_policy_url) {
          setPrivacyPolicyUrl(data.feeder_privacy_policy_url);
        }
      } catch (error: any) {
        // If it's a 400 error, try fetching without the new column
        if (error?.status === 400 || error?.code === 400) {
          setPrivacyPolicyUrl(null);
        } else {
          console.error('Error fetching privacy policy:', error);
        }
      }
    };

    fetchPrivacyPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="w-full">
          <iframe
            src={privacyPolicyUrl || "/feeder-privacy-policy.html"}
            className="w-full h-[calc(100vh-200px)] min-h-[800px] border rounded-lg"
            title="Feeder Privacy Policy"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FeederPrivacyPolicy;

