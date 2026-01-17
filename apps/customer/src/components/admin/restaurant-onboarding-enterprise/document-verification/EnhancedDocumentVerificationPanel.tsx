import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileCheck,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Shield,
  Building2,
  User,
  Heart,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../../restaurant-onboarding/types';
import { formatDate, hasAllDocuments, getMissingDocuments } from '../../restaurant-onboarding/utils/helpers';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedDocumentVerificationPanelProps {
  restaurant: RestaurantOnboardingData | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (restaurantId: string, notes: string) => Promise<void>;
  onReject: (restaurantId: string, notes: string) => Promise<void>;
}

interface Document {
  key: string;
  label: string;
  url: string | null;
  icon: typeof Building2;
  required: boolean;
  description: string;
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export function EnhancedDocumentVerificationPanel({
  restaurant,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: EnhancedDocumentVerificationPanelProps) {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overriddenDocs, setOverriddenDocs] = useState<string[]>([]);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string | null>>({});
  const [docStatuses, setDocStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});
  const [zoomLevel, setZoomLevel] = useState(100);

  const documents: Document[] = useMemo(() => {
    if (!restaurant) return [];
    return [
    {
      key: 'business_license',
      label: 'Business License',
      url: restaurant.restaurant.business_license_url,
      icon: Building2,
      required: true,
      description: 'Valid business license from local authority',
    },
    {
      key: 'owner_id',
      label: 'Owner ID',
      url: restaurant.restaurant.owner_id_url,
      icon: User,
      required: true,
      description: 'Government-issued identification',
    },
    {
      key: 'insurance',
      label: 'Insurance Certificate',
      url: restaurant.restaurant.insurance_certificate_url,
      icon: Shield,
      required: false,
      description: 'Liability insurance certificate',
    },
    {
      key: 'health_permit',
      label: 'Health Permit',
      url: restaurant.restaurant.health_permit_url,
      icon: Heart,
      required: false,
      description: 'Health department permit',
    },
  ];
  }, [restaurant]);

