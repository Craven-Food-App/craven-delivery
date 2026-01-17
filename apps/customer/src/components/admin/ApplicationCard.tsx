import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  Car, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail as MailIcon, 
  FileText, 
  CheckCircle, 
  XCircle,
  Eye,
  Send,
  Trash2
} from 'lucide-react';
import { formatDate } from 'date-fns';

interface Application {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  license_plate: string;
  drivers_license: string;
  insurance_policy: string;
  insurance_provider: string;
  background_check: boolean;
  vehicle_inspection: boolean;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  profile_photo?: string;
  drivers_license_front?: string | null;
  drivers_license_back?: string | null;
  vehicle_photo_front?: string | null;
  vehicle_photo_back?: string | null;
  vehicle_photo_left?: string | null;
  vehicle_photo_right?: string | null;
  vehicle_registration?: string | null;
  insurance_document?: string | null;
  w9_document?: string | null;
  i9_document?: string | null;
  signature_image_url?: string | null;
  background_check_report_id?: string;
  background_check_reports?: {
    id: string;
    status: string;
    checkr_status: string | null;
    admin_review_required: boolean;
  };
  [key: string]: any; // Allow any other fields
}

interface ApplicationCardProps {
  application: Application;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  onDelete?: (id: string) => void;
  onViewDocument: (documentPath: string, documentName: string) => void;
  onSendApprovalEmail?: (id: string) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ 
  application, 
  onApprove, 
  onReject,
  onDelete,
  onViewDocument,
  onSendApprovalEmail 
}) => {
  const [reviewNotes, setReviewNotes] = React.useState('');

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, label: 'Pending Review' },
      under_review: { variant: 'default' as const, label: 'Under Review' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatApplicationDate = (dateString?: string | null) => {
    if (!dateString) {
      return 'Not provided';
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return 'Not provided';
    }

    return formatDate(parsed, 'MMM dd, yyyy');
  };

  const handleViewDocument = (documentPath: string | undefined, documentName: string) => {
    if (documentPath) {
      onViewDocument(documentPath, documentName);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {application.first_name} {application.last_name}
          </CardTitle>
          {getStatusBadge(application.status)}
        </div>
        <div className="text-sm text-muted-foreground">
          Submitted: {formatApplicationDate(application.created_at)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <MailIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm">{application.email}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-green-600" />
            <span className="text-sm">{application.phone}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-sm">DOB: {formatApplicationDate(application.date_of_birth)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-600" />
            <span className="text-sm">{application.city}, {application.state}</span>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <span><strong>Type:</strong> {application.vehicle_type}</span>
            <span><strong>Make/Model:</strong> {application.vehicle_make} {application.vehicle_model}</span>
            <span><strong>Year:</strong> {application.vehicle_year}</span>
            <span><strong>License Plate:</strong> {application.license_plate}</span>
          </div>
        </div>

        {/* Documents */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </h4>
          <div className="space-y-3">
            {/* Identity Documents */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Identity Documents</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.profile_photo, 'Profile Photo')}
                  disabled={!application.profile_photo}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Profile
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.drivers_license_front, 'Driver License Front')}
                  disabled={!application.drivers_license_front}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  DL Front
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.drivers_license_back, 'Driver License Back')}
                  disabled={!application.drivers_license_back}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  DL Back
                </Button>
              </div>
            </div>

            {/* Vehicle Documents */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Vehicle Documents</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.vehicle_photo_front, 'Vehicle Front')}
                  disabled={!application.vehicle_photo_front}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Vehicle Front
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.vehicle_photo_back, 'Vehicle Back')}
                  disabled={!application.vehicle_photo_back}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Vehicle Back
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.vehicle_photo_left, 'Vehicle Left')}
                  disabled={!application.vehicle_photo_left}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Vehicle Left
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.vehicle_photo_right, 'Vehicle Right')}
                  disabled={!application.vehicle_photo_right}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Vehicle Right
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.vehicle_registration, 'Vehicle Registration')}
                  disabled={!application.vehicle_registration}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Registration
                </Button>
              </div>
            </div>

            {/* Insurance & Legal */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Insurance & Legal Documents</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.insurance_document, 'Insurance Document')}
                  disabled={!application.insurance_document}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Insurance
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.w9_document, 'W-9 Form')}
                  disabled={!application.w9_document}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  W-9 Form
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.i9_document, 'I-9 Form')}
                  disabled={!application.i9_document}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  I-9 Form
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewDocument(application.signature_image_url, 'ICA Signature')}
                  disabled={!application.signature_image_url}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  ICA Signature
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Check Status */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Background Check
          </h4>
          {application.background_check_reports ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Status:</span>
                <Badge variant={
                  application.background_check_reports.checkr_status === 'clear' ? 'default' :
                  application.background_check_reports.checkr_status === 'consider' ? 'secondary' :
                  application.background_check_reports.checkr_status === 'suspended' ? 'destructive' :
                  'outline'
                }>
                  {application.background_check_reports.status}
                </Badge>
              </div>
              {application.background_check_reports.admin_review_required && (
                <Badge variant="secondary">Admin Review Required</Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No background check initiated</p>
          )}
        </div>

        {/* Send Email Button for Approved Applications */}
        {application.status === 'approved' && onSendApprovalEmail && (
          <div className="border-t pt-4">
            <Button 
              onClick={() => onSendApprovalEmail(application.id)}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Approval Email
            </Button>
          </div>
        )}

        {/* Delete Button */}
        {onDelete && (
          <div className="border-t pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="w-full flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Application
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the application for <strong>{application.first_name} {application.last_name}</strong>? 
                    This action cannot be undone and will permanently remove the application and all associated data from the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(application.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Review Section */}
        {application.status === 'pending' && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <Label htmlFor={`notes-${application.id}`}>Review Notes</Label>
              <Textarea
                id={`notes-${application.id}`}
                placeholder="Add notes about your review decision..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => onApprove(application.id, reviewNotes)}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              
              <Button 
                variant="destructive"
                onClick={() => onReject(application.id, reviewNotes)}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationCard;