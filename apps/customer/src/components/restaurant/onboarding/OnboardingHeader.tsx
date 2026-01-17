import { Button } from "@/components/ui/button";
import { HelpCircle, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingHeaderProps {
  onSave?: () => void;
}

const OnboardingHeader = ({ onSave }: OnboardingHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <img 
          src="/craven-logo.png" 
          alt="Crave'N" 
          className="h-8 w-auto cursor-pointer"
          onClick={() => navigate("/")}
        />
        <h1 className="text-xl font-semibold">Create new store</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
        {onSave && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}
      </div>
    </header>
  );
};

export default OnboardingHeader;
