import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface CraveMoreStatusChipProps {
  foundingMember?: boolean;
  planKey?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CraveMoreStatusChip: React.FC<CraveMoreStatusChipProps> = ({
  foundingMember = false,
  planKey,
  size = 'sm',
}) => {
  if (foundingMember) {
    return (
      <Badge
        variant="default"
        className={`bg-orange-600 text-white flex items-center gap-1 ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'md' ? 'text-sm px-3 py-1' : 'text-base px-4 py-1.5'
        }`}
      >
        <Crown className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
        Founding Member
      </Badge>
    );
  }

  if (planKey) {
    return (
      <Badge
        variant="outline"
        className={`text-orange-600 border-orange-600 ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'md' ? 'text-sm px-3 py-1' : 'text-base px-4 py-1.5'
        }`}
      >
        CraveMore {planKey}
      </Badge>
    );
  }

  return null;
};

