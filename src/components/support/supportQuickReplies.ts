// Shared quick-reply templates and department routing options
// used across CS inbox, merchant, customer, and feeder support threads.

export type SupportRole = "support" | "merchant" | "customer" | "driver";

export interface QuickReply {
  label: string;
  body: string;
}

export interface SupportDepartment {
  id: string;
  label: string;
  description: string;
  color: string; // tailwind-friendly hex (orange palette compliant)
}

export const SUPPORT_DEPARTMENTS: SupportDepartment[] = [
  { id: "order_issue",  label: "Order Issue",        description: "Wrong/missing items, prep delays, order accuracy", color: "#f97316" },
  { id: "delivery",     label: "Delivery / Feeder",  description: "Driver assignment, ETA, handoff, route problems",   color: "#7c3aed" },
  { id: "payment",      label: "Payments & Refunds", description: "Charges, refunds, payouts, tips",                   color: "#0ea5e9" },
  { id: "account",      label: "Account & Access",   description: "Login, profile, settings, verification",            color: "#10b981" },
  { id: "safety",       label: "Safety / Urgent",    description: "Safety concerns, escalations, abuse reports",       color: "#dc2626" },
  { id: "merchant_ops", label: "Merchant Ops",       description: "Menu, hours, inventory, store status",              color: "#d97706" },
];

export const QUICK_REPLIES: Record<SupportRole, QuickReply[]> = {
  support: [
    { label: "Greeting",       body: "Hi! This is Crave'N support — I'm reviewing this order now and will help you resolve it." },
    { label: "Investigating",  body: "Thanks for the details. I'm looking into this with the merchant/Feeder right now — one moment." },
    { label: "Refund issued",  body: "I've issued a refund for the affected items. You should see it on your original payment method within 3–5 business days." },
    { label: "Credit applied", body: "I've added Crave'N credit to your account as an apology for the inconvenience." },
    { label: "Driver ETA",     body: "Your Feeder is on the way — current ETA shows in your tracking screen. I'll stay on this thread if anything changes." },
    { label: "Resolved",       body: "Glad we got this sorted. Marking this conversation resolved — reply anytime if anything else comes up." },
  ],
  merchant: [
    { label: "Item 86'd",       body: "We're 86'd on one of the items in this order — please advise the customer or refund the item." },
    { label: "Need more time",  body: "We need a few extra minutes on this order. Please let the customer know." },
    { label: "Driver not here", body: "The assigned Feeder hasn't arrived yet — the order is ready. Can you check on their ETA?" },
    { label: "Customer no-show",body: "The customer is not responding for pickup/dine-in. How would you like us to handle?" },
    { label: "POS issue",       body: "Our POS/tablet is having an issue receiving orders. Please escalate to merchant ops." },
  ],
  customer: [
    { label: "Where's my order?",body: "Hi — can you give me an update on where my order is right now?" },
    { label: "Missing item",     body: "An item is missing from my order. Can you help me get a refund or replacement?" },
    { label: "Wrong item",       body: "I received the wrong item. Can you help fix this?" },
    { label: "Cold / quality",   body: "My order arrived cold / the quality wasn't right. Can someone look into this?" },
    { label: "Cancel order",     body: "I'd like to cancel this order if it hasn't been started yet." },
  ],
  driver: [
    { label: "Store delay",     body: "The store is running behind on this order — what's my best move?" },
    { label: "Can't find addr", body: "I can't locate the delivery address. Customer isn't responding. Please advise." },
    { label: "Wrong order given",body: "The store handed me what appears to be the wrong order. How should I proceed?" },
    { label: "Vehicle issue",   body: "I'm having a vehicle issue mid-delivery. Need help reassigning." },
    { label: "Unsafe situation",body: "I have a safety concern at this address. Please escalate." },
  ],
};
