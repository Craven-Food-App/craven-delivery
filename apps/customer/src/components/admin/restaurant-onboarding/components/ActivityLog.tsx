// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Edit,
  Mail,
  FileText,
  Users,
  Clock,
  Search,
  Filter,
  AlertCircle,
  MessageSquare,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivityLogEntry {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  action_type: string;
  action_description: string;
  admin_id: string;
  admin_email: string;
  created_at: string;
  metadata?: any;
}

interface ActivityLogProps {
  restaurantId?: string;
}

const actionIcons: Record<string, any> = {
  approved: CheckCircle,
  rejected: XCircle,
  updated: Edit,
  email_sent: Mail,
  document_verified: FileText,
  assigned: Users,
  note_added: MessageSquare,
  status_changed: AlertCircle,
  exported: Download,
  imported: Upload,
};

const actionColors: Record<string, string> = {
  approved: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
  updated: 'text-blue-600 bg-blue-50',
  email_sent: 'text-purple-600 bg-purple-50',
  document_verified: 'text-orange-600 bg-orange-50',
  assigned: 'text-indigo-600 bg-indigo-50',
  note_added: 'text-gray-600 bg-gray-50',
  status_changed: 'text-yellow-600 bg-yellow-50',
  exported: 'text-teal-600 bg-teal-50',
  imported: 'text-cyan-600 bg-cyan-50',
};

export function ActivityLog({ restaurantId }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, [restaurantId]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('restaurant_onboarding_activity_log')
        .select(`
          id,
          restaurant_id,
          action_type,
          action_description,
          admin_id,
          created_at,
          metadata,
          restaurants!restaurant_id (
            name,
            email
          ),
          profiles!admin_id (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by restaurant if specified
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        toast.error('Failed to load activity log. The activity log table may not exist yet.');
        setActivities([]);
        return;
      }

      // Transform data
      const transformedData: ActivityLogEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurants?.name || 'Unknown Restaurant',
        action_type: item.action_type,
        action_description: item.action_description,
        admin_id: item.admin_id,
        admin_email: item.profiles?.email || 'Unknown Admin',
        created_at: item.created_at,
        metadata: item.metadata,
      }));

      setActivities(transformedData);
    } catch (error) {
      console.error('Error in fetchActivities:', error);
      toast.error('Failed to load activity log');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        activity =>
          activity.restaurant_name.toLowerCase().includes(query) ||
          activity.action_description.toLowerCase().includes(query) ||
          activity.admin_email.toLowerCase().includes(query)
      );
    }

    // Apply action type filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(activity => activity.action_type === actionFilter);
    }

    setFilteredActivities(filtered);
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionIcon = (actionType: string) => {
    const Icon = actionIcons[actionType] || AlertCircle;
    return Icon;
  };

  const getActionColor = (actionType: string) => {
    return actionColors[actionType] || 'text-gray-600 bg-gray-50';
  };

  // Get unique action types for filter
  const actionTypes = Array.from(new Set(activities.map(a => a.action_type)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Activity Log</CardTitle>
            {!restaurantId && (
              <Badge variant="secondary">{activities.length} total</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchActivities}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Action Type Filter */}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || actionFilter !== 'all'
                ? 'No activities match your filters'
                : 'No activities yet'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const Icon = getActionIcon(activity.action_type);
                const colorClass = getActionColor(activity.action_type);

                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {activity.restaurant_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.action_description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                        >
                          {activity.action_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.admin_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

