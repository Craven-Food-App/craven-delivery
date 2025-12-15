import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PromotionWizard } from './PromotionWizard';
import { checkActingExecEligibility } from '@/utils/promotionEligibility';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  CheckCircle, 
  XCircle, 
  FileText, 
  TrendingUp,
  Calendar,
  DollarSign,
  Award
} from 'lucide-react';

interface PromotionCandidateProfileProps {
  engagementId: string;
}

export const PromotionCandidateProfile: React.FC<PromotionCandidateProfileProps> = ({ 
  engagementId 
}) => {
  const { toast } = useToast();
  const [engagement, setEngagement] = useState<any>(null);
  const [person, setPerson] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [engagementId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch engagement
      const { data: eng, error: engError } = await supabase
        .from('promotion_engagements')
        .select('*')
        .eq('id', engagementId)
        .single();

      if (engError) throw engError;
      setEngagement(eng);

      // Fetch person data
      if (eng?.person_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('*')
          .eq('id', eng.person_id)
          .single();
        
        if (emp) {
          setPerson(emp);
        }
      }

      // Check eligibility
      if (eng?.current_stage === 'INTERN_ACTIVE') {
        const elig = await checkActingExecEligibility(engagementId);
        setEligibility(elig);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load candidate data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'INTERN_ACTIVE': return 'bg-blue-500';
      case 'ACTING_ACTIVE': return 'bg-yellow-500';
      case 'EXEC_ACTIVE': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!engagement) {
    return <div>Engagement not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {person?.full_name || person?.first_name + ' ' + person?.last_name || 'Candidate'}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStageBadgeColor(engagement.current_stage)}>
                  {engagement.current_stage.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {engagement.current_title}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="promotion">Promotion</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{person?.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Track</div>
                  <div className="font-medium">{engagement.track || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Start Date</div>
                  <div className="font-medium">
                    {engagement.start_date ? new Date(engagement.start_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Stage</div>
                  <div className="font-medium">{engagement.current_stage}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              {/* Performance reviews would go here */}
              <Alert>
                <AlertDescription>
                  Performance review history will be displayed here.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="promotion" className="space-y-4">
              {engagement.current_stage === 'INTERN_ACTIVE' && eligibility && (
                <Alert className={eligibility.eligible ? 'border-green-500' : 'border-orange-500'}>
                  <div className="flex items-center gap-2 mb-2">
                    {eligibility.eligible ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-semibold">
                      {eligibility.eligible ? 'Eligible for Promotion' : 'Not Yet Eligible'}
                    </span>
                  </div>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {eligibility.reasons.map((reason: string, idx: number) => (
                        <li key={idx} className={reason.startsWith('✓') ? 'text-green-700' : 'text-orange-700'}>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {engagement.current_stage === 'INTERN_ACTIVE' && eligibility?.eligible && !showWizard && (
                <Button onClick={() => setShowWizard(true)} className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Conversion Letter
                </Button>
              )}

              {showWizard && (
                <PromotionWizard
                  engagementId={engagementId}
                  onComplete={() => {
                    setShowWizard(false);
                    fetchData(); // Refresh data
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

