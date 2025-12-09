import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const IndependentContractorAgreement = () => {
  const navigate = useNavigate();
  const [icaDocumentUrl, setIcaDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchICADocument = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('independent_contractor_agreement_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          // If column doesn't exist (400/42703 error), use default
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            setIcaDocumentUrl(null);
            return;
          }
          console.error('Error fetching ICA document:', error);
          return;
        }

        if (data?.independent_contractor_agreement_url) {
          setIcaDocumentUrl(data.independent_contractor_agreement_url);
        }
      } catch (error: any) {
        // If it's a 400 error, try fetching without the new column
        if (error?.status === 400 || error?.code === 400) {
          setIcaDocumentUrl(null);
        } else {
          console.error('Error fetching ICA document:', error);
        }
      }
    };

    fetchICADocument();
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
            src={icaDocumentUrl || "/independent-contractor-agreement.html"}
            className="w-full h-[calc(100vh-200px)] min-h-[800px] border rounded-lg"
            title="Independent Contractor Agreement"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default IndependentContractorAgreement;

