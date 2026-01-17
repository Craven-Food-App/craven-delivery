import cravemoreIcon from "@/assets/cravemore-icon.png";

interface CraveMoreTextProps {
  className?: string;
}

export const CraveMoreText = ({ className = "" }: CraveMoreTextProps) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <img src={cravemoreIcon} alt="CraveMore" className="w-[15px] h-[14px] inline-block"/>
      <span>CraveMore</span>
    </span>
  );
};
