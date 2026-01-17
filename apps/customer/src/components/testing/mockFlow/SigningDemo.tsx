import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, FileSignature, PenSquare, Shield, Signature } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { demoDocumentPreview } from './documentPreview';

interface SigningDemoProps {
  currentStep: number;
}

const DOCUMENTS = [
  {
    id: 'ic-agreement',
    title: 'Independent Contractor Agreement',
    description: 'Outlines responsibilities, payout terms, and compliance policies for drivers.',
    requiresStep: 2
  },
  {
    id: 'services-addendum',
    title: 'Services Addendum',
    description: 'Covers advanced payouts, premium route eligibility, and service level standards.',
    requiresStep: 3
  },
  {
    id: 'compliance-handbook',
    title: 'Compliance Handbook Acknowledgement',
    description: 'Confirms receipt of safety, insurance, and regional compliance guidelines.',
    requiresStep: 4
  }
];

export const SigningDemo: React.FC<SigningDemoProps> = ({ currentStep }) => {
  const [signedDocs, setSignedDocs] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  const unlockStatus = useMemo(() => {
    return DOCUMENTS.map(doc => ({
      ...doc,
      unlocked: currentStep >= doc.requiresStep,
      signed: signedDocs.includes(doc.id)
    }));
  }, [currentStep, signedDocs]);

  const handleSign = (docId: string) => {
    if (!signedDocs.includes(docId)) {
      setSignedDocs(prev => [...prev, docId]);
    }
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-dashed">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileSignature className="h-4 w-4 text-primary" />
              Demo Document Queue
            </div>
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-2.5">
                {unlockStatus.map(doc => (
                  <div
                    key={doc.id}
                    className={`rounded-lg border p-3 text-sm ${
                      doc.signed
                        ? 'border-green-200 bg-green-50'
                        : doc.unlocked
                        ? 'border-border bg-background'
                        : 'border-dashed border-muted bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{doc.title}</p>
                      <Badge variant={doc.signed ? 'default' : doc.unlocked ? 'secondary' : 'outline'}>
                        {doc.signed ? 'Signed' : doc.unlocked ? 'Available' : 'Locked'}
                      </Badge>
                    </div>
                    <p>{doc.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Signature className="h-4 w-4 text-primary" />
              Sign with Demo Credentials
            </div>
            <Separator />

            {unlockStatus.map(doc =>
              doc.unlocked ? (
                <div key={doc.id} className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">Demo Signers: Taylor Feeder (Driver) + Crave’n Ops</p>
                    </div>
                    {doc.signed ? (
                      <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-primary text-primary">
                        <PenSquare className="h-3 w-3" />
                        Awaiting Signature
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                    <p>
                      “By signing, I acknowledge that I am using the demo environment. All payouts, compliance, and insurance details shown are fictitious and for training purposes only.”
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={doc.signed ? 'outline' : 'default'}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleSign(doc.id)}
                    >
                      <PenSquare className="h-4 w-4" />
                      {doc.signed ? 'Signed as Taylor Feeder' : 'Sign as Taylor Feeder'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setPreviewDoc(doc.id)}
                    >
                      <Shield className="h-4 w-4" />
                      View PDF Preview
                    </Button>
                  </div>
                </div>
              ) : null
            )}

            {unlockStatus.every(doc => !doc.unlocked) && (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Complete the simulator steps to unlock the demo documents.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
        </DialogHeader>
        {previewDoc && (
          <div className="rounded-md border bg-muted/10 p-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {demoDocumentPreview[previewDoc] ?? 'Preview not available.'}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