  useEffect(() => {
    const resolveAll = async () => {
      const entries = await Promise.all(
        documents.map(async (d) => {
          if (!d.url) return [d.key, null] as const;
          try {
            const u = new URL(d.url);
            const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign|private)?\/([^/]+)\/(.+)/);
            if (match) {
              const bucket = match[1];
              const path = match[2];
              const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
              return [d.key, data?.signedUrl || d.url] as const;
            }
            return [d.key, d.url] as const;
          } catch {
            const parts = (d.url || '').split('/');
            const bucket = parts[0];
            const path = parts.slice(1).join('/');
            if (bucket && path) {
              const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
              return [d.key, data?.signedUrl || d.url] as const;
            }
            return [d.key, d.url] as const;
          }
        })
      );
      setResolvedUrls(Object.fromEntries(entries));
    };
    if (isOpen && restaurant && documents.length > 0) {
      resolveAll();
    }
  }, [isOpen, restaurant?.restaurant_id, documents]);

  const handleApprove = async () => {
    if (isProcessing || !restaurant) return;
    setIsProcessing(true);
    try {
      await onApprove(restaurant.restaurant_id, notes);
      toast.success('Restaurant verified successfully!');
      onClose();
      resetState();
    } catch (error) {
      console.error('Error approving restaurant:', error);
      toast.error('Failed to approve restaurant');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }
    if (isProcessing || !restaurant) return;
    setIsProcessing(true);
    try {
      await onReject(restaurant.restaurant_id, notes);
      toast.success('Restaurant verification rejected');
      onClose();
      resetState();
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      toast.error('Failed to reject restaurant');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setNotes('');
    setOverriddenDocs([]);
    setSelectedDocIndex(0);
    setDocStatuses({});
    setDocNotes({});
    setZoomLevel(100);
  };

  const toggleOverride = (docKey: string) => {
    setOverriddenDocs(prev =>
      prev.includes(docKey)
        ? prev.filter(k => k !== docKey)
        : [...prev, docKey]
    );
  };

  const updateDocStatus = (docKey: string, status: 'pending' | 'approved' | 'rejected') => {
    setDocStatuses(prev => ({ ...prev, [docKey]: status }));
  };

  const updateDocNotes = (docKey: string, note: string) => {
    setDocNotes(prev => ({ ...prev, [docKey]: note }));
  };

  if (!restaurant || !isOpen) return null;

  const allDocsPresent = hasAllDocuments(restaurant);
  const missingDocs = getMissingDocuments(restaurant);
  const canApprove = allDocsPresent || overriddenDocs.length > 0;

  const completionPercentage = (documents.filter(d => d.url).length / documents.length) * 100;
  const currentDoc = documents[selectedDocIndex];
  const currentDocUrl = resolvedUrls[currentDoc?.key] || currentDoc?.url || null;
  const currentDocStatus = docStatuses[currentDoc?.key] || 'pending';

  const getResolvedUrl = (docKey: string) => resolvedUrls[docKey] || documents.find(d => d.key === docKey)?.url || null;

  const handlePreviousDoc = () => {
    if (selectedDocIndex > 0) {
      setSelectedDocIndex(selectedDocIndex - 1);
      setZoomLevel(100);
    }
  };

  const handleNextDoc = () => {
    if (selectedDocIndex < documents.length - 1) {
      setSelectedDocIndex(selectedDocIndex + 1);
      setZoomLevel(100);
    }
  };

  const isImage = (url: string | null) => {
    if (!url) return false;
    const ext = url.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  const isPdf = (url: string | null) => {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-primary" />
                Document Verification - {restaurant.restaurant.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Review and verify business documents with split-screen interface
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Document List & Viewer */}
          <div className="w-2/3 flex flex-col border-r">
            {/* Document List Tabs */}
            <div className="border-b bg-muted/50 p-2">
              <Tabs value={documents[selectedDocIndex]?.key} onValueChange={(key) => {
                const index = documents.findIndex(d => d.key === key);
                if (index >= 0) setSelectedDocIndex(index);
              }}>
                <TabsList className="grid w-full grid-cols-4">
                  {documents.map((doc) => (
                    <TabsTrigger key={doc.key} value={doc.key} className="flex items-center gap-2">
                      <doc.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{doc.label}</span>
                      {doc.url ? (
                        docStatuses[doc.key] === 'approved' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : docStatuses[doc.key] === 'rejected' ? (
                          <XCircle className="h-3 w-3 text-red-600" />
                        ) : null
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
              {currentDoc && currentDocUrl ? (
                <>
                  {/* Viewer Controls */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-b">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreviousDoc}
                        disabled={selectedDocIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        {selectedDocIndex + 1} of {documents.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNextDoc}
                        disabled={selectedDocIndex === documents.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[60px] text-center">{zoomLevel}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(currentDocUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentDocUrl;
                          link.download = `${currentDoc.key}.pdf`;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Document Display */}
                  <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                    {isImage(currentDocUrl) ? (
                      <img
                        src={currentDocUrl}
                        alt={currentDoc.label}
                        style={{ transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.2s' }}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : isPdf(currentDocUrl) ? (
                      <iframe
                        src={currentDocUrl}
                        className="w-full h-full border-0"
                        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                      />
                    ) : (
                      <div className="text-center p-8">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Preview not available</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.open(currentDocUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8">
                    <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{currentDoc?.label} not uploaded</p>
                    {currentDoc?.required && (
                      <Badge variant="destructive" className="mt-2">Required</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Review & Actions */}
          <div className="w-1/3 flex flex-col bg-white dark:bg-gray-950">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Restaurant Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Restaurant Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{restaurant.restaurant.name}</p>
                  </div>
                  {restaurant.restaurant.city && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p className="font-medium">
                        {restaurant.restaurant.city}, {restaurant.restaurant.state}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{restaurant.restaurant.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Applied</Label>
                    <p className="font-medium">{formatDate(restaurant.created_at)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Document Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={completionPercentage} className="mb-4" />
                  <div className="space-y-2 text-sm">
                    {documents.map((doc) => (
                      <div key={doc.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <doc.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{doc.label}</span>
                          {doc.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {doc.url ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  {missingDocs.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Missing Documents:
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                        {missingDocs.map((doc) => (
                          <li key={doc}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Document Review */}
              {currentDoc && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review: {currentDoc.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Status</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={currentDocStatus === 'approved' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateDocStatus(currentDoc.key, 'approved')}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant={currentDocStatus === 'rejected' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => updateDocStatus(currentDoc.key, 'rejected')}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={docNotes[currentDoc.key] || ''}
                        onChange={(e) => updateDocNotes(currentDoc.key, e.target.value)}
                        placeholder="Add notes about this document..."
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Review Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Review Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add overall verification notes..."
                    rows={6}
                  />
                </CardContent>
              </Card>

              {/* Override Missing Documents */}
              {missingDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Override Missing Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documents
                        .filter((d) => !d.url && d.required)
                        .map((doc) => (
                          <div key={doc.key} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{doc.label}</span>
                            <Button
                              variant={overriddenDocs.includes(doc.key) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleOverride(doc.key)}
                            >
                              {overriddenDocs.includes(doc.key) ? 'Override' : 'Required'}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t p-4 space-y-2">
              <Button
                onClick={handleApprove}
                disabled={!canApprove || isProcessing}
                className="w-full"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Restaurant
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Verification
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

