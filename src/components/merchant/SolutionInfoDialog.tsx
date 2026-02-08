/**
 * Solution Info Dialog
 * Displays "Learn More" details for each solution in the Solutions Center.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export type SolutionInfoType =
  | "alcohol"
  | "advertise"
  | "instagram"
  | "storefront"
  | "cravemore"
  | "pickup"
  | "drive_on_demand"
  | "campaign_types";

interface SolutionInfoDialogProps {
  open: boolean;
  onClose: () => void;
  type: SolutionInfoType;
  onAction?: () => void;
}

const SOLUTION_INFO: Record<SolutionInfoType, { title: string; description: string; benefits: string[]; actionLabel: string }> = {
  alcohol: {
    title: "Add Alcohol to Your Menu",
    description: "Expand your menu with alcoholic beverages. Restaurants that offer alcohol through Crave'N see an average 23% increase in order value.",
    benefits: [
      "Higher average order value — alcohol adds $8-15 per order",
      "Attract evening and weekend customers looking for full dining experiences",
      "Crave'N handles compliance checks — age verification at delivery",
      "No additional hardware needed — managed through your existing menu dashboard",
      "Opt-in by city/state — we guide you through local regulations",
    ],
    actionLabel: "Add Alcohol to Menu",
  },
  advertise: {
    title: "Advertise to Customers on Crave'N",
    description: "Sponsored listings put your restaurant in front of hungry customers who are actively searching for food. You only pay when a customer clicks.",
    benefits: [
      "Appear at the top of search results and cuisine categories",
      "Pay-per-click pricing — only pay when customers engage",
      "Target by location, time of day, and cuisine preferences",
      "Real-time performance dashboard with impressions, clicks, and ROI",
      "Set daily or campaign budgets — pause anytime",
    ],
    actionLabel: "Create a Campaign",
  },
  campaign_types: {
    title: "Campaign Types",
    description: "Choose from several campaign formats to reach customers at different stages of their journey.",
    benefits: [
      "Sponsored Listings — appear at the top of search results",
      "Banner Ads — featured placement on the home screen",
      "Push Notifications — reach customers directly on their device",
      "Email Campaigns — targeted emails to opted-in customers",
      "Combo Deals — bundled promotions that appear in the deals section",
    ],
    actionLabel: "Create a Campaign",
  },
  instagram: {
    title: "Instagram Ordering Integration",
    description: "Let customers order directly from your Instagram profile. Link your restaurant's Instagram to Crave'N for seamless social-to-order flow.",
    benefits: [
      "Add an 'Order Now' button to your Instagram bio and stories",
      "Shoppable posts — tag menu items in photos for direct ordering",
      "Track social-driven orders with dedicated analytics",
      "Automatic menu sync — changes to your Crave'N menu update instantly",
      "No additional fees — included with your Crave'N partnership",
    ],
    actionLabel: "Connect Instagram",
  },
  storefront: {
    title: "Branded Storefront",
    description: "Create a custom, branded ordering page for your restaurant. Embed it on your website for commission-free direct orders.",
    benefits: [
      "Commission-free orders — keep 100% of revenue from direct orders",
      "Custom branding — your logo, colors, and domain",
      "Embedded widget or standalone page — your choice",
      "Built-in analytics and customer data ownership",
      "SEO-optimized pages for organic search traffic",
    ],
    actionLabel: "Set Up Storefront",
  },
  cravemore: {
    title: "CraveMore Membership",
    description: "CraveMore subscribers order 3.2x more frequently. When members order from your restaurant, you benefit from higher lifetime value customers.",
    benefits: [
      "CraveMore members get free delivery — removing the #1 order barrier",
      "Members order 3.2x more often than non-members",
      "Priority placement in CraveMore member feeds",
      "No additional cost to you — Crave'N subsidizes the membership benefits",
      "Access to CraveMore-exclusive promotions and co-marketing",
    ],
    actionLabel: "Learn About CraveMore",
  },
  pickup: {
    title: "Pickup Ordering",
    description: "Enable customers to order ahead and pick up at your location. Zero delivery fees, zero commission — a pure revenue channel.",
    benefits: [
      "Commission-free — 0% Crave'N fees on pickup orders",
      "No delivery fee for customers — removes the biggest order barrier",
      "Reduce kitchen wait times with pre-scheduled orders",
      "Curbside and in-store pickup options",
      "Integrated with your existing Crave'N menu and tablet",
    ],
    actionLabel: "Enable Pickup",
  },
  drive_on_demand: {
    title: "Drive On-Demand",
    description: "Use Crave'N's Feeder network to fulfill deliveries from your own ordering channels — phone orders, your website, or third-party apps.",
    benefits: [
      "Access Crave'N's entire Feeder delivery network on demand",
      "Fulfill orders from any channel — phone, website, third-party apps",
      "Real-time driver tracking and ETAs",
      "Pay per delivery — no subscription or commitment",
      "API integration available for automated dispatch",
    ],
    actionLabel: "Add Delivery Channel",
  },
};

const SolutionInfoDialog: React.FC<SolutionInfoDialogProps> = ({ open, onClose, type, onAction }) => {
  const info = SOLUTION_INFO[type];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription className="mt-2">{info.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold">Key Benefits</p>
          <ul className="space-y-2">
            {info.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onAction && (
            <Button onClick={onAction}>{info.actionLabel}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SolutionInfoDialog;


