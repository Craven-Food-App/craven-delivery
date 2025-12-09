import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload,
  X,
  Loader2,
  FileText
} from 'lucide-react';

export const ICADocumentManager: React.FC = () => {
  const [icaDocumentUrl, setIcaDocumentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchICADocument = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_settings')
        .select('independent_contractor_agreement_url')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      const docUrl = data?.independent_contractor_agreement_url || '';
      setIcaDocumentUrl(docUrl);
      setDocumentPreview(docUrl || null);
    } catch (error: any) {
      console.error('Error fetching ICA document:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch ICA document settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchICADocument();
  }, []);

  useEffect(() => {
    // Set preview when icaDocumentUrl changes
    if (icaDocumentUrl && !documentFile) {
      setDocumentPreview(icaDocumentUrl);
    }
  }, [icaDocumentUrl, documentFile]);

  const handleDocumentUpload = async (file: File) => {
    // Validate file type (PDF preferred, but allow other document types)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF or Word document',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a document smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingDocument(true);
    setDocumentFile(file);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setDocumentPreview(previewUrl);

      // Create unique filename
      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `ica-documents/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('promotional-banners') // Using existing bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promotional-banners')
        .getPublicUrl(fileName);

      // Update settings with the public URL
      setIcaDocumentUrl(publicUrl);
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
      setDocumentPreview(null);
      setDocumentFile(null);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = () => {
    setDocumentPreview(null);
    setDocumentFile(null);
    setIcaDocumentUrl('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if a row exists
      const { data: existing } = await supabase
        .from('marketing_settings')
        .select('id')
        .limit(1)
        .single();

      let error;
      if (existing) {
        // Update existing row
        const { error: updateError } = await supabase
          .from('marketing_settings')
          .update({
            independent_contractor_agreement_url: icaDocumentUrl || null,
            updated_by: user.id,
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insert new row (shouldn't happen due to unique constraint, but handle it)
        const { error: insertError } = await supabase
          .from('marketing_settings')
          .insert({
            independent_contractor_agreement_url: icaDocumentUrl || null,
            updated_by: user.id,
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'ICA document updated successfully',
      });

      fetchICADocument();
    } catch (error: any) {
      console.error('Error saving ICA document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ICA document',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !icaDocumentUrl) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Independent Contractor Agreement</CardTitle>
          <CardDescription>
            Set the Independent Contractor Agreement document URL that will be displayed when users click the link on the Feeder signup page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Section */}
          <div className="space-y-2">
            <Label>ICA Document</Label>
            
            {!documentPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="ica-document"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadingDocument}
                />
                <label htmlFor="ica-document" className="cursor-pointer">
                  <div className="flex flex-col items-center justify-center">
                    {uploadingDocument ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, DOCX up to 10MB
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Document Preview Available</p>
                      <p className="text-xs text-gray-500">Click the link on the Feeder page to view</p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveDocument}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* URL Input as Alternative */}
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Or enter document URL:</p>
              <Input
                id="ica_document_url_input"
                type="url"
                value={icaDocumentUrl}
                onChange={(e) => {
                  setIcaDocumentUrl(e.target.value);
                  if (e.target.value) {
                    setDocumentPreview(e.target.value);
                    setDocumentFile(null);
                  }
                }}
                placeholder="https://example.com/independent-contractor-agreement.pdf"
                disabled={uploadingDocument}
              />
            </div>
          </div>

          {/* Preview Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This document will be displayed in a modal when users click the "Independent Contractor Agreement" link on the Feeder signup page. 
              PDF format is recommended for best compatibility.
            </p>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={uploadingDocument || loading}
            className="w-full"
          >
            {uploadingDocument || loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingDocument ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save ICA Document'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

