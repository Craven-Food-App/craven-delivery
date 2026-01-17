import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  FileCheck,
  Shield,
  Award
} from 'lucide-react';

interface DocumentQualityScoreProps {
  documents: any[];
  restaurant: any;
}

interface QualityCheck {
  category: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
}

export function DocumentQualityScore({ documents, restaurant }: DocumentQualityScoreProps) {
  const qualityAnalysis = useMemo(() => {
    const checks: QualityCheck[] = [];

    // Document Completeness Check
    const uploadedCount = documents.filter(d => d.url).length;
    const requiredCount = documents.filter(d => d.required).length;
    const requiredUploaded = documents.filter(d => d.required && d.url).length;
    
    const completenessScore = (uploadedCount / documents.length) * 100;
    let completenessStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    const completenessIssues = [];
    const completenessRecs = [];

    if (requiredUploaded < requiredCount) {
      completenessStatus = 'poor';
      completenessIssues.push('Missing required documents');
      completenessRecs.push('Upload all required documents (Business License, Owner ID)');
    } else if (uploadedCount < documents.length) {
      completenessStatus = 'good';
      completenessRecs.push('Consider uploading optional documents for faster approval');
    }

    checks.push({
      category: 'Document Completeness',
      score: completenessScore,
      maxScore: 100,
      status: completenessStatus,
      issues: completenessIssues,
      recommendations: completenessRecs,
    });

    // Image Quality Estimation (based on URL presence - in real app would analyze actual images)
    const qualityScore = uploadedCount > 0 ? 85 : 0; // Mock score
    const qualityIssues = [];
    const qualityRecs = [];
    let qualityStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

    if (qualityScore < 60) {
      qualityStatus = 'poor';
      qualityIssues.push('Some images may be blurry or low resolution');
      qualityRecs.push('Ensure all photos are clear and high resolution');
    } else if (qualityScore < 80) {
      qualityStatus = 'fair';
      qualityRecs.push('Some images could be clearer');
    } else if (qualityScore >= 90) {
      qualityStatus = 'excellent';
    }

    checks.push({
      category: 'Image Quality',
      score: qualityScore,
      maxScore: 100,
      status: qualityStatus,
      issues: qualityIssues,
      recommendations: qualityRecs,
    });

    // Information Consistency
    const hasName = !!restaurant.restaurant.name;
    const hasAddress = !!restaurant.restaurant.address;
    const hasPhone = !!restaurant.restaurant.phone;
    const hasEmail = !!restaurant.restaurant.email;

    const infoFields = 4;
    const infoComplete = [hasName, hasAddress, hasPhone, hasEmail].filter(Boolean).length;
    const consistencyScore = (infoComplete / infoFields) * 100;
    const consistencyIssues = [];
    const consistencyRecs = [];
    let consistencyStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (!hasName) {
      consistencyIssues.push('Business name missing');
      consistencyStatus = 'poor';
    }
    if (!hasAddress) {
      consistencyIssues.push('Business address incomplete');
      consistencyStatus = 'poor';
    }
    if (!hasEmail) {
      consistencyRecs.push('Email address should be provided');
      if (consistencyStatus === 'excellent') consistencyStatus = 'good';
    }

    checks.push({
      category: 'Information Consistency',
      score: consistencyScore,
      maxScore: 100,
      status: consistencyStatus,
      issues: consistencyIssues,
      recommendations: consistencyRecs,
    });

    // Compliance & Verification
    const isVerified = restaurant.business_info_verified;
    const hasBankingInfo = restaurant.restaurant.banking_complete;
    const hasMenuReady = restaurant.menu_preparation_status === 'ready';

    const complianceChecks = [isVerified, hasBankingInfo, hasMenuReady].filter(Boolean).length;
    const complianceScore = (complianceChecks / 3) * 100;
    const complianceIssues = [];
    const complianceRecs = [];
    let complianceStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';

    if (!isVerified) {
      complianceIssues.push('Business not yet verified');
      complianceRecs.push('Complete document verification first');
    }
    if (!hasBankingInfo) {
      complianceRecs.push('Banking information pending');
    }
    if (!hasMenuReady) {
      complianceRecs.push('Menu setup pending');
    }

    if (complianceScore === 100) complianceStatus = 'excellent';
    else if (complianceScore >= 66) complianceStatus = 'good';
    else if (complianceScore >= 33) complianceStatus = 'fair';
    else complianceStatus = 'poor';

    checks.push({
      category: 'Compliance Status',
      score: complianceScore,
      maxScore: 100,
      status: complianceStatus,
      issues: complianceIssues,
      recommendations: complianceRecs,
    });

    // Overall Score
    const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
    const overallStatus =
      overallScore >= 90 ? 'excellent' :
      overallScore >= 75 ? 'good' :
      overallScore >= 60 ? 'fair' : 'poor';

    return { checks, overallScore, overallStatus };
  }, [documents, restaurant]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-300';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-300';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'fair':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'poor':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileCheck className="h-5 w-5 text-gray-600" />;
    }
  };

  const getGradeLetter = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="space-y-6">
      {/* Overall Quality Score */}
      <Card className={`border-2 ${getStatusColor(qualityAnalysis.overallStatus)}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-1">
                Overall Quality Score
              </h3>
              <p className="text-sm text-muted-foreground">
                Based on {qualityAnalysis.checks.length} quality checks
              </p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold mb-1">
                {getGradeLetter(qualityAnalysis.overallScore)}
              </div>
              <Badge className={getStatusColor(qualityAnalysis.overallStatus)}>
                {qualityAnalysis.overallStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
          <Progress value={qualityAnalysis.overallScore} className="h-3" />
          <p className="text-center text-sm font-medium mt-2">
            {Math.round(qualityAnalysis.overallScore)}% Quality Score
          </p>
        </CardContent>
      </Card>

      {/* Individual Quality Checks */}
      <div className="space-y-4">
        {qualityAnalysis.checks.map((check, index) => (
          <Card key={index} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  {check.category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {Math.round(check.score)}/{check.maxScore}
                  </span>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={check.score} className="h-2" />

              {check.issues.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">Issues Found:</p>
                  <ul className="space-y-1">
                    {check.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {check.recommendations.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Recommendations:</p>
                  <ul className="space-y-1">
                    {check.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <Award className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

