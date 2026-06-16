import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_CATEGORIES, type PartyType } from "./ratingPresets";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string | null;
  reporterType: PartyType;
  reportedType: PartyType;
  reportedId: string;
  /** Friendly label for who is being reported (e.g. "this customer"). */
  reportedLabel?: string;
  onSubmitted?: () => void;
}

/**
 * Trust & Safety report dialog. Submissions route through submit_trust_report so
 * the reporter never has to surface counterparty data they shouldn't see.
 * Reports are reviewed by Craven Trust & Safety; they do not auto-deduct stars.
 */
export function ReportDialog({
  open,
  onOpenChange,
  orderId,
  reporterType,
  reportedType,
  reportedId,
  reportedLabel = "this user",
  onSubmitted,
}: ReportDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setCategory(""); setDescription(""); setSubmitting(false); };

  const handleSubmit = async () => {
    const preset = REPORT_CATEGORIES.find(c => c.id === category);
    if (!preset) { toast.error("Pick a reason"); return; }
    if (description.trim().length < 10) {
      toast.error("Please add a brief description (10+ characters)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_trust_report", {
      p_order_id: orderId ?? null,
      p_reporter_type: reporterType,
      p_reported_type: reportedType,
      p_reported_id: reportedId,
      p_category: preset.id,
      p_severity: preset.severity,
      p_description: description.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not submit report");
      return;
    }
    toast.success("Report submitted. Crave'N Trust & Safety will review it.");
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {reportedLabel}</DialogTitle>
          <DialogDescription>
            Reports are reviewed by Crave'N Trust &amp; Safety. Your identity is not
            shared with the reported party.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-category">Reason</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="report-category">
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-description">What happened?</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share enough detail for our team to act on this."
              maxLength={1000}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}