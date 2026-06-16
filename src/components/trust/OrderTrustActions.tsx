import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Flag } from "lucide-react";
import { RatingSheet } from "./RatingSheet";
import { ReportDialog } from "./ReportDialog";
import type { PartyType } from "./ratingPresets";

export interface OrderTrustActionsProps {
  orderId: string;
  /** The party using this control. */
  raterType: PartyType;
  /** The party being rated/reported. */
  rateeType: PartyType;
  rateeId: string;
  rateeLabel: string;
  /** Visual variant — defaults to compact pill buttons suitable for order rows. */
  size?: "sm" | "default";
  className?: string;
  /** Hide one of the two buttons if needed. */
  showRate?: boolean;
  showReport?: boolean;
  onRated?: () => void;
  onReported?: () => void;
}

/**
 * Drop-in "Rate" + "Report" pair for any order row across customer, feeder, and
 * merchant surfaces. Pass the ids you have; everything else is local UI state.
 */
export function OrderTrustActions({
  orderId,
  raterType,
  rateeType,
  rateeId,
  rateeLabel,
  size = "sm",
  className,
  showRate = true,
  showReport = true,
  onRated,
  onReported,
}: OrderTrustActionsProps) {
  const [rateOpen, setRateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {showRate && (
        <Button
          type="button"
          size={size}
          variant="outline"
          className="gap-1.5 border-orange-500/40 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300"
          onClick={(e) => { e.stopPropagation(); setRateOpen(true); }}
        >
          <Star className="h-3.5 w-3.5" />
          Rate
        </Button>
      )}
      {showReport && (
        <Button
          type="button"
          size={size}
          variant="outline"
          className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
        >
          <Flag className="h-3.5 w-3.5" />
          Report
        </Button>
      )}

      <RatingSheet
        open={rateOpen}
        onOpenChange={setRateOpen}
        orderId={orderId}
        raterType={raterType}
        rateeType={rateeType}
        rateeId={rateeId}
        rateeLabel={rateeLabel}
        onSubmitted={onRated}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        orderId={orderId}
        reporterType={raterType}
        reportedType={rateeType}
        reportedId={rateeId}
        reportedLabel={rateeLabel}
        onSubmitted={onReported}
      />
    </div>
  );
}