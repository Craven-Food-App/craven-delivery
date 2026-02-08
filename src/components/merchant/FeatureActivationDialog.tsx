/**
 * Feature Activation Dialog
 * Handles enabling/purchasing features like Pickup, Storefront, Instagram, CraveMore, and Drive On-Demand.
 * Records feature activation in Supabase and redirects as needed.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, Rocket, Zap, ExternalLink } from "lucide-react";

export type FeatureType =
  | "instagram"
  | "storefront"
  | "cravemore"
  | "pickup"
  | "drive_on_demand"
  | "alcohol";

interface FeatureActivationDialogProps {
  open: boolean;
  onClose: () => void;
  feature: FeatureType;
  restaurantId?: string;
  onActivated?: () => void;
}

const FEATURE_CONFIG: Record<FeatureType, {
  title: string;
  description: string;
  pricing: string;
  steps: string[];
  buttonLabel: string;
}> = {
  instagram: {
    title: "Activate Instagram Ordering",
    description: "Connect your Instagram account to enable direct ordering from your social media profile.",
    pricing: "Free — included with your Crave'N partnership",
    steps: [
      "Connect your Instagram business account",
      "We'll sync your menu items automatically",
      "An 'Order Now' button will appear on your profile",
      "Start receiving orders within 24 hours",
    ],
    buttonLabel: "Activate Instagram Ordering",
  },
  storefront: {
    title: "Set Up Branded Storefront",
    description: "Create a custom ordering page for commission-free direct orders from your website.",
    pricing: "$49/month — commission-free direct orders",
    steps: [
      "Choose your brand colors and upload your logo",
      "Your menu syncs automatically from Crave'N",
      "Embed on your website or use a standalone page",
      "Start accepting commission-free orders immediately",
    ],
    buttonLabel: "Activate Storefront",
  },
  cravemore: {
    title: "Opt Into CraveMore",
    description: "Get priority placement with CraveMore subscribers who order 3.2x more frequently.",
    pricing: "Free — no cost to your restaurant",
    steps: [
      "Opt in to the CraveMore merchant program",
      "Your restaurant appears in CraveMore member feeds",
      "Members see your restaurant with a 'Free Delivery' badge",
      "Track CraveMore-driven orders in your dashboard",
    ],
    buttonLabel: "Join CraveMore Program",
  },
  pickup: {
    title: "Enable Pickup Orders",
    description: "Let customers order ahead and pick up at your location. Zero fees, zero commission.",
    pricing: "Free — 0% commission on pickup orders",
    steps: [
      "Enable pickup in your store settings",
      "Set your pickup hours and preparation times",
      "Customers can choose pickup at checkout",
      "Orders appear on your tablet like delivery orders",
    ],
    buttonLabel: "Enable Pickup",
  },
  drive_on_demand: {
    title: "Activate Drive On-Demand",
    description: "Use Crave'N's Feeder network to fulfill deliveries from any ordering channel.",
    pricing: "Pay per delivery — $4.99-$8.99 depending on distance",
    steps: [
      "Add your external ordering channels (phone, website, etc.)",
      "When an order comes in, request a Feeder with one tap",
      "Track the delivery in real time",
      "Pay per delivery — no subscription needed",
    ],
    buttonLabel: "Add Delivery Channel",
  },
  alcohol: {
    title: "Add Alcohol to Your Menu",
    description: "Expand your menu with alcoholic beverages. Average order value increases by 23%.",
    pricing: "Free to enable — standard Crave'N commission applies",
    steps: [
      "Confirm your liquor license details",
      "Add alcohol items to your menu",
      "Crave'N handles age verification at delivery",
      "Start selling immediately after review (1-2 business days)",
    ],
    buttonLabel: "Enable Alcohol Sales",
  },
};

const FeatureActivationDialog: React.FC<FeatureActivationDialogProps> = ({
  open,
  onClose,
  feature,
  restaurantId,
  onActivated,
}) => {
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const config = FEATURE_CONFIG[feature];

  const handleActivate = async () => {
    setActivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in");
        return;
      }

      // Record feature activation in marketing_campaigns for tracking
      const { error } = await supabase.from("marketing_campaigns").insert({
        campaign_name: `Feature: ${config.title}`,
        campaign_type: "feature_activation",
        channel: feature,
        objective: config.description,
        start_date: new Date().toISOString().split("T")[0],
        budget: 0,
        status: "active",
        target_audience: "merchant",
        created_by: user.id,
        metadata: {
          feature_type: feature,
          restaurant_id: restaurantId,
          activated_at: new Date().toISOString(),
        },
      });

      if (error) {
        console.error("Error recording activation:", error);
        toast.error("Failed to activate feature: " + error.message);
        return;
      }

      setActivated(true);
      toast.success(`${config.title} — activated successfully!`);
      onActivated?.();
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setActivating(false);
    }
  };

  const handleClose = () => {
    setActivated(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription className="mt-2">{config.description}</DialogDescription>
        </DialogHeader>

        {!activated ? (
          <>
            {/* Pricing */}
            <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{config.pricing}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold">How it works</p>
              <ol className="space-y-2">
                {config.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleActivate} disabled={activating}>
                {activating ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-1" />
                )}
                {activating ? "Activating..." : config.buttonLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="mt-4 text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Feature Activated!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {config.title} has been activated for your store. You can manage this from your merchant dashboard.
              </p>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeatureActivationDialog;


