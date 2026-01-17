import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

interface MobileVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string, countryCode: string) => void;
  onRemindLater: () => void;
}

const MobileVerificationModal = ({ open, onClose, onSubmit, onRemindLater }: MobileVerificationModalProps) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = () => {
    if (phoneNumber.trim()) {
      onSubmit(phoneNumber, countryCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Phone Icon Illustration */}
          <div className="w-64 h-48 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-48 bg-gray-800 rounded-3xl border-4 border-gray-700 flex flex-col items-center justify-center p-4 shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-2">
                  <div className="text-white text-3xl">👤</div>
                </div>
                <div className="flex space-x-1 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <div className="w-16 h-8 bg-orange-500 rounded-full"></div>
              </div>
              <div className="absolute -right-2 top-1/2 w-8 h-12 bg-blue-500 rounded-r-lg -translate-y-1/2"></div>
            </div>
          </div>

          <DialogHeader className="space-y-4 text-center">
            <DialogTitle className="text-2xl font-bold">
              Action required: Add your mobile number to secure your account
            </DialogTitle>
          </DialogHeader>

          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">+1 (US)</SelectItem>
                    <SelectItem value="+44">+44 (UK)</SelectItem>
                    <SelectItem value="+91">+91 (India)</SelectItem>
                    <SelectItem value="+61">+61 (Australia)</SelectItem>
                    <SelectItem value="+81">+81 (Japan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Your personal mobile number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Charges from your phone carrier may apply.
            </p>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
              <p>
                For your account's security, each username login must have a personal mobile number associated with it. 
                We'll use this number to send 2-step verification codes when you log in or when verifying your identity 
                during account changes or Support interactions.
              </p>
              <p className="font-semibold">
                Every Portal user in your business will be required to provide their own mobile number.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Can't provide a mobile number?{" "}
                <button className="text-primary hover:underline font-medium">
                  Let us know
                </button>
              </p>
            </div>
          </div>

          <div className="flex justify-between w-full pt-4 gap-4">
            <Button variant="outline" onClick={onRemindLater} className="flex-1">
              Remind me tomorrow
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!phoneNumber.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Send verification code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileVerificationModal;
