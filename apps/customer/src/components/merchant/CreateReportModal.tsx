import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface CreateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onSuccess: () => void;
}

export const CreateReportModal = ({ open, onOpenChange, restaurantId, onSuccess }: CreateReportModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    templateId: '',
    name: '',
    description: '',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateTo: new Date(),
  });

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('restaurant_report_templates')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_reports')
        .insert({
          restaurant_id: restaurantId,
          template_id: formData.templateId,
          name: formData.name,
          description: formData.description,
          filters: {
            date_from: formData.dateFrom.toISOString(),
            date_to: formData.dateTo.toISOString(),
          },
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Report created',
        description: 'Your report has been created successfully.',
      });

      onSuccess();
      onOpenChange(false);
      setStep(1);
      setFormData({
        templateId: '',
        name: '',
        description: '',
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
      });
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    if (templates.length === 0) {
      fetchTemplates();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Select Report Template</Label>
              <Select
                value={formData.templateId}
                onValueChange={(value) => {
                  const template = templates.find(t => t.id === value);
                  setFormData({
                    ...formData,
                    templateId: value,
                    name: template?.name || '',
                    description: template?.description || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.templateId && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {templates.find(t => t.id === formData.templateId)?.description}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={!formData.templateId}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Report Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter report name..."
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.dateFrom, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={formData.dateFrom}
                      onSelect={(date) => date && setFormData({ ...formData, dateFrom: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.dateTo, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={formData.dateTo}
                      onSelect={(date) => date && setFormData({ ...formData, dateTo: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !formData.name}>
                {loading ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
