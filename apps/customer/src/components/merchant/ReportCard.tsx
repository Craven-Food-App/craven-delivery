import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Download, Calendar, MoreVertical, Play, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportCardProps {
  report: any;
  onDelete: () => void;
  onSchedule: (report: any) => void;
}

export const ReportCard = ({ report, onDelete, onSchedule }: ReportCardProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { reportId: report.id, sendEmail: false },
      });

      if (error) throw error;

      toast({
        title: 'Report generated',
        description: `Report generated successfully with ${data.rowCount} rows.`,
      });

      // Download the file
      const { data: fileData } = await supabase.storage
        .from('restaurant-reports')
        .download(data.filePath || '');

      if (fileData) {
        const url = URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('restaurant_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      toast({
        title: 'Report deleted',
        description: 'Report has been deleted successfully.',
      });

      onDelete();
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{report.name}</CardTitle>
              {report.description && (
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGenerate} disabled={generating}>
                <Play className="mr-2 h-4 w-4" />
                Generate Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSchedule(report)}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Created {format(new Date(report.created_at), 'MMM d, yyyy')}</span>
            </div>
            {report.is_scheduled && (
              <Badge variant="secondary">Scheduled</Badge>
            )}
          </div>
          
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            <Download className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
