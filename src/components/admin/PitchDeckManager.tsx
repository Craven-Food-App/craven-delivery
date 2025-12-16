import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, X, Upload, Loader2, ArrowLeft, FileText, Pencil, Check, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvestmentOpportunity {
  id: string;
  company_name: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  short_summary: string;
  highlights: string[];
  target_amount: number;
  minimum_investment: number;
  investment_raised: number;
  previous_rounds: number;
  stage: string;
  investor_role: string;
  business_description?: string;
  market_description?: string;
  progress_description?: string;
  objectives_description?: string;
  why_we_win?: string;
  deal_description?: string;
  video_url?: string;
  gallery_images?: string[];
  tags: string[];
  financials: Array<{
    year: number;
    turnover: number;
    profit: number;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
  }>;
  team_members: Array<{
    name: string;
    role: string;
    bio: string;
    photo_url?: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PitchDeckManager: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOpportunity, setEditingOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingDocName, setEditingDocName] = useState<string | null>(null);
  const [tempDocName, setTempDocName] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<Partial<InvestmentOpportunity>>({
    company_name: '',
    location: '',
    short_summary: '',
    highlights: [],
    target_amount: 0,
    minimum_investment: 0,
    investment_raised: 0,
    previous_rounds: 0,
    stage: '',
    investor_role: '',
    tags: [],
    financials: [],
    documents: [],
    team_members: [],
    is_active: true,
  });

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse JSONB fields
      const parsed = (data || []).map((item) => ({
        ...item,
        highlights: item.highlights || [],
        tags: item.tags || [],
        gallery_images: item.gallery_images || [],
        financials: (item.financials as any) || [],
        documents: (item.documents as any) || [],
        team_members: (item.team_members as any) || [],
      }));

      setOpportunities(parsed as InvestmentOpportunity[]);
    } catch (error: any) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investment opportunities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      company_name: '',
      location: '',
      short_summary: '',
      highlights: [],
      target_amount: 0,
      minimum_investment: 0,
      investment_raised: 0,
      previous_rounds: 0,
      stage: '',
      investor_role: '',
      tags: [],
      financials: [],
      documents: [],
      team_members: [],
      is_active: true,
    });
    setEditingOpportunity(null);
    setIsCreating(true);
    setIsEditDialogOpen(true);
  };

  const handleEdit = (opportunity: InvestmentOpportunity) => {
    setFormData(opportunity);
    setEditingOpportunity(opportunity);
    setIsCreating(false);
    setIsEditDialogOpen(true);
  };

  const handleSave = async (closeAfterSave = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.company_name || !formData.location || !formData.short_summary) {
        if (closeAfterSave) {
          toast({
            title: 'Error',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
        }
        return;
      }

      const payload = {
        ...formData,
        updated_at: new Date().toISOString(),
        created_by: isCreating ? user.id : undefined,
      };

      if (isCreating) {
        const { data, error } = await supabase
          .from('investment_opportunities')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // Update form with the new ID so subsequent saves work as updates
        if (data) {
          setFormData(prev => ({ ...prev, id: data.id }));
          setIsCreating(false);
        }

        if (closeAfterSave) {
          toast({
            title: 'Success',
            description: 'Investment opportunity created successfully',
          });
        }
      } else {
        if (!formData.id) {
          if (closeAfterSave) {
            toast({
              title: 'Error',
              description: 'Missing opportunity ID',
              variant: 'destructive',
            });
          }
          return;
        }

        const { error } = await supabase
          .from('investment_opportunities')
          .update(payload)
          .eq('id', formData.id);

        if (error) throw error;

        if (closeAfterSave) {
          toast({
            title: 'Success',
            description: 'Investment opportunity updated successfully',
          });
        }
      }

      if (closeAfterSave) {
        setIsEditDialogOpen(false);
        fetchOpportunities();
      }
    } catch (error: any) {
      console.error('Error saving opportunity:', error);
      if (closeAfterSave) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save investment opportunity',
          variant: 'destructive',
        });
      }
    }
  };

  // Auto-save after uploads (only if we have required fields)
  const autoSave = async () => {
    if (formData.company_name && formData.location && formData.short_summary) {
      await handleSave(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const { error } = await supabase
        .from('investment_opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Investment opportunity deleted successfully',
      });

      fetchOpportunities();
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete investment opportunity',
        variant: 'destructive',
      });
    }
  };

  const uploadFile = async (file: File, type: 'logo' | 'banner' | 'gallery' | 'video' | 'document'): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload files',
        variant: 'destructive',
      });
      return null;
    }

    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: `File size must be less than ${type === 'video' ? '50MB' : '20MB'}`,
        variant: 'destructive',
      });
      return null;
    }

    setUploading(type);
    setUploadProgress(0);
    const fileName = `${type}/${Date.now()}_${file.name}`;

    try {
      const bucket = type === 'video' ? 'pitch-deck-videos' : 'pitch-deck-assets';
      
      // Simulate progress for better UX (Supabase doesn't expose real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;

      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setTimeout(() => {
        setUploading(null);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, type);
    if (url) {
      setFormData(prev => {
        const updated = { ...prev, [`${type}_url`]: url };
        // Auto-save after state update
        setTimeout(() => autoSave(), 100);
        return updated;
      });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Upload one at a time and add to gallery immediately after each upload
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], 'gallery');
      if (url) {
        setFormData(prev => ({
          ...prev,
          gallery_images: [...(prev.gallery_images || []), url],
        }));
      }
    }
    
    // Reset the input so the same file can be selected again
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
    
    // Auto-save after all uploads complete
    setTimeout(() => autoSave(), 100);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, 'video');
    if (url) {
      setFormData(prev => ({ ...prev, video_url: url }));
      // Auto-save after upload
      setTimeout(() => autoSave(), 100);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, 'document');
    if (url) {
      const newDoc = {
        id: Date.now().toString(),
        type: file.type.includes('pdf') ? 'PDF' : 'DOCUMENT',
        name: file.name,
        url: url,
      };

      setFormData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc],
      }));
      
      // Auto-save after upload
      setTimeout(() => autoSave(), 100);
    }
  };

  const addHighlight = () => {
    setFormData(prev => ({
      ...prev,
      highlights: [...(prev.highlights || []), ''],
    }));
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights?.filter((_, i) => i !== index) || [],
    }));
  };

  const addFinancial = () => {
    setFormData(prev => ({
      ...prev,
      financials: [...(prev.financials || []), { year: new Date().getFullYear(), turnover: 0, profit: 0 }],
    }));
  };

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      team_members: [...(prev.team_members || []), { name: '', role: '', bio: '', photo_url: undefined }],
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pitch Deck Manager</h1>
          <p className="text-muted-foreground mt-1">Manage investment opportunity pitch decks</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Opportunity
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No investment opportunities yet</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Opportunity
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium">{opp.company_name}</TableCell>
                  <TableCell>{opp.location}</TableCell>
                  <TableCell>${opp.target_amount.toLocaleString()}</TableCell>
                  <TableCell>{opp.stage}</TableCell>
                  <TableCell>
                    <Badge variant={opp.is_active ? 'default' : 'secondary'}>
                      {opp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/pitch-deck/${opp.id}`, '_blank')}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(opp)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(opp.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Full Page Editor */}
      {isEditDialogOpen && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(false)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {isCreating ? 'Create Investment Opportunity' : 'Edit Investment Opportunity'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isCreating
                    ? 'Create a new pitch deck for investors'
                    : 'Update the investment opportunity details'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={uploading !== null}>
                {isCreating ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            {/* Logo & Banner */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-2 mt-2">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 object-cover rounded border" />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      disabled={uploading === 'logo'}
                    />
                    {uploading === 'logo' && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>
              <div>
                <Label>Banner</Label>
                <div className="flex items-center gap-2 mt-2">
                  {formData.banner_url && (
                    <img src={formData.banner_url} alt="Banner" className="w-32 h-16 object-cover rounded border" />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'banner')}
                      disabled={uploading === 'banner'}
                    />
                    {uploading === 'banner' && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Short Summary */}
            <div>
              <Label htmlFor="short_summary">Short Summary *</Label>
              <Textarea
                id="short_summary"
                rows={3}
                value={formData.short_summary || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, short_summary: e.target.value }))}
                placeholder="Brief description of the investment opportunity"
              />
            </div>

            {/* Highlights */}
            <div>
              <Label>Highlights</Label>
              <div className="space-y-2 mt-2">
                {formData.highlights?.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...(formData.highlights || [])];
                        newHighlights[index] = e.target.value;
                        setFormData(prev => ({ ...prev, highlights: newHighlights }));
                      }}
                      placeholder="Enter highlight"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHighlight(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addHighlight}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Highlight
                </Button>
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="target_amount">Target Amount *</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  value={formData.target_amount || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="minimum_investment">Minimum Investment *</Label>
                <Input
                  id="minimum_investment"
                  type="number"
                  step="0.01"
                  value={formData.minimum_investment || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_investment: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="investment_raised">Investment Raised</Label>
                <Input
                  id="investment_raised"
                  type="number"
                  step="0.01"
                  value={formData.investment_raised || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, investment_raised: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="previous_rounds">Previous Rounds</Label>
                <Input
                  id="previous_rounds"
                  type="number"
                  step="0.01"
                  value={formData.previous_rounds || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, previous_rounds: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stage">Stage *</Label>
                <Input
                  id="stage"
                  value={formData.stage || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                  placeholder="e.g., MVP/Finished Product, Series A"
                />
              </div>
              <div>
                <Label htmlFor="investor_role">Investor Role *</Label>
                <Input
                  id="investor_role"
                  value={formData.investor_role || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, investor_role: e.target.value }))}
                  placeholder="e.g., Monthly Involvement, Angel Investor"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <Label htmlFor="business_description">The Business</Label>
              <Textarea
                id="business_description"
                rows={4}
                value={formData.business_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))}
                placeholder="Describe your business model and operations"
              />
            </div>

            <div>
              <Label htmlFor="market_description">The Market</Label>
              <Textarea
                id="market_description"
                rows={4}
                value={formData.market_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, market_description: e.target.value }))}
                placeholder="Describe the market opportunity"
              />
            </div>

            <div>
              <Label htmlFor="progress_description">Progress/Proof</Label>
              <Textarea
                id="progress_description"
                rows={4}
                value={formData.progress_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, progress_description: e.target.value }))}
                placeholder="Describe your progress and achievements"
              />
            </div>

            <div>
              <Label htmlFor="objectives_description">Objectives/Future</Label>
              <Textarea
                id="objectives_description"
                rows={4}
                value={formData.objectives_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, objectives_description: e.target.value }))}
                placeholder="Describe your future plans and objectives"
              />
            </div>

            <div>
              <Label htmlFor="why_we_win">Why We Win</Label>
              <Textarea
                id="why_we_win"
                rows={4}
                value={formData.why_we_win || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, why_we_win: e.target.value }))}
                placeholder="Explain your competitive advantages"
              />
            </div>

            <div>
              <Label htmlFor="deal_description">The Deal</Label>
              <Textarea
                id="deal_description"
                rows={4}
                value={formData.deal_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_description: e.target.value }))}
                placeholder="Describe the investment terms and structure"
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setFormData(prev => ({ ...prev, tags }));
                }}
                placeholder="Logistics, Gig Economy, Food Delivery"
              />
            </div>

            {/* Video */}
            <div>
              <Label>Video URL</Label>
              <div className="space-y-2">
                <Input
                  value={formData.video_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="Video URL or upload file below"
                />
                <div>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploading === 'video'}
                  />
                  {uploading === 'video' && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                </div>
              </div>
            </div>

            {/* Gallery Images */}
            <div>
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Gallery Images
                {formData.gallery_images && formData.gallery_images.length > 0 && (
                  <Badge variant="secondary">{formData.gallery_images.length} images</Badge>
                )}
              </Label>
              
              {/* Upload progress bar */}
              {uploading === 'gallery' && (
                <div className="mt-2 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Uploading image...</span>
                    <span className="text-sm font-medium text-orange-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Gallery grid */}
              {formData.gallery_images && formData.gallery_images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 mb-3">
                  {formData.gallery_images.map((img, index) => (
                    <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-400 transition-colors">
                      <img 
                        src={img} 
                        alt={`Gallery ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newImages = formData.gallery_images?.filter((_, i) => i !== index) || [];
                            setFormData(prev => ({ ...prev, gallery_images: newImages }));
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload button */}
              <div className="flex items-center gap-3 mt-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  disabled={uploading === 'gallery'}
                  className="hidden"
                  id="gallery-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading === 'gallery'}
                  className="w-full border-dashed border-2 h-20 hover:border-orange-400 hover:bg-orange-50"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {uploading === 'gallery' ? 'Uploading...' : 'Click to upload images'}
                    </span>
                    <span className="text-xs text-gray-400">PNG, JPG, GIF up to 20MB</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Financials */}
            <div>
              <Label>Financial Projections</Label>
              <div className="space-y-2 mt-2">
                {formData.financials?.map((financial, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      placeholder="Year"
                      value={financial.year || ''}
                      onChange={(e) => {
                        const newFinancials = [...(formData.financials || [])];
                        newFinancials[index] = { ...financial, year: parseInt(e.target.value) || 0 };
                        setFormData(prev => ({ ...prev, financials: newFinancials }));
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Turnover"
                      value={financial.turnover || ''}
                      onChange={(e) => {
                        const newFinancials = [...(formData.financials || [])];
                        newFinancials[index] = { ...financial, turnover: parseFloat(e.target.value) || 0 };
                        setFormData(prev => ({ ...prev, financials: newFinancials }));
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Profit"
                      value={financial.profit || ''}
                      onChange={(e) => {
                        const newFinancials = [...(formData.financials || [])];
                        newFinancials[index] = { ...financial, profit: parseFloat(e.target.value) || 0 };
                        setFormData(prev => ({ ...prev, financials: newFinancials }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFinancials = formData.financials?.filter((_, i) => i !== index) || [];
                        setFormData(prev => ({ ...prev, financials: newFinancials }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addFinancial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Financial Year
                </Button>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <Label>Team Members</Label>
              <div className="space-y-4 mt-2">
                {formData.team_members?.map((member, index) => (
                  <div key={index} className="border p-4 rounded space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={member.name}
                        onChange={(e) => {
                          const newMembers = [...(formData.team_members || [])];
                          newMembers[index] = { ...member, name: e.target.value };
                          setFormData(prev => ({ ...prev, team_members: newMembers }));
                        }}
                      />
                      <Input
                        placeholder="Role"
                        value={member.role}
                        onChange={(e) => {
                          const newMembers = [...(formData.team_members || [])];
                          newMembers[index] = { ...member, role: e.target.value };
                          setFormData(prev => ({ ...prev, team_members: newMembers }));
                        }}
                      />
                    </div>
                    <Textarea
                      placeholder="Bio"
                      rows={2}
                      value={member.bio}
                      onChange={(e) => {
                        const newMembers = [...(formData.team_members || [])];
                        newMembers[index] = { ...member, bio: e.target.value };
                        setFormData(prev => ({ ...prev, team_members: newMembers }));
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        {member.photo_url && (
                          <img src={member.photo_url} alt={member.name} className="w-16 h-16 object-cover rounded border mb-2" />
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadFile(file, 'gallery');
                              if (url) {
                                const newMembers = [...(formData.team_members || [])];
                                newMembers[index] = { ...member, photo_url: url };
                                setFormData(prev => ({ ...prev, team_members: newMembers }));
                              }
                            }
                          }}
                          disabled={uploading !== null}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMembers = formData.team_members?.filter((_, i) => i !== index) || [];
                          setFormData(prev => ({ ...prev, team_members: newMembers }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTeamMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            </div>

            {/* Documents */}
            <div>
              <Label>Documents</Label>
              <div className="space-y-2 mb-2 mt-2">
                {formData.documents?.map((doc, index) => (
                  <div key={doc.id} className="flex items-center gap-3 border p-3 rounded-lg bg-gray-50">
                    <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingDocName === doc.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tempDocName}
                            onChange={(e) => setTempDocName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newDocs = formData.documents?.map(d => 
                                  d.id === doc.id ? { ...d, name: tempDocName } : d
                                ) || [];
                                setFormData(prev => ({ ...prev, documents: newDocs }));
                                setEditingDocName(null);
                              } else if (e.key === 'Escape') {
                                setEditingDocName(null);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newDocs = formData.documents?.map(d => 
                                d.id === doc.id ? { ...d, name: tempDocName } : d
                              ) || [];
                              setFormData(prev => ({ ...prev, documents: newDocs }));
                              setEditingDocName(null);
                            }}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDocName(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium truncate block">{doc.name}</span>
                      )}
                    </div>
                    {editingDocName !== doc.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDocName(doc.id);
                            setTempDocName(doc.name);
                          }}
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDocs = formData.documents?.filter((_, i) => i !== index) || [];
                            setFormData(prev => ({ ...prev, documents: newDocs }));
                          }}
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Upload progress bar */}
              {uploading === 'document' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Uploading document...</span>
                    <span className="text-sm font-medium text-orange-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleDocumentUpload}
                  disabled={uploading === 'document'}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Supported: PDF, Word, PowerPoint, Excel</p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active || false}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active (visible to investors)</Label>
            </div>

            {/* Bottom Save Button */}
            <div className="flex justify-end gap-2 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={uploading !== null}>
                {isCreating ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

