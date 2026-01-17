import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Send,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'welcome' | 'approval' | 'rejection' | 'follow-up' | 'reminder' | 'go-live';
  icon: any;
  color: string;
  variables: string[];
}

interface EmailTemplatesProps {
  restaurant?: RestaurantOnboardingData;
  onSendEmail?: (restaurantId: string, subject: string, body: string) => Promise<void>;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to {{platform_name}}! 🎉',
    body: `Hi {{restaurant_name}} team,

Welcome to {{platform_name}}! We're thrilled to have you join our platform.

We've received your application and our team is reviewing your documents. Here's what happens next:

1. Document Verification (1-2 business days)
2. Menu Setup & Review (2-3 business days)
3. Banking & Payment Setup (1 business day)
4. Go Live! 🚀

You can track your onboarding progress at any time by logging into your merchant portal.

If you have any questions, feel free to reply to this email or contact our support team.

Looking forward to partnering with you!

Best regards,
The {{platform_name}} Team`,
    category: 'welcome',
    icon: Sparkles,
    color: 'text-purple-600 bg-purple-50',
    variables: ['restaurant_name', 'platform_name']
  },
  {
    id: 'approval',
    name: 'Application Approved',
    subject: '✅ Your restaurant has been approved!',
    body: `Hi {{restaurant_name}} team,

Great news! Your restaurant application has been approved! 🎉

Your business documents have been verified and you're ready to move forward with the onboarding process.

Next Steps:
1. Complete your menu setup in the merchant portal
2. Set up your banking information for payments
3. Configure your delivery zones and hours
4. Review and accept our merchant agreement

You can complete these steps at: {{merchant_portal_url}}

We're excited to see you go live soon!

Best regards,
The {{platform_name}} Team`,
    category: 'approval',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50',
    variables: ['restaurant_name', 'platform_name', 'merchant_portal_url']
  },
  {
    id: 'rejection',
    name: 'Application Needs Revision',
    subject: 'Action Required: Additional Information Needed',
    body: `Hi {{restaurant_name}} team,

Thank you for your interest in joining {{platform_name}}.

We've reviewed your application and need some additional information before we can proceed:

{{rejection_reason}}

Please update your application with the required information and we'll review it promptly.

If you have any questions or need clarification, please don't hesitate to reach out.

Best regards,
The {{platform_name}} Team`,
    category: 'rejection',
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
    variables: ['restaurant_name', 'platform_name', 'rejection_reason']
  },
  {
    id: 'documents_missing',
    name: 'Missing Documents Reminder',
    subject: 'Action Required: Missing Documents',
    body: `Hi {{restaurant_name}} team,

We noticed that your application is missing some required documents:

{{missing_documents}}

Please upload these documents to your merchant portal to continue with the approval process.

Upload documents here: {{merchant_portal_url}}

If you have any questions about what's needed, feel free to reply to this email.

Best regards,
The {{platform_name}} Team`,
    category: 'reminder',
    icon: FileText,
    color: 'text-orange-600 bg-orange-50',
    variables: ['restaurant_name', 'platform_name', 'missing_documents', 'merchant_portal_url']
  },
  {
    id: 'menu_reminder',
    name: 'Menu Setup Reminder',
    subject: 'Ready to add your menu? 🍽️',
    body: `Hi {{restaurant_name}} team,

Your restaurant has been approved and we're ready for the next step - setting up your menu!

Adding your menu is quick and easy:
1. Log into your merchant portal
2. Click "Menu Management"
3. Add your categories and items
4. Set prices and descriptions
5. Upload mouth-watering photos!

Get started here: {{merchant_portal_url}}

Need help? Check out our menu setup guide or reach out to our support team.

Let's get your delicious food in front of hungry customers!

Best regards,
The {{platform_name}} Team`,
    category: 'follow-up',
    icon: Mail,
    color: 'text-blue-600 bg-blue-50',
    variables: ['restaurant_name', 'platform_name', 'merchant_portal_url']
  },
  {
    id: 'banking_reminder',
    name: 'Banking Setup Reminder',
    subject: 'Action Required: Banking Information',
    body: `Hi {{restaurant_name}} team,

You're almost ready to go live! The final step is to complete your banking information so we can process your payments.

What you need:
- Bank account number
- Routing number
- Tax ID (EIN)

This information is kept secure and is required to transfer your earnings.

Complete banking setup: {{merchant_portal_url}}

Once this is done, we'll be ready to launch your restaurant on our platform!

Best regards,
The {{platform_name}} Team`,
    category: 'reminder',
    icon: AlertCircle,
    color: 'text-yellow-600 bg-yellow-50',
    variables: ['restaurant_name', 'platform_name', 'merchant_portal_url']
  },
  {
    id: 'ready_to_launch',
    name: 'Ready to Go Live',
    subject: '🚀 You\'re ready to go live!',
    body: `Hi {{restaurant_name}} team,

Exciting news! You've completed all the requirements and are ready to go live on {{platform_name}}! 🎉

Your restaurant will be visible to customers within the next 24 hours. Here's what you can expect:

- Orders will start coming through your tablet/portal
- Customers will see your menu and can place orders
- You'll receive payments weekly (every {{payment_day}})
- Our support team is here 24/7 if you need anything

Tips for your first week:
✓ Keep your menu updated
✓ Respond quickly to orders
✓ Maintain accurate prep times
✓ Communicate with customers about any delays

Welcome to the family! Let's make this a success together.

Best regards,
The {{platform_name}} Team`,
    category: 'go-live',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50',
    variables: ['restaurant_name', 'platform_name', 'payment_day']
  },
  {
    id: 'follow_up',
    name: 'Check-In Follow-Up',
    subject: 'How is your onboarding going?',
    body: `Hi {{restaurant_name}} team,

We wanted to check in and see how your onboarding experience is going so far.

Current Status: {{onboarding_stage}}

Is there anything we can help you with? Common questions:
- How to upload documents
- Menu setup assistance
- Banking information help
- Platform training

Feel free to reply to this email with any questions or concerns. We're here to help make this process as smooth as possible!

Best regards,
The {{platform_name}} Team`,
    category: 'follow-up',
    icon: Clock,
    color: 'text-indigo-600 bg-indigo-50',
    variables: ['restaurant_name', 'platform_name', 'onboarding_stage']
  }
];

