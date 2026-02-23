import type { Config } from "tailwindcss";
import rootConfig from "../../../tailwind.config";

const root = rootConfig as { theme?: { extend?: { colors?: Record<string, string> } } };
const rootColors = root.theme?.extend?.colors ?? {};

export default {
  ...rootConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../../src/**/*.{ts,tsx}",
  ],
  theme: {
    ...rootConfig.theme,
    extend: {
      ...rootConfig.theme?.extend,
      colors: {
        ...rootColors,
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  safelist: [
    "border-border",
    "bg-background",
    "text-foreground",
  ],
} satisfies Config;
