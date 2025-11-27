import { Lock, LockOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlacedSignature {
  id: string;
  type: 'signature' | 'initial';
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  dataUrl: string;
  isLocked: boolean;
  placedAt: string;
}

interface PlacedSignatureItemProps {
  signature: PlacedSignature;
  onLock: (id: string) => void;
  onDelete: (id: string) => void;
  onReposition: (id: string) => void;
}

export const PlacedSignatureItem = ({ signature, onLock, onDelete, onReposition }: PlacedSignatureItemProps) => {
  return (
    <div className={`bg-card border rounded-lg p-3 ${signature.isLocked ? 'border-green-500' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {signature.isLocked ? (
            <Lock className="w-4 h-4 text-green-600" />
          ) : (
            <LockOpen className="w-4 h-4 text-orange-500" />
          )}
          <span className="text-sm font-medium">
            {signature.type === 'signature' ? 'Signature' : 'Initial'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Page {signature.pageNumber}</span>
      </div>
      
      <div className="bg-white border border-border rounded p-2 mb-2 flex items-center justify-center min-h-[40px]">
        <img 
          src={signature.dataUrl} 
          alt={signature.type}
          className="max-h-[30px] object-contain"
        />
      </div>
      
      <div className="flex gap-2">
        {!signature.isLocked ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => onLock(signature.id)}
              className="flex-1"
            >
              <Lock className="w-3 h-3 mr-1" />
              Lock
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(signature.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <div className="flex-1 text-center text-xs text-green-600 font-medium py-1">
            Locked in place
          </div>
        )}
      </div>
    </div>
  );
};
