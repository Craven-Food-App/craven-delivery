import { GripVertical } from 'lucide-react';

interface SignatureTagProps {
  type: 'signature' | 'initial';
  dataUrl: string;
  label: string;
  onDragStart: (type: 'signature' | 'initial') => void;
}

export const SignatureTag = ({ type, dataUrl, label, onDragStart }: SignatureTagProps) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(type)}
      className="bg-card border-2 border-border rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="bg-white border border-border rounded p-2 flex items-center justify-center min-h-[60px]">
        {dataUrl ? (
          <img 
            src={dataUrl} 
            alt={label}
            className="max-h-[50px] object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Not adopted yet</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Drag to place on document
      </div>
    </div>
  );
};
