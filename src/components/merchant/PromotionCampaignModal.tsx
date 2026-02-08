/**
 * Promotion Campaign Modal
 * Multi-step form for creating discount/promo campaigns.
 * Writes to the `promo_codes` table in Supabase.
 * 
 * Supports campaign types:
 * - new_customer_discount: Discount for first-time customers
 * - lapsed_customer_discount: Win-back discount for lapsed customers
 * - all_customer_discount: Discount for all customers
 * - free_delivery: $0 delivery fee for first order
 * - item_discount: Discount on specific menu items or bundles
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Circle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export type PromotionType =
  | "new_customer_discount"
  | "lapsed_customer_discount"
  | "all_customer_discount"
  | "free_delivery"
  | "item_discount";

interface PromotionCampaignModalProps {
  open: boolean;
  onClose: () => void;
  promotionType: PromotionType;
  onSuccess?: () => void;
}

const PROMOTION_CONFIG: Record<PromotionType, { title: string; description: string; defaultEligibility: string }> = {
  new_customer_discount: {
    title: "Discount for New Customers",
    description: "Offer first-time customers a discount on their first order to drive trial.",
    defaultEligibility: "new",
  },
  lapsed_customer_discount: {
    title: "Discount for Lapsed Customers",
    description: "Win back customers who haven't ordered in a while with a special offer.",
    defaultEligibility: "lapsed",
  },
  all_customer_discount: {
    title: "Discount for All Customers",
    description: "Boost order frequency with a discount available to every customer.",
    defaultEligibility: "all",
  },
  free_delivery: {
    title: "First Order: $0 Delivery Fee",
    description: "Waive the delivery fee on a customer's first order from your store.",
    defaultEligibility: "new",
  },
  item_discount: {
    title: "First Item or Discounted Items",
    description: "Drive larger orders with discounts on specific menu items or bundles.",
    defaultEligibility: "all",
  },
};

interface FormData {
  name: string;
  code: string;
  discountType: "percentage" | "amount";
  discountPercentage: string;
  discountAmountCents: string;
  minimumOrderCents: string;
  maximumDiscountCents: string;
  description: string;
  validFrom: string;
  validUntil: string;
  usageLimit: string;
  perUserLimit: string;
}

const STEPS = [
  { id: 1, name: "Campaign details" },
  { id: 2, name: "Discount rules" },
  { id: 3, name: "Schedule & limits" },
  { id: 4, name: "Review & launch" },
];

const generatePromoCode = (type: PromotionType): string => {
  const prefix: Record<PromotionType, string> = {
    new_customer_discount: "NEW",
    lapsed_customer_discount: "WINBACK",
    all_customer_discount: "SAVE",
    free_delivery: "FREEDEL",
    item_discount: "DEAL",
  };
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix[type]}${random}`;
};

const PromotionCampaignModal: React.FC<PromotionCampaignModalProps> = ({
  open,
  onClose,
  promotionType,
  onSuccess,
}) => {
  const config = PROMOTION_CONFIG[promotionType];
  const today = new Date().toISOString().split("T")[0];

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: generatePromoCode(promotionType),
    discountType: promotionType === "free_delivery" ? "amount" : "percentage",
    discountPercentage: promotionType === "new_customer_discount" ? "15" : promotionType === "lapsed_customer_discount" ? "20" : "10",
    discountAmountCents: promotionType === "free_delivery" ? "999" : "",
    minimumOrderCents: "1500",
    maximumDiscountCents: "",
    description: "",
    validFrom: today,
    validUntil: "",
    usageLimit: "",
    perUserLimit: "1",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Please complete all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to create a promotion");
        return;
      }

      const discountPercentage = formData.discountType === "percentage" ? parseFloat(formData.discountPercentage) || null : null;
      const discountAmountCents = formData.discountType === "amount" ? parseInt(formData.discountAmountCents, 10) || null : null;

      const promoType = promotionType === "free_delivery" ? "free_delivery" : "discount";

      const { error } = await supabase.from("promo_codes").insert({
        name: formData.name,
        code: formData.code.toUpperCase(),
        type: promoType,
        discount_percentage: discountPercentage,
        discount_amount_cents: discountAmountCents,
        minimum_order_cents: parseInt(formData.minimumOrderCents, 10) || null,
        maximum_discount_cents: formData.maximumDiscountCents ? parseInt(formData.maximumDiscountCents, 10) : null,
        description: formData.description || config.description,
        customer_eligibility: config.defaultEligibility,
        valid_from: formData.validFrom,
        valid_until: formData.validUntil || null,
        usage_limit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        per_user_limit: parseInt(formData.perUserLimit, 10) || 1,
        is_active: true,
        created_by: user.id,
        applicable_to: promotionType === "item_discount" ? "specific_items" : "all_items",
      });

      if (error) {
        console.error("Error creating promotion:", error);
        toast.error("Failed to create promotion: " + error.message);
        return;
      }

      // Also create a marketing_campaigns record for tracking
      await supabase.from("marketing_campaigns").insert({
        campaign_name: formData.name,
        campaign_type: promotionType,
        channel: "in_app",
        objective: config.title,
        start_date: formData.validFrom,
        end_date: formData.validUntil || null,
        budget: 0,
        status: "active",
        target_audience: config.defaultEligibility,
        created_by: user.id,
        metadata: {
          promo_code: formData.code.toUpperCase(),
          discount_type: formData.discountType,
          discount_value: formData.discountType === "percentage" ? formData.discountPercentage : formData.discountAmountCents,
        },
      });

      toast.success(`Promotion "${formData.name}" created successfully!`);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      code: generatePromoCode(promotionType),
      discountType: promotionType === "free_delivery" ? "amount" : "percentage",
      discountPercentage: "15",
      discountAmountCents: promotionType === "free_delivery" ? "999" : "",
      minimumOrderCents: "1500",
      maximumDiscountCents: "",
      description: "",
      validFrom: today,
      validUntil: "",
      usageLimit: "",
      perUserLimit: "1",
    });
  };

  const formatCents = (cents: string) => {
    const num = parseInt(cents, 10);
    if (isNaN(num)) return "$0.00";
    return `$${(num / 100).toFixed(2)}`;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium">{config.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
            </div>
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={`e.g. ${config.title} — Spring 2026`}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="code">Promo Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => updateField("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="AUTO-GENERATED"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Customers will enter this code at checkout.</p>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Internal note or customer-facing description"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            {promotionType !== "free_delivery" && (
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(v) => updateField("discountType", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage off</SelectItem>
                    <SelectItem value="amount">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.discountType === "percentage" ? (
              <div>
                <Label>Discount Percentage *</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => updateField("discountPercentage", e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div>
                <Label>Discount Amount (in cents) *</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="1"
                    value={formData.discountAmountCents}
                    onChange={(e) => updateField("discountAmountCents", e.target.value)}
                    placeholder={promotionType === "free_delivery" ? "999 = $9.99 delivery fee waived" : "500 = $5.00 off"}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    = {formatCents(formData.discountAmountCents)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label>Minimum Order (cents)</Label>
              <Input
                type="number"
                min="0"
                value={formData.minimumOrderCents}
                onChange={(e) => updateField("minimumOrderCents", e.target.value)}
                placeholder="1500 = $15.00 minimum"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum order value to qualify. {formData.minimumOrderCents ? formatCents(formData.minimumOrderCents) : "$0.00"}
              </p>
            </div>

            {formData.discountType === "percentage" && (
              <div>
                <Label>Maximum Discount Cap (cents, optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maximumDiscountCents}
                  onChange={(e) => updateField("maximumDiscountCents", e.target.value)}
                  placeholder="Leave blank for no cap"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => updateField("validFrom", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => updateField("validUntil", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for no end date</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Usage Limit (optional)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => updateField("usageLimit", e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Per-Customer Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.perUserLimit}
                  onChange={(e) => updateField("perUserLimit", e.target.value)}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Audience: {config.defaultEligibility === "new" ? "New customers only" : config.defaultEligibility === "lapsed" ? "Lapsed customers (30+ days inactive)" : "All customers"}</p>
              <p className="text-xs text-blue-700 mt-1">This is set automatically based on the campaign type you selected.</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Review Your Promotion</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Name:</span>
                  <span className="font-medium text-green-900">{formData.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Promo Code:</span>
                  <span className="font-mono font-medium text-green-900">{formData.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Discount:</span>
                  <span className="font-medium text-green-900">
                    {formData.discountType === "percentage" ? `${formData.discountPercentage}% off` : formatCents(formData.discountAmountCents) + " off"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Min Order:</span>
                  <span className="font-medium text-green-900">{formatCents(formData.minimumOrderCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Audience:</span>
                  <span className="font-medium text-green-900 capitalize">{config.defaultEligibility} customers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Starts:</span>
                  <span className="font-medium text-green-900">{formData.validFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Ends:</span>
                  <span className="font-medium text-green-900">{formData.validUntil || "No end date"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Usage Limit:</span>
                  <span className="font-medium text-green-900">{formData.usageLimit || "Unlimited"}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once launched, the promotion will be immediately active and available to qualifying customers at checkout.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <h2 className="text-lg font-bold">{config.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}</p>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((step) => (
            <div key={step.id} className="flex items-center gap-1 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step.id < currentStep
                    ? "bg-green-600 text-white"
                    : step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {step.id < STEPS.length && (
                <div className={`flex-1 h-0.5 ${step.id < currentStep ? "bg-green-600" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between">
          <Button
            variant="outline"
            onClick={() => (currentStep === 1 ? (resetForm(), onClose()) : setCurrentStep(currentStep - 1))}
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.name || !formData.code}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              {submitting ? "Creating..." : "Launch Promotion"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionCampaignModal;






