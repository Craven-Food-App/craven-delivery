import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Heart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';
import { formatDate, hasAllDocuments, getMissingDocuments } from '../utils/helpers';
import { supabase } from '@/integrations/supabase/client';

interface DocumentVerificationPanelProps {
  restaurant: RestaurantOnboardingData | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (restaurantId: string, notes: string) => Promise<void>;
  onReject: (restaurantId: string, notes: string) => Promise<void>;
}

export function DocumentVerificationPanel({
  restaurant,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: DocumentVerificationPanelProps) {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overriddenDocs, setOverriddenDocs] = useState<string[]>([]);

  if (!restaurant) return null;

  const handleApprove = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onApprove(restaurant.restaurant_id, notes);
      toast.success('Restaurant verified successfully!');
      onClose();
      setNotes('');
      setOverriddenDocs([]);
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
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onReject(restaurant.restaurant_id, notes);
      toast.success('Restaurant verification rejected');
      onClose();
      setNotes('');
      setOverriddenDocs([]);
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      toast.error('Failed to reject restaurant');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleOverride = (docKey: string) => {
    setOverriddenDocs(prev =>
      prev.includes(docKey)
        ? prev.filter(k => k !== docKey)
        : [...prev, docKey]
    );
  };

  const allDocsPresent = hasAllDocuments(restaurant);
  const missingDocs = getMissingDocuments(restaurant);
  const canApprove = allDocsPresent || overriddenDocs.length > 0;

  const documents = [
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

  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string | null>>({});

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
            // Try to treat as "<bucket>/<path>"
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
    if (isOpen) resolveAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurant?.restaurant_id]);

  const getResolvedUrl = (docKey: string, fallback?: string | null) =>
    resolvedUrls[docKey] ?? fallback ?? null;

  const completionPercentage = (documents.filter(d => d.url).length / documents.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Document Verification - {restaurant.restaurant.name}
          </DialogTitle>
          <DialogDescription>
            Review and verify business documents and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restaurant Info Banner */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Restaurant Name</p>
                  <p className="font-semibold">{restaurant.restaurant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cuisine Type</p>
                  <p className="font-semibold">{restaurant.restaurant.cuisine_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="font-semibold">
                    {restaurant.restaurant.city}, {restaurant.restaurant.state}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Applied</p>
                  <p className="font-semibold">{formatDate(restaurant.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Document Completion</span>
              <span className="font-bold text-primary">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Missing Documents Alert */}
          {missingDocs.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-1">Missing Documents</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {missingDocs.map((doc, i) => (
                    <li key={i}>• {doc}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-700 mt-2">
                  You can override missing documents below if verification can proceed without them.
                </p>
              </div>
            </div>
          )}

          {/* Documents Grid */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Documents</Label>
            <div className="grid gap-3">
              {documents.map(doc => {
                const isOverridden = overriddenDocs.includes(doc.key);
                const hasDoc = !!doc.url;

                return (
                  <Card
                    key={doc.key}
                    className={`transition-all ${
                      hasDoc
                        ? 'border-green-300 bg-green-50/50'
                        : isOverridden
                        ? 'border-orange-300 bg-orange-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Document Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`p-2 rounded-lg ${
                              hasDoc
                                ? 'bg-green-100 text-green-700'
                                : isOverridden
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <doc.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{doc.label}</p>
                              {doc.required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                              {hasDoc && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                            {isOverridden && (
                              <Badge variant="outline" className="mt-2 text-xs border-orange-400 text-orange-700">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Override Active
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {hasDoc ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = getResolvedUrl(doc.key, doc.url);
                                  if (url) window.open(url, '_blank');
                                  else toast.error('File URL unavailable');
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const url = getResolvedUrl(doc.key, doc.url);
                                  if (!url) return toast.error('File URL unavailable');
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `${doc.label}.pdf`;
                                  link.click();
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant={isOverridden ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleOverride(doc.key)}
                              disabled={restaurant.business_info_verified}
                            >
                              {isOverridden ? 'Override Active' : 'Override'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Previous Notes */}
          {restaurant.restaurant.verification_notes?.notes && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Previous Notes</Label>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {restaurant.restaurant.verification_notes.notes}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Verification Notes */}
          {!restaurant.business_info_verified && (
            <div className="space-y-2">
              <Label htmlFor="verification-notes" className="text-base font-semibold">
                Verification Notes
                {!allDocsPresent && <span className="text-red-500 ml-1">*Required for rejection</span>}
              </Label>
              <Textarea
                id="verification-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your verification decision. These will be visible to other admins and can be referenced in future reviews."
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Verification Status */}
          {restaurant.business_info_verified && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Verified</p>
                <p className="text-sm text-green-700">
                  This restaurant was verified on {formatDate(restaurant.business_verified_at!)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!restaurant.business_info_verified && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !notes.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Verification
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing || (!canApprove && !allDocsPresent)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {allDocsPresent
                ? 'Approve & Verify'
                : `Approve with ${overriddenDocs.length} Override(s)`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


