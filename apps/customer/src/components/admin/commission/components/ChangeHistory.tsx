import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChangeHistoryProps {
  onRefresh: () => void;
}

export function ChangeHistory({ onRefresh }: ChangeHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('commission_settings_history')
        .select(`
          *,
          changed_by_profile:profiles!commission_settings_history_changed_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load change history');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version? This will create a new version with these settings.')) {
      return;
    }

    try {
      const version = history.find(h => h.id === versionId);
      if (!version) return;

      const snapshot = version.settings_snapshot;

      // Create a new entry with rollback
      const { error } = await supabase
        .from('commission_settings_history')
        .insert({
          settings_snapshot: snapshot,
          change_type: 'rollback',
          change_reason: `Rolled back to version from ${new Date(version.created_at).toLocaleString()}`,
          previous_version_id: versionId,
        });

      if (error) throw error;

      toast.success('Successfully rolled back to previous version!');
      fetchHistory();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to rollback');
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'global_update':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'tier_change':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'override_added':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'rollback':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    const variants: any = {
      'global_update': 'default',
      'tier_change': 'secondary',
      'override_added': 'outline',
      'rollback': 'destructive',
    };

    const labels: any = {
      'global_update': 'Global Update',
      'tier_change': 'Tier Change',
      'override_added': 'Override Added',
      'rollback': 'Rollback',
    };

    return (
      <Badge variant={variants[type] || 'outline'}>
        {labels[type] || type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 animate-pulse mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Loading change history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-6 w-6 text-orange-600" />
            <h3 className="text-xl font-bold">Commission Settings History</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete audit trail of all commission changes. Rollback to any previous version with one click.
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Change Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No history records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="relative flex items-start gap-4 p-4 rounded-lg border hover:border-primary transition-all"
                >
                  {/* Timeline connector */}
                  {index < history.length - 1 && (
                    <div className="absolute left-7 top-16 w-0.5 h-full bg-gray-200" />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center relative z-10">
                    {getChangeTypeIcon(record.change_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getChangeTypeBadge(record.change_type)}
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(record.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {record.change_reason || 'No reason provided'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(record.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    </div>

                    {/* Change Details */}
                    <div className="space-y-2 mt-3">
                      {record.changed_by_profile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            Changed by: {record.changed_by_profile.full_name || record.changed_by_profile.email}
                          </span>
                        </div>
                      )}

                      {record.affected_restaurants_count > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Affected {record.affected_restaurants_count} restaurant{record.affected_restaurants_count !== 1 ? 's' : ''}
                        </div>
                      )}

                      {record.estimated_revenue_impact !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Revenue Impact:</span>
                          <Badge variant={record.estimated_revenue_impact >= 0 ? 'default' : 'destructive'}>
                            {record.estimated_revenue_impact >= 0 ? '+' : ''}
                            ${(record.estimated_revenue_impact / 1000).toFixed(1)}k/month
                          </Badge>
                        </div>
                      )}

                      {/* Settings Snapshot Preview */}
                      {record.settings_snapshot && typeof record.settings_snapshot === 'object' && (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                            View settings snapshot
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(record.settings_snapshot, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">About History & Rollback:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Every commission change is automatically logged with timestamp and admin details</li>
                <li>Rollback creates a NEW version with the old settings (preserving full history)</li>
                <li>Use this to quickly revert mistakes or test different pricing strategies</li>
                <li>History is permanent and cannot be deleted (audit compliance)</li>
                <li>Changes are timestamped in UTC for consistency across timezones</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

