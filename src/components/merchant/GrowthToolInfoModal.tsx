/**
 * Growth Tool Info Modal
 *
 * Informational-only modal for optional flat-fee growth tools.
 * Desktop: centered dialog. Mobile: bottom-sheet drawer.
 * No commission values, no "Upgrade" CTAs, no ROI promises.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, X, DollarSign, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/* ──────────────────────────────────────────────
   Tool type & content definitions
   ────────────────────────────────────────────── */
export type GrowthToolType =
  | "local_boost"
  | "category_feature"
  | "city_spotlight";

interface ToolSection {
  title: string;
  description: string;
  whatItDoes: string[];
  whatItDoesNot: string[];
  billing: string[];
  bestFor: string[];
}

const TOOL_CONTENT: Record<GrowthToolType, ToolSection> = {
  local_boost: {
    title: "Local Boost",
    description:
      "Local Boost increases your store's visibility to customers within your existing delivery radius.",
    whatItDoes: [
      "Your store is ranked higher in local search results",
      "Your store appears more frequently in nearby browse views",
      "Your store is prioritized during peak ordering windows in your area",
    ],
    whatItDoesNot: [
      "Does not change your commission rate",
      "Does not affect pickup pricing",
      "Does not expand your delivery radius",
      "Does not guarantee additional orders",
    ],
    billing: [
      "$39 billed monthly",
      "Can be turned on or off at any time",
      "Takes effect immediately after activation",
    ],
    bestFor: [
      "Stores with reliable prep times",
      "Locations with repeat local customers",
      "Merchants focused on nearby demand",
    ],
  },
  category_feature: {
    title: "Category Feature",
    description:
      "Category Feature highlights your store within your primary cuisine category.",
    whatItDoes: [
      "Your store receives featured placement on category browse pages",
      "Your store is more visible when customers filter by cuisine",
      "Your store gains priority exposure in category-driven discovery",
    ],
    whatItDoesNot: [
      "Does not change commission or fees",
      "Does not override ratings or reliability signals",
      "Does not replace organic performance-based ranking",
    ],
    billing: [
      "$79 billed monthly",
      "Category is determined by your menu configuration",
      "Feature updates automatically if your primary category changes",
    ],
    bestFor: [
      "Stores in competitive cuisine categories",
      "Merchants promoting new menu items",
      "Locations seeking category-level visibility",
    ],
  },
  city_spotlight: {
    title: "City Spotlight",
    description:
      "City Spotlight features your store on the Crave'n city homepage.",
    whatItDoes: [
      "Your store appears in a rotating spotlight position for your city",
      "Your store is visible to both browsing and returning customers",
      "Your store is presented as a highlighted local option",
    ],
    whatItDoesNot: [
      "Does not change commission rates",
      "Does not affect delivery or pickup fees",
      "Does not guarantee placement duration or order volume",
    ],
    billing: [
      "$149 billed monthly",
      "Placement rotates fairly among spotlighted merchants",
      "Availability may be limited based on city size and demand",
    ],
    bestFor: [
      "Established locations",
      "High-capacity kitchens",
      "Merchants seeking city-wide exposure",
    ],
  },
};

const FOOTER_COPY =
  "Growth tools are optional promotional features. Visibility improvements depend on customer behavior, store performance, and market conditions. Commission rates and pickup pricing are never affected.";

/* ──────────────────────────────────────────────
   Shared inner content (used by both Dialog & Drawer)
   ────────────────────────────────────────────── */
interface InnerContentProps {
  tool: ToolSection;
  onClose: () => void;
}

const InnerContent: React.FC<InnerContentProps> = ({ tool, onClose }) => (
  <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-1">
    {/* What it does */}
    <section>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <Check className="w-4 h-4 text-green-600" />
        What it does
      </h4>
      <ul className="space-y-1.5 pl-6">
        {tool.whatItDoes.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>

    {/* What it does not do */}
    <section>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <X className="w-4 h-4 text-red-500" />
        What it does not do
      </h4>
      <ul className="space-y-1.5 pl-6">
        {tool.whatItDoesNot.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>

    {/* Billing & Control */}
    <section>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        Billing & Control
      </h4>
      <ul className="space-y-1.5 pl-6">
        {tool.billing.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>

    {/* Best for */}
    <section>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-muted-foreground" />
        Best for
      </h4>
      <ul className="space-y-1.5 pl-6">
        {tool.bestFor.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>

    {/* Footer */}
    <p className="text-xs text-muted-foreground border-t pt-4">
      {FOOTER_COPY}
    </p>

    {/* Close action — no "Upgrade" CTA */}
    <div className="flex justify-end pt-2">
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   Exported component
   ────────────────────────────────────────────── */
interface GrowthToolInfoModalProps {
  open: boolean;
  onClose: () => void;
  toolType: GrowthToolType | null;
}

const GrowthToolInfoModal: React.FC<GrowthToolInfoModalProps> = ({
  open,
  onClose,
  toolType,
}) => {
  const isMobile = useIsMobile();

  if (!toolType) return null;
  const tool = TOOL_CONTENT[toolType];

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{tool.title}</DrawerTitle>
            <DrawerDescription>{tool.description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <InnerContent tool={tool} onClose={onClose} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tool.title}</DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>
        <InnerContent tool={tool} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default GrowthToolInfoModal;





