import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Globe, Bell, Store, Wrench, Heart } from "lucide-react";

const RELEASE_NOTES = {
  title: "What's New in Crave'n",
  date: "March 2026",
  items: [
    {
      icon: Globe,
      title: "Marketplace in your area",
      description:
        "Browse restaurants, retail, and malls near you—same great experience in any US city. Results are tailored to your location within a 25–30 mile radius.",
    },
    {
      icon: MapPin,
      title: "Smarter map & locations",
      description:
        "Map view shows nearby merchants based on where you are. Pins update when you move or change your delivery address.",
    },
    {
      icon: Store,
      title: "Request or get notified",
      description:
        "See a store that’s not available yet? Request it or tap “Notify me” and we’ll let you know when it’s on Crave’n.",
    },
    {
      icon: Bell,
      title: "What’s New in the app",
      description:
        "Check Account → What’s New anytime to see the latest features and improvements.",
    },
    {
      icon: Wrench,
      title: "Stability & polish",
      description: "Bug fixes and performance improvements across the app.",
    },
  ],
  tagline: "Crave it. Order it. Get it delivered.",
};

const WhatsNew: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {RELEASE_NOTES.title}
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground mb-6">
          {RELEASE_NOTES.date}
        </p>

        <ul className="space-y-5">
          {RELEASE_NOTES.items.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex gap-4 items-start"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 mb-0.5">
                    {item.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center">
          <p className="text-base font-semibold text-primary flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" />
            {RELEASE_NOTES.tagline}
          </p>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
};

export default WhatsNew;