export function EmailTemplates({ restaurant, onSendEmail }: EmailTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    
    // Replace variables with actual data
    let subject = template.subject;
    let body = template.body;
    
    if (restaurant) {
      subject = subject
        .replace(/\{\{restaurant_name\}\}/g, restaurant.restaurant.name)
        .replace(/\{\{platform_name\}\}/g, 'Craven')
        .replace(/\{\{merchant_portal_url\}\}/g, 'https://app.craven.com/merchant')
        .replace(/\{\{payment_day\}\}/g, 'Friday')
        .replace(/\{\{onboarding_stage\}\}/g, getReadableStage(restaurant));
      
      body = body
        .replace(/\{\{restaurant_name\}\}/g, restaurant.restaurant.name)
        .replace(/\{\{platform_name\}\}/g, 'Craven')
        .replace(/\{\{merchant_portal_url\}\}/g, 'https://app.craven.com/merchant')
        .replace(/\{\{payment_day\}\}/g, 'Friday')
        .replace(/\{\{onboarding_stage\}\}/g, getReadableStage(restaurant))
        .replace(/\{\{rejection_reason\}\}/g, 'Please provide complete business license documentation.')
        .replace(/\{\{missing_documents\}\}/g, '- Business License\n- Certificate of Insurance');
    }
    
    setEmailSubject(subject);
    setEmailBody(body);
    setShowPreview(true);
  };

  const getReadableStage = (restaurant: RestaurantOnboardingData): string => {
    if (restaurant.go_live_ready) return 'Ready to Launch';
    if (restaurant.menu_preparation_status === 'ready' && restaurant.restaurant.banking_complete) return 'Final Review';
    if (restaurant.business_info_verified) return 'Setup In Progress';
    return 'Document Review';
  };

  const handleSendEmail = async () => {
    if (!restaurant || !onSendEmail) {
      toast.error('Unable to send email');
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Please provide both subject and body');
      return;
    }

    setIsSending(true);
    try {
      await onSendEmail(restaurant.restaurant_id, emailSubject, emailBody);
      toast.success(`Email sent to ${restaurant.restaurant.name}!`);
      setShowPreview(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    toast.success('Template copied to clipboard!');
  };

  const categoryColors = {
    welcome: 'bg-purple-100 text-purple-700 border-purple-300',
    approval: 'bg-green-100 text-green-700 border-green-300',
    rejection: 'bg-red-100 text-red-700 border-red-300',
    'follow-up': 'bg-blue-100 text-blue-700 border-blue-300',
    reminder: 'bg-orange-100 text-orange-700 border-orange-300',
    'go-live': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold mb-2">Email Templates</h3>
          <p className="text-muted-foreground">
            Pre-built email templates for common restaurant communications
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColors[template.category]}`}
                    >
                      {template.category.replace('-', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {template.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {template.variables.length} variables
                    </span>
                    <Button size="sm" variant="ghost">
                      <Mail className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Email Preview & Edit Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {restaurant ? (
                <span>
                  Sending to: <strong>{restaurant.restaurant.name}</strong> ({restaurant.restaurant.email})
                </span>
              ) : (
                <span>Preview and customize email template</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject Line</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="email-body">Email Body</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={15}
                placeholder="Email body..."
                className="font-mono text-sm"
              />
            </div>

            {/* Variable Helper */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Available Variables:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCopyTemplate}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            {restaurant && onSendEmail && (
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
              >
                {isSending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

