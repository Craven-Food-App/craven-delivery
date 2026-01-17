import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  Eye,
  EyeOff,
  Grid2X2,
  Columns
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface Document {
  key: string;
  label: string;
  url: string | null;
  icon: any;
  required: boolean;
  description: string;
  color: string;
  bgColor: string;
}

interface DocumentImageViewerProps {
  documents: Document[];
  restaurant: any;
}

export function DocumentImageViewer({ documents, restaurant }: DocumentImageViewerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fullscreenDoc, setFullscreenDoc] = useState<Document | null>(null);

  const uploadedDocs = documents.filter(d => d.url);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleDownload = (doc: Document) => {
    if (!doc.url) return;
    window.open(doc.url, '_blank');
  };

  const getFileType = (url: string | null): 'image' | 'pdf' | 'unknown' => {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) return 'pdf';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'image';
    return 'unknown';
  };

  const renderDocumentPreview = (doc: Document, className?: string, style?: any) => {
    const fileType = getFileType(doc.url);

    if (fileType === 'pdf') {
      return (
        <iframe
          src={doc.url || ''}
          className={`w-full h-full ${className || ''}`}
          style={style}
          title={doc.label}
        />
      );
    }

    if (fileType === 'image') {
      return (
        <img
          src={doc.url || ''}
          alt={doc.label}
          className={`w-full h-full object-contain ${className || ''}`}
          style={style}
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-6">
        <EyeOff className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Document preview not available
        </p>
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Use the download button to view the file
        </p>
        <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    );
  };

  if (uploadedDocs.length === 0) {
    return (
      <div className="text-center py-12">
        <EyeOff className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No Documents Uploaded</p>
        <p className="text-sm text-muted-foreground mt-1">
          The restaurant hasn't uploaded any documents yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View Mode:</span>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid2X2 className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'single' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('single')}
              className="rounded-l-none"
            >
              <Columns className="h-4 w-4 mr-1" />
              Single
            </Button>
          </div>
        </div>

        {viewMode === 'single' && selectedDoc && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Grid View - All Documents Side by Side */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-4">
          {uploadedDocs.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card key={doc.key} className="overflow-hidden">
                <CardHeader className={`${doc.bgColor} py-3`}>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${doc.color}`} />
                      {doc.label}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFullscreenDoc(doc)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="aspect-[3/4] relative bg-gray-100 cursor-pointer" onClick={() => setFullscreenDoc(doc)}>
                    {renderDocumentPreview(doc)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Single View - One Document with Controls */}
      {viewMode === 'single' && (
        <div className="space-y-4">
          {/* Document Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {uploadedDocs.map((doc) => {
              const Icon = doc.icon;
              return (
                <Button
                  key={doc.key}
                  variant={selectedDoc?.key === doc.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDoc(doc);
                    handleReset();
                  }}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {doc.label}
                </Button>
              );
            })}
          </div>

          {/* Selected Document */}
          {(selectedDoc || uploadedDocs[0]) && (
            <Card>
              <CardContent className="p-4">
                <div className="aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden">
                  {renderDocumentPreview(
                    selectedDoc || uploadedDocs[0],
                    getFileType((selectedDoc || uploadedDocs[0]).url) === 'image' ? 'transition-transform' : '',
                    getFileType((selectedDoc || uploadedDocs[0]).url) === 'image' 
                      ? { transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }
                      : undefined
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog open={!!fullscreenDoc} onOpenChange={() => setFullscreenDoc(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {fullscreenDoc && (
            <div className="relative h-[95vh]">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center justify-between text-white">
                  <h3 className="font-semibold">{fullscreenDoc.label}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(fullscreenDoc)}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Document */}
              <div className="w-full h-full bg-black flex items-center justify-center">
                {getFileType(fullscreenDoc.url) === 'pdf' ? (
                  <iframe
                    src={fullscreenDoc.url || ''}
                    className="w-full h-full"
                    title={fullscreenDoc.label}
                  />
                ) : getFileType(fullscreenDoc.url) === 'image' ? (
                  <img
                    src={fullscreenDoc.url || ''}
                    alt={fullscreenDoc.label}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-white text-center">
                    <EyeOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-4">Document preview not available</p>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(fullscreenDoc)}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

