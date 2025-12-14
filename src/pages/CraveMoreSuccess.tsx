import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CraveMoreSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [membership, setMembership] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyMembership = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // The webhook should have already processed the payment
        // Just verify the membership was created
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check for active membership
          const { data: membershipData } = await supabase
            .from('user_memberships')
            .select('*, cravemore_plans(display_name, plan_key)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (membershipData) {
            setMembership(membershipData);
            toast({
              title: "Welcome to CraveMore! 🎉",
              description: "Your membership is now active. Enjoy $0 delivery fees!",
            });
          }
        }
      } catch (error) {
        console.error('Error verifying membership:', error);
        // Don't show error - webhook might still be processing
      } finally {
        setIsVerifying(false);
      }
    };

    verifyMembership();
  }, [sessionId, toast]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Activating your membership...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to CraveMore!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your membership has been successfully activated.
            </p>
            {membership && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-semibold">
                  {membership.cravemore_plans?.display_name || 'CraveMore'} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: Active
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">$0 Delivery Fees</p>
                <p className="text-sm text-muted-foreground">
                  On eligible orders over $12
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Priority Support</p>
                <p className="text-sm text-muted-foreground">
                  Get help faster when you need it
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Member-Only Discounts</p>
                <p className="text-sm text-muted-foreground">
                  Exclusive deals and early access
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button asChild className="w-full">
              <Link to="/">Start Ordering</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/account/cravemore">
                View Membership Details
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link to="/cravemore">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to CraveMore
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CraveMoreSuccess;

