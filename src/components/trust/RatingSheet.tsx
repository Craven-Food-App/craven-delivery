import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COMPLIMENT_TAGS, ISSUE_TAGS, type PartyType } from "./ratingPresets";

export interface RatingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  raterType: PartyType;
  rateeType: PartyType;
  rateeId: string;
  /** Friendly label for the rated party shown in the header (e.g. "your feeder", "Joe's Pizza"). */
  rateeLabel: string;
  onSubmitted?: () => void;
}

/**
 * Post-delivery rating sheet shared by customer, feeder, and merchant flows.
 * Stars + preset tags (compliments or issues) + optional comment.
 * Submission goes through the submit_order_rating RPC so the rated party's id is
 * never round-tripped through a writeable client query.
 */
export function RatingSheet({
  open,
  onOpenChange,
  orderId,
  raterType,
  rateeType,
  rateeId,
  rateeLabel,
  onSubmitted,
}: RatingSheetProps) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tagOptions =
    stars === 0 ? [] :
    stars >= 4 ? COMPLIMENT_TAGS[rateeType].map(t => ({ id: t.id, label: `${t.icon} ${t.label}` }))
               : ISSUE_TAGS[rateeType];

  const toggleTag = (id: string) =>
    setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const reset = () => {
    setStars(0); setHover(0); setTags([]); setComment(""); setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_order_rating", {
      p_order_id: orderId,
      p_rater_type: raterType,
      p_ratee_type: rateeType,
      p_ratee_id: rateeId,
      p_stars: stars,
      p_tags: tags,
      p_comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not submit rating");
      return;
    }
    toast.success("Thanks for your feedback!");
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  const handleSkip = () => { reset(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {rateeLabel}</DialogTitle>
          <DialogDescription>
            Your rating is anonymous and helps keep the Crave'N community strong.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1 py-3">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || stars) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
                className="p-1 transition-transform active:scale-95"
              >
                <Star
                  className={`h-9 w-9 ${active ? "fill-orange-500 text-orange-500" : "text-muted-foreground"}`}
                />
              </button>
            );
          })}
        </div>

        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((opt) => {
              const selected = tags.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleTag(opt.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selected
                      ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a short note (optional)"
          maxLength={500}
          rows={3}
          className="resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={submitting}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || stars === 0} className="bg-orange-500 hover:bg-orange-600">
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}