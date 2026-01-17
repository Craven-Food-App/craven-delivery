import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileX,
  Eye,
  Calendar,
  AlertCircle,
  MapPin,
  User,
  FileText
} from 'lucide-react';

interface RejectionTemplatesProps {
  onSelectReason: (reason: string) => void;
  selectedReason: string;
}

const rejectionReasons = [
  {
    id: 'blurry_docs',
    label: 'Documents Too Blurry',
    icon: Eye,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    message: 'Your documents are too blurry to verify. Please upload clear, high-resolution images of:\n\n• Business License\n• Owner ID\n\nTips for better photos:\n- Use good lighting\n- Hold camera steady\n- Ensure all text is readable\n- Capture entire document in frame',
  },
  {
    id: 'expired_license',
    label: 'Expired Business License',
    icon: Calendar,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    message: 'Your business license appears to be expired. Please upload a current, valid business license.\n\nRequired:\n- Current business license (not expired)\n- Issued by local government authority\n- Business name must match application',
  },
  {
    id: 'expired_id',
    label: 'Expired Owner ID',
    icon: Calendar,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    message: 'The owner identification document appears to be expired. Please upload a current, valid government-issued ID.\n\nAcceptable IDs:\n- Driver\'s License\n- State ID\n- Passport\n\nAll must be unexpired.',
  },
  {
    id: 'name_mismatch',
    label: 'Name Mismatch',
    icon: User,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    message: 'There is a discrepancy between the business name on your license and your application.\n\nPlease:\n1. Verify the correct legal business name\n2. Ensure your business license matches exactly\n3. Provide clarification if using a DBA/Trade Name\n\nContact us if you need assistance.',
  },
  {
    id: 'address_mismatch',
    label: 'Address Mismatch',
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    message: 'The address on your business license does not match the address provided in your application.\n\nPlease:\n1. Verify your business address\n2. Upload a license with the correct address\n3. Update your application if address changed\n\nNote: We need the physical business location where food is prepared.',
  },
  {
    id: 'incomplete_docs',
    label: 'Incomplete Documents',
    icon: FileX,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    message: 'Your application is missing required documents. Please upload:\n\n• Business License (Required)\n• Owner ID (Required)\n• Insurance Certificate (Recommended)\n• Health Permit (Recommended)\n\nAll documents should be:\n- Clear and readable\n- Complete (all pages if multi-page)\n- Current and not expired',
  },
  {
    id: 'wrong_document_type',
    label: 'Wrong Document Type',
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    message: 'One or more documents uploaded are not the correct type.\n\nPlease ensure:\n- Business License: Official government-issued business operating license\n- Owner ID: Government photo ID (Driver\'s License, Passport, State ID)\n- Insurance: Liability insurance certificate for restaurant\n- Health Permit: Health department food service permit\n\nPlease review and upload the correct documents.',
  },
  {
    id: 'additional_info_needed',
    label: 'Additional Information Needed',
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    message: 'We need additional information to complete your verification.\n\nPlease provide:\n[Specify what additional information is needed]\n\nOnce we receive this information, we\'ll continue processing your application.\n\nReply to this email or contact support if you have questions.',
  },
];

export function RejectionTemplates({ onSelectReason, selectedReason }: RejectionTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Quick Rejection Reasons</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Select a common reason or write your own custom message below
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rejectionReasons.map((reason) => {
          const Icon = reason.icon;
          const isSelected = selectedReason === reason.message;

          return (
            <Card
              key={reason.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? `border-2 ${reason.borderColor} ${reason.bgColor}`
                  : 'border'
              }`}
              onClick={() => onSelectReason(reason.message)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${reason.bgColor}`}>
                    <Icon className={`h-5 w-5 ${reason.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm mb-1">{reason.label}</h5>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {reason.message.split('\n')[0]}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Badge className="mt-3 w-full justify-center bg-green-600">
                    Selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

