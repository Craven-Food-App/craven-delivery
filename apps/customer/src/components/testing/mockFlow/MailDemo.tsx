import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Mail, Stamp, Timer } from 'lucide-react';

interface MailDemoProps {
  currentStep: number;
}

const EMAIL_TEMPLATES = [
  {
    id: 'submission',
    subject: 'Thanks for completing your Feeder application!',
    preview: 'We received your application and placed you in the Columbus launch waitlist.',
    callToAction: 'View your progress dashboard',
    href: '#',
    actionStep: 0,
    badge: 'Submission'
  },
  {
    id: 'waitlist',
    subject: 'You moved up in the queue! Keep the momentum going 🚀',
    preview: 'Complete your enhanced onboarding tasks to gain more priority points.',
    callToAction: 'Open enhanced onboarding hub',
    href: '#',
    actionStep: 1,
    badge: 'Waitlist Update'
  },
  {
    id: 'activation',
    subject: 'You’re activated! Download the Crave’n Driver app',
    preview: 'You can now log into the driver mobile dashboard and start accepting routes.',
    callToAction: 'Launch driver mobile dashboard',
    href: '#',
    actionStep: 4,
    badge: 'Activation'
  }
];

export const MailDemo: React.FC<MailDemoProps> = ({ currentStep }) => {
  const unlockedTemplates = useMemo(() => {
    return EMAIL_TEMPLATES.filter(template => currentStep >= template.actionStep);
  }, [currentStep]);

  const lockedTemplates = useMemo(() => {
    return EMAIL_TEMPLATES.filter(template => currentStep < template.actionStep);
  }, [currentStep]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-dashed">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-primary" />
            Inbox Preview
          </div>
          <div className="space-y-3">
            {EMAIL_TEMPLATES.map(template => {
              const isUnlocked = currentStep >= template.actionStep;
              return (
                <div
                  key={template.id}
                  className={`rounded-lg border p-3 transition ${
                    isUnlocked ? 'border-border bg-background' : 'border-dashed border-muted bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{template.subject}</p>
                    <Badge variant={isUnlocked ? 'secondary' : 'outline'}>{template.badge}</Badge>
                  </div>
                  <p className="text-sm">{template.preview}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sent from: onboarding@cravenusa.com</span>
                    <span>{isUnlocked ? 'Delivered just now' : 'Queued for later'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stamp className="h-4 w-4 text-primary" />
            Open the latest email
          </div>

          {unlockedTemplates.length > 0 ? (
            unlockedTemplates.map(template => (
              <div key={template.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{template.subject}</p>
                    <p className="text-xs text-muted-foreground">from onboarding@cravenusa.com</p>
                  </div>
                  <Badge variant="secondary">{template.badge}</Badge>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">{template.preview}</p>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  {template.callToAction}
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              <Timer className="mx-auto mb-3 h-5 w-5" />
              Submit the demo application to unlock the first email.
            </div>
          )}

          {lockedTemplates.length > 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
              Complete further steps in the simulator to unlock the remaining demo emails.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

