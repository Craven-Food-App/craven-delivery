import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, Loader2, FileText, PenTool } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ensureAuthenticatedForOnboarding } from '../utils/authHelper';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ReviewStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ReviewStep({ data, onBack }: ReviewStepProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreedToSections, setAgreedToSections] = useState({
    commission: false,
    payment: false,
    liability: false,
  });
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const navigate = useNavigate();

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const allSectionsAgreed = agreedToSections.commission && agreedToSections.payment && agreedToSections.liability;
  const signatureComplete = isDrawingSignature ? (signatureName && signatureTitle) : true;
  const canSubmit = acceptedTerms && allSectionsAgreed && signatureComplete;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({
        title: 'Agreement Incomplete',
        description: 'Please review and sign the merchant agreement to continue',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert signature to base64 if drawn
      let signatureDataUrl = null;
      if (isDrawingSignature && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL('image/png');
      }

      // Ensure user is authenticated (creates account if needed)
      if (!data.contactEmail) {
        toast({
          title: 'Email required',
          description: 'Please provide your email address to continue',
          variant: 'destructive',
        });
        return;
      }

      const user = await ensureAuthenticatedForOnboarding(data.contactEmail);
      
      if (!user) {
        toast({
          title: 'Authentication failed',
          description: 'Unable to create account. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Insert restaurant with all onboarding data and agreement
      const { error } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: data.restaurantName,
          description: data.description,
          cuisine_type: data.cuisineType,
          phone: data.contactPhone,
          email: data.contactEmail,
          address: data.streetAddress,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          logo_url: data.logoUrl,
          image_url: data.coverImageUrl,
          min_delivery_time: data.minPrepTime,
          max_delivery_time: data.maxPrepTime,
          delivery_fee_cents: data.deliveryFeeCents,
          minimum_order_cents: data.minimumOrderCents,
          delivery_radius_miles: data.deliveryRadius,
          is_active: false, // Pending admin approval
          rating: 5.0,
        });

      if (error) throw error;

      // Send welcome email
      await supabase.functions.invoke('send-restaurant-welcome-email', {
        body: {
          restaurantName: data.restaurantName,
          ownerEmail: data.contactEmail,
          ownerName: data.contactName,
        },
      });

      toast({
        title: 'Application Submitted!',
        description: 'Your restaurant has been submitted for review. We\'ll be in touch within 24-48 hours.',
      });

      navigate('/restaurant/dashboard');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Review & Submit</h2>
        <p className="text-muted-foreground">
          Almost there! Review your information before submitting
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Restaurant Information</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{data.restaurantName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cuisine</dt>
              <dd className="font-medium">{data.cuisineType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{data.contactName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{data.contactPhone}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">
                {data.streetAddress}, {data.city}, {data.state} {data.zipCode}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Business Details</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Legal Name</dt>
              <dd className="font-medium">{data.legalBusinessName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Business Type</dt>
              <dd className="font-medium capitalize">{data.businessType.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">EIN</dt>
              <dd className="font-medium">••-•••{data.ein.slice(-4)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Years in Business</dt>
              <dd className="font-medium">{data.yearsInBusiness}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Delivery Settings</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Prep Time</dt>
              <dd className="font-medium">{data.minPrepTime}-{data.maxPrepTime} min</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Delivery Fee</dt>
              <dd className="font-medium">${(data.deliveryFeeCents / 100).toFixed(2)}</dd>
            </div>
          </dl>
        </Card>

        <div className="border-t pt-6">
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="terms" className="cursor-pointer">
                <p className="font-medium">I accept the terms and conditions *</p>
                <p className="text-sm text-muted-foreground mt-1">
                  By submitting, you agree to Crave'n's{' '}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>,{' '}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, and{' '}
                  Partnership Agreement. You understand that Crave'n will charge a commission on each order.
                </p>
              </Label>
            </div>
          </div>
        </div>

        {!showAgreement ? (
          <>
            <Card className="p-6 border-2 border-primary">
              <div className="flex items-start gap-4">
                <FileText className="w-8 h-8 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Merchant Partnership Agreement</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Before proceeding, please review and sign the Crave'n Merchant Partnership Agreement. 
                    This outlines the terms of our partnership including commission structure, payment terms, and responsibilities.
                  </p>
                  <Button onClick={() => setShowAgreement(true)} className="w-full sm:w-auto">
                    <FileText className="mr-2 w-4 h-4" />
                    Review & Sign Agreement
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-sm text-green-900">
                <strong>🎉 What happens next?</strong><br />
                Our team will review your application within 24-48 hours. Once approved, 
                you'll receive an email with next steps to activate your restaurant and start receiving orders!
              </p>
            </Card>
          </>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Merchant Partnership Agreement</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAgreement(false)}>
                Back to Review
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-6 mb-6">
              <div className="space-y-6 text-sm">
                <div>
                  <h4 className="font-semibold text-base mb-2">CRAVE'N MERCHANT PARTNERSHIP AGREEMENT</h4>
                  <p className="text-muted-foreground">Effective Date: {new Date().toLocaleDateString()}</p>
                </div>

                <Separator />

                <div>
                  <p className="mb-4">
                    This Merchant Partnership Agreement ("Agreement") is entered into between Crave'n ("Platform") 
                    and {data.legalBusinessName} ("Merchant") for the operation of delivery services.
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <h5 className="font-semibold mb-2">1. COMMISSION & FEES</h5>
                  <p className="mb-3">
                    Merchant agrees to pay Platform a commission of 15% on the subtotal of each order placed through the Platform. 
                    This commission covers use of the Platform, technology services, and customer support.
                  </p>
                  <div className="flex items-start gap-2 mt-3">
                    <Checkbox
                      id="commission"
                      checked={agreedToSections.commission}
                      onCheckedChange={(checked) => 
                        setAgreedToSections(prev => ({ ...prev, commission: checked as boolean }))
                      }
                    />
                    <Label htmlFor="commission" className="text-sm cursor-pointer">
                      I have read and agree to the commission structure
                    </Label>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">2. MENU & PRICING</h5>
                  <p>
                    Merchant maintains full control over menu items, descriptions, and pricing. Merchant agrees to keep 
                    menu information accurate and up-to-date. Any price differences between Platform and in-store must 
                    be clearly disclosed to customers.
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <h5 className="font-semibold mb-2">3. PAYMENT TERMS</h5>
                  <p className="mb-3">
                    Platform will remit payment to Merchant weekly for all completed orders, less applicable commissions 
                    and fees. Payments will be made via ACH transfer to the bank account provided during registration. 
                    Merchant is responsible for all applicable taxes.
                  </p>
                  <div className="flex items-start gap-2 mt-3">
                    <Checkbox
                      id="payment"
                      checked={agreedToSections.payment}
                      onCheckedChange={(checked) => 
                        setAgreedToSections(prev => ({ ...prev, payment: checked as boolean }))
                      }
                    />
                    <Label htmlFor="payment" className="text-sm cursor-pointer">
                      I understand and agree to the payment terms
                    </Label>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">4. ORDER FULFILLMENT</h5>
                  <p>
                    Merchant agrees to prepare orders accurately and within the estimated preparation time. Merchant 
                    must notify Platform immediately if unable to fulfill any order. Consistently failing to meet 
                    preparation times may result in suspension or termination.
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">5. FOOD SAFETY & QUALITY</h5>
                  <p>
                    Merchant warrants that all food is prepared in accordance with local health regulations and food 
                    safety standards. Merchant maintains all necessary licenses, permits, and insurance required to 
                    operate a food service business.
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <h5 className="font-semibold mb-2">6. LIABILITY & INDEMNIFICATION</h5>
                  <p className="mb-3">
                    Merchant agrees to indemnify and hold harmless Platform from any claims arising from food quality, 
                    allergen issues, food poisoning, or other food-related incidents. Platform is not liable for issues 
                    arising from Merchant's food preparation or quality.
                  </p>
                  <div className="flex items-start gap-2 mt-3">
                    <Checkbox
                      id="liability"
                      checked={agreedToSections.liability}
                      onCheckedChange={(checked) => 
                        setAgreedToSections(prev => ({ ...prev, liability: checked as boolean }))
                      }
                    />
                    <Label htmlFor="liability" className="text-sm cursor-pointer">
                      I accept liability terms and agree to indemnify Crave'n
                    </Label>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">7. TERM & TERMINATION</h5>
                  <p>
                    This Agreement begins upon acceptance and continues until terminated by either party with 30 days 
                    written notice. Platform may terminate immediately for breach of terms, health violations, or 
                    consistently poor performance.
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold mb-2">8. INTELLECTUAL PROPERTY</h5>
                  <p>
                    Merchant grants Platform non-exclusive rights to use Merchant's name, logo, and menu items for 
                    promotional purposes on the Platform. Platform retains all rights to its technology and brand.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <Separator className="my-6" />

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Electronic Signature
                </h4>
                
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={!isDrawingSignature ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDrawingSignature(false)}
                    >
                      Type Name
                    </Button>
                    <Button
                      variant={isDrawingSignature ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDrawingSignature(true)}
                    >
                      Draw Signature
                    </Button>
                  </div>

                  {!isDrawingSignature ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="signatureName">Full Legal Name *</Label>
                        <Input
                          id="signatureName"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="Enter your full legal name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signatureTitle">Title *</Label>
                        <Input
                          id="signatureTitle"
                          value={signatureTitle}
                          onChange={(e) => setSignatureTitle(e.target.value)}
                          placeholder="e.g., Owner, Manager"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Draw Your Signature *</Label>
                      <div className="border-2 border-dashed rounded-lg p-2 mt-2">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          className="border rounded bg-white w-full touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        className="mt-2"
                      >
                        Clear Signature
                      </Button>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-4 border rounded-lg bg-muted/50">
                    <Checkbox
                      id="finalTerms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    />
                    <Label htmlFor="finalTerms" className="text-sm cursor-pointer">
                      I certify that I am authorized to sign this agreement on behalf of {data.legalBusinessName}, 
                      and I agree to all terms and conditions outlined in this Merchant Partnership Agreement.
                    </Label>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    By signing, you acknowledge that this electronic signature has the same legal effect as a 
                    handwritten signature.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline" size="lg" disabled={isSubmitting}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || isSubmitting || !showAgreement} 
          size="lg"
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Application
              <CheckCircle className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
