import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertCircle,
  FileText,
  User,
  MapPin,
  Calendar,
  Shield,
  Building2,
  CreditCard
} from 'lucide-react';

interface VerificationChecklistProps {
  restaurant: any;
  documents: any[];
  onChecklistComplete: (isComplete: boolean, data: any) => void;
}

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: any;
  checked: boolean;
  required: boolean;
  autoCheck?: (restaurant: any, documents: any[]) => boolean;
}

export function VerificationChecklist({
  restaurant,
  documents,
  onChecklistComplete,
}: VerificationChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // Document Checks
    {
      id: 'business_license_present',
      category: 'Documents',
      label: 'Business License Uploaded',
      description: 'Valid business license document is present',
      icon: Building2,
      checked: false,
      required: true,
      autoCheck: (r, docs) => !!docs.find(d => d.key === 'business_license')?.url,
    },
    {
      id: 'business_license_valid',
      category: 'Documents',
      label: 'Business License is Clear & Readable',
      description: 'Document is not blurry, all text is legible',
      icon: FileText,
      checked: false,
      required: true,
    },
    {
      id: 'owner_id_present',
      category: 'Documents',
      label: 'Owner ID Uploaded',
      description: 'Government-issued ID document is present',
      icon: User,
      checked: false,
      required: true,
      autoCheck: (r, docs) => !!docs.find(d => d.key === 'owner_id')?.url,
    },
    {
      id: 'owner_id_valid',
      category: 'Documents',
      label: 'Owner ID is Clear & Valid',
      description: 'ID is not expired and photo is clear',
      icon: Shield,
      checked: false,
      required: true,
    },

    // Business Information Checks
    {
      id: 'business_name_match',
      category: 'Business Info',
      label: 'Business Name Matches License',
      description: 'Name on license matches application',
      icon: Building2,
      checked: false,
      required: true,
    },
    {
      id: 'address_match',
      category: 'Business Info',
      label: 'Address Matches License',
      description: 'Physical address matches business license',
      icon: MapPin,
      checked: false,
      required: true,
    },
    {
      id: 'owner_name_match',
      category: 'Business Info',
      label: 'Owner Name Matches ID',
      description: 'Name on ID matches owner information',
      icon: User,
      checked: false,
      required: true,
    },

    // Compliance Checks
    {
      id: 'license_not_expired',
      category: 'Compliance',
      label: 'Business License Not Expired',
      description: 'License expiration date is in the future',
      icon: Calendar,
      checked: false,
      required: true,
    },
    {
      id: 'id_not_expired',
      category: 'Compliance',
      label: 'Owner ID Not Expired',
      description: 'ID expiration date is in the future',
      icon: Calendar,
      checked: false,
      required: true,
    },
    {
      id: 'insurance_valid',
      category: 'Compliance',
      label: 'Insurance Certificate Valid (If Provided)',
      description: 'Insurance is current and covers restaurant operations',
      icon: Shield,
      checked: false,
      required: false,
    },
    {
      id: 'health_permit_valid',
      category: 'Compliance',
      label: 'Health Permit Valid (If Provided)',
      description: 'Health department permit is current',
      icon: Shield,
      checked: false,
      required: false,
    },

    // Final Checks
    {
      id: 'no_discrepancies',
      category: 'Final Review',
      label: 'No Discrepancies Found',
      description: 'All information is consistent across documents',
      icon: CheckCircle,
      checked: false,
      required: true,
    },
    {
      id: 'ready_for_approval',
      category: 'Final Review',
      label: 'Ready for Approval',
      description: 'All checks passed, ready to approve restaurant',
      icon: CheckCircle,
      checked: false,
      required: true,
    },
  ]);

  useEffect(() => {
    // Auto-check items that can be automatically verified
    const updated = checklist.map(item => {
      if (item.autoCheck) {
        return { ...item, checked: item.autoCheck(restaurant, documents) };
      }
      return item;
    });
    setChecklist(updated);
  }, [restaurant, documents]);

  useEffect(() => {
    // Calculate completion
    const requiredItems = checklist.filter(item => item.required);
    const checkedRequired = requiredItems.filter(item => item.checked);
    const isComplete = checkedRequired.length === requiredItems.length;

    // Create checklist data object
    const checklistData = checklist.reduce((acc, item) => {
      acc[item.id] = item.checked;
      return acc;
    }, {} as any);

    onChecklistComplete(isComplete, checklistData);
  }, [checklist, onChecklistComplete]);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // Group by category
  const categories = Array.from(new Set(checklist.map(item => item.category)));

  const requiredChecked = checklist.filter(item => item.required && item.checked).length;
  const totalRequired = checklist.filter(item => item.required).length;
  const completionPercentage = (requiredChecked / totalRequired) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold">Verification Progress</h3>
              <p className="text-sm text-muted-foreground">
                {requiredChecked} of {totalRequired} required checks completed
              </p>
            </div>
            <Badge
              variant={completionPercentage === 100 ? 'default' : 'secondary'}
              className={`text-lg px-4 py-2 ${completionPercentage === 100 ? 'bg-green-600' : ''}`}
            >
              {Math.round(completionPercentage)}%
            </Badge>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {categories.map((category) => {
        const categoryItems = checklist.filter(item => item.category === category);
        const categoryChecked = categoryItems.filter(item => item.checked).length;
        const categoryTotal = categoryItems.length;
        const categoryComplete = categoryChecked === categoryTotal;

        return (
          <Card key={category} className={categoryComplete ? 'border-green-300 bg-green-50' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {categoryComplete && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {category}
                </CardTitle>
                <Badge variant="outline">
                  {categoryChecked}/{categoryTotal}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.checked
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={item.id}
                        className="flex items-start gap-2 cursor-pointer"
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${item.checked ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${item.checked ? 'text-green-900' : ''}`}>
                              {item.label}
                            </span>
                            {item.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Completion Status */}
      {completionPercentage === 100 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
              <h3 className="text-lg font-bold text-green-900 mb-1">
                Verification Checklist Complete!
              </h3>
              <p className="text-sm text-green-700">
                All required checks have been completed. You can now approve this restaurant.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

