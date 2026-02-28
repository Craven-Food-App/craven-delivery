import cravemoreIcon from "@/assets/cravemore-icon.png";

interface CraveMoreTextProps {
  className?: string;
}

export const CraveMoreText = ({ className = "" }: CraveMoreTextProps) => {
  return (
    <span className={`inline-flex items-center justify-center gap-1 leading-none [&_img]:align-middle ${className}`}>
      <img src={cravemoreIcon} alt="CraveMore" className="w-[15px] h-[14px] block object-contain" />
      <span className="leading-none">CraveMore</span>
    </span>
  );
};
