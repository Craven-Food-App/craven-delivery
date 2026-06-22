import cxLogo from "@/assets/cx-logo.png";

const SIZES = {
  sm: 28,
  md: 32,
  lg: 40,
  xl: 48,
} as const;

type Size = keyof typeof SIZES;

export function CXLogo({ size = "md", className = "" }: { size?: Size; className?: string }) {
  const px = SIZES[size];
  return (
    <img
      src={cxLogoAsset.url}
      alt="Crave'N Express"
      width={px}
      height={px}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
