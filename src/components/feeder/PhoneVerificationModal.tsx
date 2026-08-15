import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle } from "lucide-react";

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
  const [step, setStep] = useState<1 | 2>(1); // Step 1: 4-digit, Step 2: 6-digit
  const [code, setCode] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const formattedPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
  const codeLength = step === 1 ? 4 : 6;

  // Initialize code array based on step
  useEffect(() => {
    setCode(new Array(codeLength).fill(""));
    inputRefs.current = new Array(codeLength).fill(null);
  }, [step, codeLength]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send verification email on mount (step 1)
  useEffect(() => {
    if (open && formattedPhone && step === 1) {
      sendVerificationCode();
      setCountdown(60);
    }
  }, [open, step]);

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
        if (error.message?.includes("Failed to send a request") || error.message?.includes("fetch")) {
          throw new Error("Unable to connect to verification service. Please check your internet connection and try again.");
        }
        throw error;
      }

      if (step === 1) {
        toast.success("Verification email sent! Check your inbox and Spam/Junk for the 4-digit code.");
      } else {
        toast.success("New code sent! Check your inbox and Spam/Junk.");
      }
      setCountdown(60);
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      const errorMessage = error.message || "Failed to send verification email. Please try again.";
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
    if (value && index < codeLength - 1) {
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
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, codeLength);
    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < codeLength) newCode[i] = char;
    });
    setCode(newCode);
    // Focus the last filled input or the last input
    const lastIndex = Math.min(pastedData.length - 1, codeLength - 1);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== codeLength) {
      toast.error(`Please enter the complete ${codeLength}-digit code`);
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-code", {
        body: {
          phone: formattedPhone,
          code: verificationCode,
          email: email,
          step: step,
        },
      });

      if (error) throw error;

      if (data?.verified) {
        if (step === 1 && data.nextStep === 2) {
          // Step 1 verified, move to step 2
          toast.success("Phone number verified! Check your email for the 6-digit code.");
          setStep(2);
          setCode(new Array(6).fill(""));
          inputRefs.current = new Array(6).fill(null);
          setCountdown(60);
          // Auto-send step 2 email (it's sent by verify function)
        } else if (step === 2) {
          // Step 2 verified, complete
          toast.success("Phone number verified successfully!");
          onVerified();
        }
      } else {
        toast.error(data?.error || `Invalid verification code. Please enter the ${codeLength}-digit code from your email.`);
        setCode(new Array(codeLength).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed. Please try again.");
      setCode(new Array(codeLength).fill(""));
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
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
                {step === 1 ? (
                  <Mail className="w-6 h-6 text-[#FF6B00]" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-[#FF6B00]" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 1 ? "Verify your phone number" : "Final verification"}
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1 ? (
                <>
                  We sent a verification email to{" "}
                  <span className="font-semibold">{email}</span>
                  <br />
                  Please check your email and enter the <strong>4-digit code</strong>.
                </>
              ) : (
                <>
                  Check your email for the <strong>6-digit code</strong>.
                  <br />
                  Enter it below to complete verification.
                </>
              )}
            </p>
            <div className="mx-auto max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left">
              <p className="text-xs font-semibold text-amber-900">
                Check your Spam or Junk folder
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90">
                Confirmation emails sometimes land there. Open the message, then return here to enter the code and continue.
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            <div className={`h-2 w-12 rounded-full ${step >= 1 ? 'bg-[#FF6B00]' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-12 rounded-full ${step >= 2 ? 'bg-[#FF6B00]' : 'bg-gray-300'}`}></div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 text-center block">
              {step === 1 ? "Enter 4-digit code:" : "Enter 6-digit code:"}
            </label>
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
                  className="w-14 h-14 text-center text-2xl font-semibold border-2 focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                  disabled={isVerifying}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={sendVerificationCode}
              disabled={isResending || countdown > 0}
              className="text-sm text-[#FF6B00] underline hover:text-[#E65F00] disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : "Resend email"}
            </button>
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.join("").length !== codeLength || isVerifying}
            className="w-full h-12 bg-[#FF6B00] hover:bg-[#E65F00] text-white rounded-lg font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : step === 1 ? "Continue" : "Complete Verification"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
