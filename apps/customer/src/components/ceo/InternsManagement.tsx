import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PromotionCandidateProfile } from '@/components/executive/PromotionCandidateProfile';
import { PromotionWizard } from '@/components/executive/PromotionWizard';
import { checkActingExecEligibility } from '@/utils/promotionEligibility';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  User, 
  Search, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InternEngagement {
  id: string;
  person_id: string;
  current_stage: string;
  current_title: string;
  track: string;
  start_date: string;
  next_review_due_date?: string;
  is_review_blocked: boolean;
  missed_review_count: number;
  person?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employment_type: string;
  };
}

export const InternsManagement: React.FC = () => {
  const { toast } = useToast();
  const [interns, setInterns] = useState<InternEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntern, setSelectedIntern] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'list' | 'profile'>('list');
  const [overdueReviews, setOverdueReviews] = useState<number>(0);

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      // Fetch all intern engagements
      const { data: engagements, error } = await supabase
        .from('promotion_engagements')
        .select('*')
        .in('current_stage', ['APPLIED', 'INTERN_ACTIVE', 'ACTING_ELIGIBLE', 'ACTING_ACTIVE'])
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Fetch person data for each engagement
      const engagementsWithPeople = await Promise.all(
        (engagements || []).map(async (eng: any) => {
          if (eng.person_id) {
            const { data: person, error: personError } = await supabase
              .from('employees')
              .select('id, first_name, last_name, email, employment_type')
              .eq('id', eng.person_id)
              .single();
            
            // If person fetch fails, continue without person data
            if (personError) {
              console.warn(`Could not fetch person data for engagement ${eng.id}:`, personError);
              return eng;
            }
            
            return { ...eng, person };
          }
          return eng;
        })
      );

      // Filter to show interns (can include acting execs in pathway)
      const internEngagements = engagementsWithPeople as InternEngagement[];

      // Count overdue reviews (handle errors gracefully)
      const { data: overdue, error: overdueError } = await supabase
        .from('promotion_review_schedules')
        .select('engagement_id', { count: 'exact', head: false })
        .eq('status', 'OVERDUE')
        .eq('is_blocking', true);

      if (overdueError) {
        console.warn('Could not fetch overdue reviews:', overdueError);
        setOverdueReviews(0);
      } else {
        setOverdueReviews(overdue?.length || 0);
      }
      setInterns(internEngagements);
    } catch (error: any) {
      console.error('Error fetching interns:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load interns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInterns = interns.filter(intern => {
    const name = `${intern.person?.first_name || ''} ${intern.person?.last_name || ''}`.toLowerCase();
    const email = intern.person?.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search) || intern.current_title?.toLowerCase().includes(search);
  });

  const getStageBadge = (stage: string) => {
    const colors: Record<string, { bg: string; text: string; label: string }> = {
      'APPLIED': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Applied' },
      'INTERN_ACTIVE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active Intern' },
      'ACTING_ELIGIBLE': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Eligible for Acting' },
      'ACTING_ACTIVE': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Acting Executive' },
    };

    const style = colors[stage] || colors['APPLIED'];
    return (
      <Badge className={`${style.bg} ${style.text}`}>
        {style.label}
      </Badge>
    );
  };

  const handleViewProfile = async (engagementId: string) => {
    setSelectedIntern(engagementId);
    setSelectedTab('profile');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Loading interns...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Interns</div>
            <div className="text-2xl font-bold">{interns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Interns</div>
            <div className="text-2xl font-bold">
              {interns.filter(i => i.current_stage === 'INTERN_ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Acting Executives</div>
            <div className="text-2xl font-bold">
              {interns.filter(i => i.current_stage === 'ACTING_ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Overdue Reviews</div>
            <div className="text-2xl font-bold text-red-600">{overdueReviews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueReviews > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {overdueReviews} intern{overdueReviews > 1 ? 's have' : ' has'} overdue review{overdueReviews > 1 ? 's' : ''} that are blocking promotion eligibility.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'list' | 'profile')}>
        <TabsList>
          <TabsTrigger value="list">All Interns</TabsTrigger>
          {selectedIntern && <TabsTrigger value="profile">Profile</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Interns Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Intern Pipeline ({filteredInterns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Next Review</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchTerm ? 'No interns found matching your search' : 'No interns in the pipeline'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInterns.map((intern) => (
                      <TableRow key={intern.id}>
                        <TableCell className="font-medium">
                          {intern.person?.first_name} {intern.person?.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {intern.person?.email}
                        </TableCell>
                        <TableCell>{intern.current_title}</TableCell>
                        <TableCell>{intern.track || 'N/A'}</TableCell>
                        <TableCell>{getStageBadge(intern.current_stage)}</TableCell>
                        <TableCell>
                          {intern.start_date ? new Date(intern.start_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {intern.next_review_due_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(intern.next_review_due_date).toLocaleDateString()}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {intern.is_review_blocked && (
                            <Badge variant="destructive" className="text-xs">
                              Review Blocked
                            </Badge>
                          )}
                          {intern.missed_review_count > 0 && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {intern.missed_review_count} missed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProfile(intern.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          {selectedIntern ? (
            <PromotionCandidateProfile engagementId={selectedIntern} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Select an intern to view their profile
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

