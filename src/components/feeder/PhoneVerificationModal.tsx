import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhoneVerificationModalProps {
  open: boolean;
  phoneNumber: string;
  countryCode: string;
  email: string;
  onVerified: () => void;
  onClose: () => void;
}

export const PhoneVerificationModal = ({
  open,
  phoneNumber,
  countryCode,
  email,
  onVerified,
  onClose,
}: PhoneVerificationModalProps) => {
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const formattedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send verification code on mount
  useEffect(() => {
    if (open && formattedPhone) {
      sendVerificationCode();
      setCountdown(60); // 60 second countdown
    }
  }, [open]);

  const sendVerificationCode = async () => {
    try {
      setIsResending(true);
      const { data, error } = await supabase.functions.invoke("send-phone-verification", {
        body: {
          phone: formattedPhone,
          email: email,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        // Provide more helpful error messages
        if (error.message?.includes("Failed to send a request") || error.message?.includes("fetch")) {
          throw new Error("Unable to connect to verification service. Please check your internet connection and try again.");
        }
        throw error;
      }

      // In development, show the code for testing
      if (data?.code) {
        toast.success(`Verification code sent! Code: ${data.code} (dev mode)`, { duration: 10000 });
      } else {
        toast.success("Verification code sent!");
      }
      setCountdown(60);
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      const errorMessage = error.message || "Failed to send verification code. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, ""); // Only numbers
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5);
    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 5) newCode[i] = char;
    });
    setCode(newCode);
    // Focus the last filled input or the last input
    const lastIndex = Math.min(pastedData.length - 1, 4);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== 5) {
      toast.error("Please enter the complete 5-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-code", {
        body: {
          phone: formattedPhone,
          code: verificationCode,
          email: email,
        },
      });

      if (error) throw error;

      if (data?.verified) {
        toast.success("Phone number verified!");
        onVerified();
      } else {
        toast.error("Invalid verification code. Please try again.");
        setCode(["", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed. Please try again.");
      setCode(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Verify your number</h2>
            <p className="text-sm text-gray-600">
              For your security, please enter the code we just sent to{" "}
              <span className="font-semibold">{formattedPhone}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                disabled={isVerifying}
              />
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={sendVerificationCode}
              disabled={isResending || countdown > 0}
              className="text-sm text-[#FF6B00] underline hover:text-[#E65F00] disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </button>
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.join("").length !== 5 || isVerifying}
            className="w-full h-12 bg-[#FF6B00] hover:bg-[#E65F00] text-white rounded-lg font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

