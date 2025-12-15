import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { renderDocumentHtml } from '@/utils/templateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, CheckCircle } from 'lucide-react';

interface PromotionFormData {
  engagementId: string;
  newTitle: string;
  department: string;
  reportsToTitle: string;
  reportsToName: string;
  authorityScope: string;
  objectives90: string;
  deliverables: string;
  kpiSummary: string;
  deferredSalary: string;
  accrualStartDate: string;
  activationTriggers: string;
  paymentMechanics: string;
  equityType: string;
  equityPercent: string;
  vestingSchedule: string;
  equityConditions: string;
  termStart: string;
  termEnd: string;
  reviewCadence: string;
  outcomes: string;
  internalNotes: string;
}

interface PromotionWizardProps {
  engagementId: string;
  onComplete?: () => void;
}

export const PromotionWizard: React.FC<PromotionWizardProps> = ({ 
  engagementId, 
  onComplete 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<PromotionFormData>({
    engagementId,
    newTitle: '',
    department: '',
    reportsToTitle: 'CEO',
    reportsToName: 'Torrance Stroman',
    authorityScope: '',
    objectives90: '',
    deliverables: '',
    kpiSummary: '',
    deferredSalary: '120000',
    accrualStartDate: new Date().toISOString().split('T')[0],
    activationTriggers: 'Upon Series A funding or achieving $100,000 in monthly recurring revenue',
    paymentMechanics: 'Salary will be paid in monthly installments upon activation trigger',
    equityType: 'Options',
    equityPercent: '0.5',
    vestingSchedule: '4 years with 1 year cliff',
    equityConditions: 'Subject to board approval and execution of equity grant documentation',
    termStart: new Date().toISOString().split('T')[0],
    termEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reviewCadence: '30-day check-ins, 90-day formal review',
    outcomes: 'Permanent officer appointment, extension, or role adjustment based on performance',
    internalNotes: '',
  });

  const [engagementData, setEngagementData] = useState<any>(null);
  const [personData, setPersonData] = useState<any>(null);

  useEffect(() => {
    fetchEngagementData();
  }, [engagementId]);

  const fetchEngagementData = async () => {
    try {
      const { data: engagement, error } = await supabase
        .from('promotion_engagements')
        .select('*')
        .eq('id', engagementId)
        .single();

      if (error) throw error;

      if (engagement) {
        setEngagementData(engagement);
        
        // Try to fetch person data from employees table
        if (engagement.person_id) {
          const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('id', engagement.person_id)
            .single();
          
          if (employee) {
            setPersonData(employee);
          } else {
            // Fallback: try exec_users or user_profiles
            const { data: execUser } = await supabase
              .from('exec_users')
              .select('*')
              .eq('id', engagement.person_id)
              .single();
            
            if (execUser) {
              setPersonData(execUser);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching engagement:', error);
      toast({
        title: 'Error',
        description: 'Failed to load engagement data',
        variant: 'destructive',
      });
    }
  };

  const getCompanySetting = async (key: string, defaultValue: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();
      return data?.setting_value || defaultValue;
    } catch (error) {
      console.warn(`Error fetching company setting ${key}:`, error);
      return defaultValue;
    }
  };

  const buildPlaceholders = async (): Promise<Record<string, string>> => {
    const companyName = await getCompanySetting('company_name', "Crave'n Inc.");
    const ceoName = await getCompanySetting('ceo_name', 'Torrance Stroman');
    const ceoTitle = await getCompanySetting('ceo_title', 'Chief Executive Officer');

    const candidateFullName = personData?.full_name || personData?.first_name + ' ' + (personData?.last_name || '') || 'N/A';
    const candidateFirstName = candidateFullName.split(' ')[0] || '';

    return {
      COMPANY_LEGAL_NAME: companyName,
      DOCUMENT_ID: `CONV-${Date.now()}`,
      EFFECTIVE_DATE: new Date(formData.termStart).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      CANDIDATE_FULL_NAME: candidateFullName,
      CANDIDATE_FIRST_NAME: candidateFirstName,
      CANDIDATE_EMAIL: personData?.email || '',
      CANDIDATE_LOCATION: personData?.work_location || personData?.location || '',
      CURRENT_ROLE_TITLE: engagementData?.current_title || 'Intern',
      NEW_ROLE_TITLE: formData.newTitle,
      DEPARTMENT_NAME: formData.department,
      REPORTS_TO_TITLE: formData.reportsToTitle,
      REPORTS_TO_NAME: formData.reportsToName,
      AUTHORITY_SCOPE_SUMMARY: formData.authorityScope,
      APPROVAL_AUTHORITY_TITLE: 'CEO',
      OBJECTIVES_90_DAY: formData.objectives90,
      KEY_DELIVERABLES: formData.deliverables,
      KPI_SCORECARD_SUMMARY: formData.kpiSummary,
      DEFERRED_SALARY_ANNUAL: `$${parseFloat(formData.deferredSalary || '0').toLocaleString()}`,
      SALARY_ACCRUAL_START_DATE: new Date(formData.accrualStartDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      SALARY_ACTIVATION_TRIGGERS: formData.activationTriggers,
      SALARY_PAYMENT_MECHANICS: formData.paymentMechanics,
      EQUITY_TYPE: formData.equityType,
      EQUITY_PERCENT_TARGET: `${formData.equityPercent}%`,
      VESTING_SCHEDULE: formData.vestingSchedule,
      EQUITY_MILESTONE_CONDITIONS: formData.equityConditions,
      ACTING_TERM_START: new Date(formData.termStart).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      ACTING_TERM_END: new Date(formData.termEnd).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      REVIEW_CADENCE: formData.reviewCadence,
      CONVERSION_OUTCOMES: formData.outcomes,
      CEO_NAME: ceoName,
      CEO_TITLE: ceoTitle,
      COMPANY_SIGN_DATE: '',
      CANDIDATE_SIGN_DATE: '',
      INTERNAL_REFERENCE_NOTES: formData.internalNotes,
    };
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const placeholders = await buildPlaceholders();
      const html = await renderDocumentHtml('acting_exec_conversion_letter', placeholders);
      setPreviewHtml(html);
      setShowPreview(true);
      toast({
        title: 'Preview Generated',
        description: 'Letter preview is ready',
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate preview. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.newTitle || !formData.department || !formData.authorityScope) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Title, Department, Authority Scope)',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Generate and submit conversion letter for approval?')) return;

    setLoading(true);
    try {
      const placeholders = await buildPlaceholders();
      const html = await renderDocumentHtml('acting_exec_conversion_letter', placeholders);

      // Create document record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: document, error: docError } = await supabase
        .from('promotion_documents')
        .insert({
          engagement_id: engagementId,
          doc_type: 'ACTING_CONVERSION',
          html_template_id: 'acting_exec_conversion_letter',
          rendered_html: html,
          status: 'DRAFT',
          created_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create CEO approval requirement
      await supabase
        .from('promotion_approvals')
        .insert({
          document_id: document.id,
          required_role: 'CEO',
          status: 'PENDING',
        });

      // Update or create comp package
      await supabase
        .from('promotion_comp_packages')
        .upsert({
          engagement_id: engagementId,
          deferred_salary_annual: parseFloat(formData.deferredSalary),
          salary_accrual_start_date: formData.accrualStartDate,
          salary_activation_triggers: formData.activationTriggers,
          equity_type: formData.equityType,
          equity_percent_target: parseFloat(formData.equityPercent),
          vesting_schedule: formData.vestingSchedule,
          equity_conditions: formData.equityConditions,
        }, {
          onConflict: 'engagement_id',
        });

      toast({
        title: 'Success',
        description: 'Conversion letter created and submitted for CEO approval.',
      });

      onComplete?.();
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Promotion Wizard: Intern → Acting Executive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Fill in the form below to generate the conversion letter. Required fields are marked with *.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newTitle">New Title *</Label>
              <Input
                id="newTitle"
                value={formData.newTitle}
                onChange={(e) => setFormData({ ...formData, newTitle: e.target.value })}
                placeholder="e.g., Acting CTO"
              />
            </div>
            <div>
              <Label htmlFor="department">Department *</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Technology"
              />
            </div>
            <div>
              <Label htmlFor="reportsToTitle">Reports To (Title)</Label>
              <Input
                id="reportsToTitle"
                value={formData.reportsToTitle}
                onChange={(e) => setFormData({ ...formData, reportsToTitle: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reportsToName">Reports To (Name)</Label>
              <Input
                id="reportsToName"
                value={formData.reportsToName}
                onChange={(e) => setFormData({ ...formData, reportsToName: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="authorityScope">Authority Scope Summary *</Label>
              <Textarea
                id="authorityScope"
                value={formData.authorityScope}
                onChange={(e) => setFormData({ ...formData, authorityScope: e.target.value })}
                placeholder="Limited admin permissions within Technology department..."
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="objectives90">90-Day Objectives *</Label>
              <Textarea
                id="objectives90"
                value={formData.objectives90}
                onChange={(e) => setFormData({ ...formData, objectives90: e.target.value })}
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="deliverables">Key Deliverables *</Label>
              <Textarea
                id="deliverables"
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="kpiSummary">KPI Scorecard Summary</Label>
              <Textarea
                id="kpiSummary"
                value={formData.kpiSummary}
                onChange={(e) => setFormData({ ...formData, kpiSummary: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="deferredSalary">Deferred Salary (Annual) *</Label>
              <Input
                id="deferredSalary"
                type="number"
                value={formData.deferredSalary}
                onChange={(e) => setFormData({ ...formData, deferredSalary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accrualStartDate">Accrual Start Date *</Label>
              <Input
                id="accrualStartDate"
                type="date"
                value={formData.accrualStartDate}
                onChange={(e) => setFormData({ ...formData, accrualStartDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="activationTriggers">Salary Activation Triggers *</Label>
              <Textarea
                id="activationTriggers"
                value={formData.activationTriggers}
                onChange={(e) => setFormData({ ...formData, activationTriggers: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="equityType">Equity Type</Label>
              <Select
                value={formData.equityType}
                onValueChange={(value) => setFormData({ ...formData, equityType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="RSA">RSA</SelectItem>
                  <SelectItem value="Units">Units</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="equityPercent">Equity % Target</Label>
              <Input
                id="equityPercent"
                type="number"
                step="0.01"
                value={formData.equityPercent}
                onChange={(e) => setFormData({ ...formData, equityPercent: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="termStart">Acting Term Start *</Label>
              <Input
                id="termStart"
                type="date"
                value={formData.termStart}
                onChange={(e) => setFormData({ ...formData, termStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="termEnd">Acting Term End *</Label>
              <Input
                id="termEnd"
                type="date"
                value={formData.termEnd}
                onChange={(e) => setFormData({ ...formData, termEnd: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="vestingSchedule">Vesting Schedule</Label>
              <Input
                id="vestingSchedule"
                value={formData.vestingSchedule}
                onChange={(e) => setFormData({ ...formData, vestingSchedule: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="internalNotes">Internal Reference Notes</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              onClick={handlePreview} 
              disabled={loading} 
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Preview Letter
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Generate & Submit for Approval
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && previewHtml && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[800px] border-0"
                title="Conversion Letter Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

