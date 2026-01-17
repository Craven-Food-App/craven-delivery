import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PhoneNumberReminderModalProps {
  open: boolean;
  onClose: () => void;
  onAddPhone: () => void;
}

const PhoneNumberReminderModal = ({ open, onClose, onAddPhone }: PhoneNumberReminderModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-8">
        <button
          onClick={onClose}
          className="absolute left-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </button>

        <div className="pt-4 space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            You have 29 days to add and verify your phone number
          </h2>

          <p className="text-base text-foreground">
            You have until November 15, 2025 to add a verified phone number. After that date, you'll no longer be able to access Merchant Portal or Business Manager App without adding a verified phone number.
          </p>

          <p className="text-sm text-muted-foreground">
            Can't provide a mobile number?{" "}
            <button className="text-foreground underline hover:no-underline font-medium">
              Let us know
            </button>
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onAddPhone}
              className="px-6"
            >
              Add phone number
            </Button>
            <Button
              onClick={onClose}
              className="px-8 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneNumberReminderModal;
